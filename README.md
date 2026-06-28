# AI Wiki

A plain HTML/CSS/JS static site hosted on GitHub Pages, with **live news feeds**
that refresh automatically — no backend, no server.

Live at: https://mingchark.github.io/

## How the feeds work

1. A scheduled **GitHub Action** (`.github/workflows/update-feeds.yml`) runs every
   6 hours.
2. It runs `scripts/fetch_feeds.py`, which pulls Google News RSS for each topic and
   writes JSON into `data/`.
3. The static page (`main.js`) fetches those JSON files and renders the tabs.

Because the data is committed into the repo as JSON, the page is fully static and
loads instantly — the Action does the fetching, not the browser.

## Tabs / feeds

Edit the queries in `scripts/fetch_feeds.py` (the `FEEDS` dict) to change what each
tab shows:

- `hardware` — AI hardware / chips / GPUs
- `foundation-models` — foundation model & LLM releases
- `openai` — OpenAI updates

To add a new tab: add an entry to `FEEDS`, then add the matching sidebar link +
`<section>` in `index.html` and the key in the `TABS` array in `main.js`.

## Refresh the feeds locally

```bash
python3 scripts/fetch_feeds.py   # rewrites data/*.json
```

## Local preview

```bash
python3 -m http.server 8000
# visit http://localhost:8000
```

## Files

- `index.html` — wiki layout + tabs
- `styles.css` — styling (sidebar, cards, dark mode)
- `main.js` — tab switching + feed rendering
- `scripts/fetch_feeds.py` — feed fetcher (stdlib only)
- `data/*.json` — generated feed data
- `.github/workflows/update-feeds.yml` — scheduled auto-refresh
