# Murphyys.github.io

Personal portfolio of **Bordin Pantdej (Ice)**, told as a scrolling journey: university, first job and papers, things I built, and what's next.

Live: https://murphyys.github.io

## Structure

| File | What it is |
|---|---|
| `index.html` | The page: layout, styles and scripts (no build step) |
| `journey.json` | All content: profile, hero facts, selected work, CV extras, eras, events, projects |
| `cv.html` | Printable CV (`/cv`), built from the same `journey.json`; "Download PDF" = browser print → Save as PDF |
| `favicon.svg`, `icon-180.png` | Tab icon and iOS home-screen icon |
| `images/` | Photos referenced from `journey.json` (`portrait.jpg`, `<event>-N.jpg`); `images/certs/` holds the certificate scans |
| `.nojekyll` | Serve files as-is (skip Jekyll) |

## Updating content

Edit `journey.json` only:

- **New moment:** add an object to `events` with `era`, `year`, `date`, `title`, `short`, `long`, `icon`.
  Optional: `beats`, `stats`, `links`, `tags`, `"featured": true` (wide card), `"status": "prep"` (in progress).
- **Photos:** put files in `images/` named `<event>-1.jpg`, `<event>-2.jpg`, … (1 = lead photo) and list them on the event:
  `"photos": ["images/kushiro-1.jpg", "images/kushiro-2.jpg"]`. One photo shows plain; several become a swipeable strip with dots (no autoplay).
  Files that fail to load drop out. Arrows wrap around, and tapping a photo opens it full-size (lightbox with ‹ › / arrow keys, wrapping too).
  Non-featured events show their lead photo as a small thumbnail on the timeline card.
  Hero portrait: `"portrait": "images/portrait.jpg"` in `profile` (600×600, also used as `og:image`) and, optionally,
  `"portraitCutout": "images/portrait-cutout.webp"` — a background-removed head-and-shoulders PNG/WebP with alpha, shown on a brass disc
  with the head rising above it (made with `hyperframes remove-background portrait.jpg -o cutout.png`, then trimmed to the subject's bounding box).
  If the cutout is missing or fails to load, the round `portrait` is shown instead.
  Keep it to ≤4 photos per event, ≤1600px on the long side, JPEG ~q82, and strip EXIF (location data) before committing.
- **Certifications & awards:** the top-level `certs` list, newest first:
  `{"id", "kind": "cert" | "award", "title", "issuer", "date", "image": "images/certs/<id>.jpg", "badge"?, "desc"?, "href"? (verify link), "event"? (event id), "cv"?: true}`.
  They render as cards after the eras (click the scan = full-size view). `"event"` cross-links both ways: the card gets "Part of: <event> →"
  (opens that event) and the event's dialog gets a "Certificate ↗" link. `"cv": true` also lists the item under *Honors & certifications* on the CV —
  leave it out when the same honour is already an event `cv` entry, or the CV shows it twice. Render PDFs to JPEG (≤1600px) first, and never
  publish a scan that shows a birth date, ID or certificate number (crop or mask it).
- **Contact:** the email address in the "What's next" section is itself the copy button (click → clipboard); no separate control.
- **CV:** an event appears on the CV when it has a `cv` list, e.g. `{"section": "experience", "title", "org", "place", "dates", "detail"}`.
  Sections: `education`, `research`, `publication` (`citation` + `status`), `experience`, `honor`. Skills, languages, summary and the
  "Updated" date live in the top-level `cv` block. Add `profile.orcid` / `profile.scholar` and they show on both pages.
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
