/* Chess: a playable board + read-only chess.com account integration.
   Requires chess.js (global `Chess`, loaded before this file). */
(function () {
  // ===== CONFIG ============================================================
  // Set this to your chess.com username to connect your account (read-only).
  const CHESS_USERNAME = "";
  // =========================================================================

  if (typeof Chess === "undefined") {
    console.warn("chess.js not loaded");
    return;
  }

  const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const GLYPH = {
    w: { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕", k: "♔" },
    b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
  };
  const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  function squareName(row, col, flipped) {
    // row 0 = top. With white at bottom, top row is rank 8, col 0 is file a.
    const r = flipped ? row + 1 : 8 - row;
    const f = flipped ? 7 - col : col;
    return FILES[f] + r;
  }

  // Render a position (chess.js board() array) into an element.
  function renderBoard(el, boardArr, flipped, opts) {
    opts = opts || {};
    el.innerHTML = "";
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const sq = squareName(row, col, flipped);
        const cell = document.createElement("div");
        cell.className = "sq " + ((row + col) % 2 === 0 ? "light" : "dark");
        cell.dataset.square = sq;

        // boardArr is always rank8..rank1, fileA..H regardless of flip.
        const br = flipped ? 7 - row : row;
        const bc = flipped ? 7 - col : col;
        const piece = boardArr[br][bc];
        if (piece) {
          const span = document.createElement("span");
          span.className = "piece " + (piece.color === "w" ? "wp" : "bp");
          span.textContent = GLYPH[piece.color][piece.type];
          cell.appendChild(span);
        }
        if (opts.selected === sq) cell.classList.add("selected");
        if (opts.targets && opts.targets.has(sq)) {
          cell.classList.add(piece ? "capture" : "move");
        }
        if (opts.onClick) cell.addEventListener("click", () => opts.onClick(sq));
        el.appendChild(cell);
      }
    }
  }

  // ===== Playable board ====================================================
  const PlayGame = (function () {
    const game = new Chess();
    let selected = null;
    let flipped = false;
    let boardEl, statusEl, movesEl, modeEl;

    function legalTargets(from) {
      const set = new Set();
      game.moves({ square: from, verbose: true }).forEach((m) => set.add(m.to));
      return set;
    }

    function draw() {
      const targets = selected ? legalTargets(selected) : null;
      renderBoard(boardEl, game.board(), flipped, {
        selected,
        targets,
        onClick: onSquare,
      });
      updateStatus();
      updateMoves();
    }

    function updateStatus() {
      let msg;
      if (game.in_checkmate()) {
        msg = "Checkmate — " + (game.turn() === "w" ? "Black" : "White") + " wins.";
      } else if (game.in_stalemate()) {
        msg = "Stalemate — draw.";
      } else if (game.in_draw()) {
        msg = "Draw.";
      } else {
        msg = (game.turn() === "w" ? "White" : "Black") + " to move";
        if (game.in_check()) msg += " — check!";
      }
      statusEl.textContent = msg;
    }

    function updateMoves() {
      const hist = game.history();
      let html = "";
      for (let i = 0; i < hist.length; i += 2) {
        const n = i / 2 + 1;
        html += `<span class="mv"><b>${n}.</b> ${hist[i]} ${hist[i + 1] || ""}</span>`;
      }
      movesEl.innerHTML = html;
    }

    function botMove() {
      const moves = game.moves({ verbose: true });
      if (!moves.length) return;
      let best = [],
        bestScore = -Infinity;
      for (const m of moves) {
        let s = 0;
        if (m.flags.includes("c")) s += VAL[m.captured] || 0;
        if (m.flags.includes("e")) s += 1; // en passant
        if (m.san.includes("#")) s += 100;
        else if (m.san.includes("+")) s += 0.5;
        if (s > bestScore) {
          bestScore = s;
          best = [m];
        } else if (s === bestScore) best.push(m);
      }
      const pick = best[Math.floor(Math.random() * best.length)];
      game.move(pick.san);
      draw();
    }

    function onSquare(sq) {
      if (game.game_over()) return;
      const piece = game.get(sq);
      if (selected) {
        if (sq === selected) {
          selected = null;
          draw();
          return;
        }
        // try move
        const move = game.move({ from: selected, to: sq, promotion: "q" });
        if (move) {
          selected = null;
          draw();
          if (modeEl.value === "bot" && !game.game_over()) {
            setTimeout(botMove, 350);
          }
          return;
        }
        // not a legal move; maybe reselect own piece
        if (piece && piece.color === game.turn()) {
          selected = sq;
          draw();
        } else {
          selected = null;
          draw();
        }
        return;
      }
      if (piece && piece.color === game.turn()) {
        selected = sq;
        draw();
      }
    }

    function newGame() {
      game.reset();
      selected = null;
      flipped = false;
      draw();
    }

    function init() {
      boardEl = document.getElementById("playBoard");
      statusEl = document.getElementById("playStatus");
      movesEl = document.getElementById("playMoves");
      modeEl = document.getElementById("playMode");
      if (!boardEl) return;
      document.getElementById("newGameBtn").addEventListener("click", newGame);
      document.getElementById("flipBtn").addEventListener("click", () => {
        flipped = !flipped;
        draw();
      });
      draw();
    }

    return { init };
  })();

  // ===== chess.com replay board ===========================================
  const Replay = (function () {
    let fens = [],
      idx = 0,
      flipped = false;
    let boardEl, statusEl;

    function show() {
      const fen = fens[idx] || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      renderBoard(boardEl, new Chess(fen).board(), flipped, {});
      statusEl.textContent = fens.length
        ? `Move ${idx} / ${fens.length - 1}`
        : "";
    }

    function load(pgn, blackBottom) {
      const g = new Chess();
      flipped = !!blackBottom;
      if (!g.load_pgn(pgn)) {
        fens = [];
        idx = 0;
        statusEl.textContent = "Could not parse this game.";
        show();
        return;
      }
      const moves = g.history({ verbose: true });
      const r = new Chess();
      fens = [r.fen()];
      moves.forEach((m) => {
        r.move(m);
        fens.push(r.fen());
      });
      idx = fens.length - 1; // show final position
      show();
    }

    function init() {
      boardEl = document.getElementById("replayBoard");
      statusEl = document.getElementById("replayStatus");
      if (!boardEl) return;
      show();
      document.getElementById("replayStart").addEventListener("click", () => {
        idx = 0;
        show();
      });
      document.getElementById("replayPrev").addEventListener("click", () => {
        if (idx > 0) idx--;
        show();
      });
      document.getElementById("replayNext").addEventListener("click", () => {
        if (idx < fens.length - 1) idx++;
        show();
      });
      document.getElementById("replayEnd").addEventListener("click", () => {
        idx = fens.length - 1;
        show();
      });
    }

    return { init, load };
  })();

  // ===== chess.com account (read-only API) ================================
  const Account = (function () {
    let loaded = false;

    function ratingCard(label, node) {
      if (!node || !node.last) return "";
      const rec = node.record
        ? `${node.record.win}W / ${node.record.loss}L / ${node.record.draw}D`
        : "";
      return `<div class="cc-card"><div class="cc-rating">${node.last.rating}</div>
        <div class="cc-label">${label}</div><div class="cc-record">${rec}</div></div>`;
    }

    async function load() {
      if (loaded) return;
      const accEl = document.getElementById("ccAccount");
      const sel = document.getElementById("gameSelect");

      if (!CHESS_USERNAME) {
        accEl.innerHTML =
          '<p class="loading">No chess.com username set yet. Add it as <code>CHESS_USERNAME</code> in <code>board.js</code> to connect your account.</p>';
        sel.innerHTML = "<option>No account connected</option>";
        loaded = true;
        return;
      }

      const user = encodeURIComponent(CHESS_USERNAME.toLowerCase());
      try {
        const [profileRes, statsRes] = await Promise.all([
          fetch(`https://api.chess.com/pub/player/${user}`),
          fetch(`https://api.chess.com/pub/player/${user}/stats`),
        ]);
        if (!profileRes.ok) throw new Error("player not found");
        const profile = await profileRes.json();
        const stats = await statsRes.json();

        const cards = [
          ratingCard("Rapid", stats.chess_rapid),
          ratingCard("Blitz", stats.chess_blitz),
          ratingCard("Bullet", stats.chess_bullet),
          ratingCard("Daily", stats.chess_daily),
        ].join("");

        accEl.innerHTML = `
          <div class="cc-header">
            ${profile.avatar ? `<img class="cc-avatar" src="${profile.avatar}" alt="">` : ""}
            <div>
              <a class="cc-name" href="${profile.url}" target="_blank" rel="noopener">${
          profile.username
        }</a>
              <div class="cc-sub">${profile.name || ""}</div>
            </div>
          </div>
          <div class="cc-cards">${cards || '<p class="loading">No rated games yet.</p>'}</div>`;

        await loadGames(user, sel);
      } catch (err) {
        accEl.innerHTML = `<p class="loading">Couldn't load chess.com account (${err.message}). Check the username.</p>`;
        sel.innerHTML = "<option>Unavailable</option>";
      }
      loaded = true;
    }

    async function loadGames(user, sel) {
      const arcRes = await fetch(`https://api.chess.com/pub/player/${user}/games/archives`);
      const arc = await arcRes.json();
      if (!arc.archives || !arc.archives.length) {
        sel.innerHTML = "<option>No games found</option>";
        return;
      }
      const gamesRes = await fetch(arc.archives[arc.archives.length - 1]);
      const data = await gamesRes.json();
      const games = (data.games || []).filter((g) => g.pgn).slice(-15).reverse();
      if (!games.length) {
        sel.innerHTML = "<option>No games found</option>";
        return;
      }

      sel.innerHTML = games
        .map((g, i) => {
          const white = g.white.username;
          const black = g.black.username;
          const res = g.white.result === "win" ? "1-0" : g.black.result === "win" ? "0-1" : "½-½";
          return `<option value="${i}">${white} vs ${black} (${res})</option>`;
        })
        .join("");

      function pick(i) {
        const g = games[i];
        const blackBottom = g.black.username.toLowerCase() === CHESS_USERNAME.toLowerCase();
        Replay.load(g.pgn, blackBottom);
      }
      sel.addEventListener("change", () => pick(parseInt(sel.value, 10)));
      pick(0);
    }

    return { load };
  })();

  // ===== Wiring ============================================================
  function start() {
    PlayGame.init();
    Replay.init();
    // Lazy-load the account the first time the Chess tab is opened.
    function maybeLoad() {
      if ((location.hash || "").replace("#", "") === "chess") Account.load();
    }
    window.addEventListener("hashchange", maybeLoad);
    maybeLoad();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
