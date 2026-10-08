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
- **Photos:** put files in `images/` named `<event>-1.jpg`, `<event>-2.jpg`, … (1 = lead photo) and list them on the event:
  `"photos": ["images/kushiro-1.jpg", "images/kushiro-2.jpg"]`. One photo shows plain; several become a swipeable strip with dots (no autoplay).
  Files that fail to load drop out. Hero portrait: `"portrait": "images/portrait.jpg"` in `profile`. Resize to ≤1600px wide before committing.
- **Demo clip:** on a private build, `"video": "<url>"` replaces "request a demo" with "watch a short demo".
- **Selected work:** the `selected` list under the hero; `go` is `feat:<event id>`, `event:<event id>` (opens it) or `build:<slug of title>`.
- **Status chip:** optional `"badge"` on an event (e.g. `Presented`, `In preparation`).
- **New project:** add to `builds`. `"private": true` shows "demo on request" instead of a link.

Icons available: `trophy`, `lang`, `torii`, `net`, `grad`, `wifi`, `work`, `badge`, `paper`.

## Preview locally

```bash
python -m http.server 8000   # then open http://localhost:8000
```

Opening `index.html` directly from disk will not load `journey.json` (browsers block `fetch` on `file://`).
