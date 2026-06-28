/* Chess: a playable board on the page. Loaded as an ES module. */
import { Chess } from "https://cdn.jsdelivr.net/npm/chess.js@0.13.4/+esm";

(function () {
  const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const GLYPH = {
    w: { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕", k: "♔" },
    b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
  };
  const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  function squareName(row, col, flipped) {
    const r = flipped ? row + 1 : 8 - row;
    const f = flipped ? 7 - col : col;
    return FILES[f] + r;
  }

  function renderBoard(el, boardArr, flipped, opts) {
    opts = opts || {};
    el.innerHTML = "";
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const sq = squareName(row, col, flipped);
        const cell = document.createElement("div");
        cell.className = "sq " + ((row + col) % 2 === 0 ? "light" : "dark");
        cell.dataset.square = sq;

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
    renderBoard(boardEl, game.board(), flipped, { selected, targets, onClick: onSquare });
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
      if (m.flags.includes("e")) s += 1;
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
      const move = game.move({ from: selected, to: sq, promotion: "q" });
      if (move) {
        selected = null;
        draw();
        if (modeEl.value === "bot" && !game.game_over()) setTimeout(botMove, 350);
        return;
      }
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
