# My Site

A plain HTML/CSS/JS static website hosted for free on GitHub Pages.

## Local preview

Open `index.html` in a browser, or run a tiny local server:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploy

Push to the GitHub repo's default branch. In the repo's
**Settings → Pages**, set the source to **Deploy from a branch**,
branch `main`, folder `/ (root)`. The site goes live within ~1 minute.

## Files

- `index.html` — page markup
- `styles.css` — styling (includes dark mode)
- `main.js` — small script (sets footer year)
- `.nojekyll` — tells GitHub Pages to skip Jekyll processing
