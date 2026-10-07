# Murphyys.github.io

Personal portfolio of **Bordin Pantdej (Ice)**, told as a scrolling journey: university, first job and papers, things I built, and what's next.

Live: https://murphyys.github.io

## Structure

| File | What it is |
|---|---|
| `index.html` | The page: layout, styles and scripts (no build step) |
| `journey.json` | All content: profile, hero facts, eras, events, projects |
| `images/` | Photos referenced from `journey.json` |
| `.nojekyll` | Serve files as-is (skip Jekyll) |

## Updating content

Edit `journey.json` only:

- **New moment:** add an object to `events` with `era`, `year`, `date`, `title`, `short`, `long`, `icon`.
  Optional: `beats`, `stats`, `links`, `tags`, `"featured": true` (wide card), `"status": "prep"` (in progress).
- **Photo:** put the file in `images/` and set `"photo": "images/<file>.jpg"` on the event.
- **New project:** add to `builds`. `"private": true` shows "demo on request" instead of a link.

Icons available: `trophy`, `lang`, `torii`, `net`, `grad`, `wifi`, `work`, `badge`, `paper`.

## Preview locally

```bash
python -m http.server 8000   # then open http://localhost:8000
```

Opening `index.html` directly from disk will not load `journey.json` (browsers block `fetch` on `file://`).
