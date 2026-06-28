#!/usr/bin/env python3
"""Fetch news feeds and write them as JSON for the static site.

No third-party packages required (uses only the standard library), so this
runs anywhere — locally and inside GitHub Actions.

Each feed is a Google News RSS search, which gives well-formed, reliable
RSS for any topic. Output: data/<key>.json, an array of article objects.
"""

import json
import re
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

# key -> human query. Tweak the queries to refine each tab's results.
FEEDS = {
    "hardware": "AI hardware OR AI chips OR GPU accelerator (Nvidia OR AMD OR TPU)",
    "foundation-models": "foundation model OR large language model release",
    "openai": "OpenAI",
}

GOOGLE_NEWS = "https://news.google.com/rss/search?q={q}&hl=en-US&gl=US&ceid=US:en"
MAX_ITEMS = 25
DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def strip_html(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text or "")
    return re.sub(r"\s+", " ", text).strip()


def parse_date(raw: str) -> str:
    """Return an ISO 8601 string, or the raw value if it can't be parsed."""
    for fmt in ("%a, %d %b %Y %H:%M:%S %Z", "%a, %d %b %Y %H:%M:%S %z"):
        try:
            return datetime.strptime(raw, fmt).astimezone(timezone.utc).isoformat()
        except (ValueError, TypeError):
            continue
    return raw or ""


def fetch(query: str):
    url = GOOGLE_NEWS.format(q=urllib.parse.quote(query))
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (wiki-feed-bot)"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        xml = resp.read()

    root = ET.fromstring(xml)
    items = []
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        pub = parse_date(item.findtext("pubDate") or "")
        source_el = item.find("source")
        source = source_el.text.strip() if source_el is not None and source_el.text else ""
        summary = strip_html(item.findtext("description") or "")
        if title and link:
            items.append(
                {
                    "title": title,
                    "link": link,
                    "source": source,
                    "published": pub,
                    "summary": summary[:300],
                }
            )
        if len(items) >= MAX_ITEMS:
            break
    return items


def main():
    DATA_DIR.mkdir(exist_ok=True)
    generated = datetime.now(timezone.utc).isoformat()
    for key, query in FEEDS.items():
        try:
            articles = fetch(query)
        except Exception as exc:  # keep going if one feed fails
            print(f"[warn] {key}: {exc}")
            articles = []
        payload = {"generated": generated, "query": query, "articles": articles}
        out = DATA_DIR / f"{key}.json"
        out.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
        print(f"[ok] {key}: {len(articles)} articles -> {out.name}")


if __name__ == "__main__":
    main()
