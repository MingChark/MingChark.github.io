// ---- Footer year ----
document.getElementById("year").textContent = new Date().getFullYear();

const TABS = ["home", "hardware", "foundation-models", "openai"];
const loaded = {}; // cache: key -> true once a feed is fetched

// ---- Tab switching ----
function showTab(tab) {
  if (!TABS.includes(tab)) tab = "home";

  TABS.forEach((t) => {
    const section = document.getElementById("tab-" + t);
    if (section) section.hidden = t !== tab;
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.tab === tab);
  });

  // Lazy-load feed data the first time a feed tab is opened.
  if (tab !== "home" && !loaded[tab]) {
    loadFeed(tab);
  }

  // Close mobile sidebar after navigation.
  document.getElementById("sidebar").classList.remove("open");
  window.scrollTo(0, 0);
}

function currentTab() {
  return (location.hash || "#home").replace("#", "");
}

window.addEventListener("hashchange", () => showTab(currentTab()));

// Clicking any element with data-tab updates the hash (which triggers showTab).
document.querySelectorAll("[data-tab]").forEach((el) => {
  el.addEventListener("click", (e) => {
    const tab = el.dataset.tab;
    if (tab) {
      e.preventDefault();
      location.hash = tab;
      if (currentTab() === tab) showTab(tab); // handle same-hash re-click
    }
  });
});

// ---- Feed rendering ----
function timeAgo(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 60) return mins + "m ago";
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  return Math.round(hrs / 24) + "d ago";
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s || "";
  return div.innerHTML;
}

async function loadFeed(key) {
  const container = document.querySelector(`.feed[data-feed="${key}"]`);
  const meta = document.querySelector(`.feed-meta[data-meta="${key}"]`);
  if (!container) return;

  try {
    const res = await fetch(`data/${key}.json?_=${Date.now()}`);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    loaded[key] = true;

    const articles = data.articles || [];
    if (meta && data.generated) {
      meta.textContent = `${articles.length} stories · updated ${timeAgo(data.generated)}`;
    }

    if (!articles.length) {
      container.innerHTML = `<p class="loading">No stories yet — the feed will populate on the next update.</p>`;
      return;
    }

    container.innerHTML = articles
      .map((a) => {
        const when = a.published ? timeAgo(a.published) : "";
        const bits = [a.source, when].filter(Boolean).join(" · ");
        return `
          <article class="article">
            <a class="article-title" href="${escapeHtml(a.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.title)}</a>
            <div class="article-meta">${escapeHtml(bits)}</div>
            <p class="article-summary">${escapeHtml(a.summary)}</p>
          </article>`;
      })
      .join("");
  } catch (err) {
    container.innerHTML = `<p class="loading">Couldn't load this feed (${escapeHtml(String(err.message))}).</p>`;
  }
}

// ---- Init ----
showTab(currentTab());
