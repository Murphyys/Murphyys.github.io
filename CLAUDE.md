# Murphyys.github.io — Portfolio

Static portfolio site on GitHub Pages (user site, served from `main`). No framework, no build.

> Global rules (Thai replies, git identity, round-trip): `~/.claude/CLAUDE.md`. Dev rules: `dev/CLAUDE.md`.

## Rules

- **Content lives in `journey.json`.** Change `index.html` / `cv.html` only for layout/behaviour. A new career/research event usually needs both a timeline entry and its `cv` entry; bump `cv.updated`.
- **Public repo, public page.** Everything here is visible to anyone, including git history and this file.
  Add only facts that are already meant to be public. Before adding anything personal, check the
  privacy list in the vault note `wiki/meta/2026-10-07-session-portfolio-website.md` (private) — never copy that list here.
  Numbers must match the vault (`ice` entity family); check before writing them.
- **Private project repos** (cutkit, home-bot, gmail-discord-summary, claude-usage-dashboard, icebrain): `"private": true`, no GitHub link.
- **Finly** links to the live app, not GitHub.
- Unsubmitted papers stay "In preparation" — no venue results or content beyond what is public.
- Tone: English, plain, first person. Era names are epic, each with a plain subtitle. Formal: no hobby items on the timeline
  (JLPT N3 was removed 2026-10-08; Japanese stays only in `cv.languages`).
- **Certificates** live in the top-level `certs` list + `images/certs/` (see README) — all of them in that one section, cross-linked to
  their event via `event`. Before publishing a scan, mask anything beyond the name: done so far — ITPE (certificate no.), UEC (birth date,
  student ID, certificate no.) and Kushiro (birth date); those two are scanned PDFs with no text layer, so the masks are pixel boxes
  (re-check by eye after any re-render). `TESA_Team.pdf` is never published (teammates' names); use the single-name `TESA.pdf` only.
- **Hero cutout** (`images/portrait-cutout.webp`) was made with `hyperframes remove-background` from `dev/cutkit-hyperframes`
  (`--device dml`) on the 600² portrait, then trimmed to the alpha bounding box. A higher-resolution source would sharpen it; the round
  `portrait.jpg` stays as the fallback and `og:image`.
- **Photos** in `images/` are re-encoded copies (≤1600px, EXIF stripped), ≤4 per event, chosen for a formal page — the originals stay with Ice.
  Both themes share one warm palette: light sepia and its dark inversion (`--bg #15130f`, `--surface #1f1b16`, brass accents). Keep the two
  dark blocks in `index.html` identical, and `cv.html` in step; the CV print block always forces the light set.
- Test with a local server (`python -m http.server`) at desktop and phone width; no horizontal scroll.

## Pending / Known issues

- ✅ Photos (2026-10-09/10): portrait + cutout on the hero disc; galleries for `legaltech` (1), `kushiro`, `comps`, `uec`, `thesis` (3),
  `grad`, `paper1` (thumbnails on timeline cards, wrap, tap to enlarge); `og:image` set. Skipped on purpose: costume/mask party shots,
  duplicates. Events without photos by design: `uni`, `job`, `itpe`, `masters`, `paper2`.
- Degree name is **"IoT System and Information Engineering"** (no "s") — Ice confirmed 2026-10-10. The vault's LinkedIn copy still says
  "Systems"; fix it there when the LinkedIn update happens, along with the merged dual-degree Education entry, the TA and PindAI lines.
- Hero: Ice tried the "pop-out" variant (photo inside the disc) and reverted to the plain cutout — don't re-propose it.
- YouTube: only the thesis presentation is linked; the two internship recordings and the channel stay in the vault by Ice's choice.
- Demo clips: when Ice sends a link for cutkit / Home bot / Gmail digest / Second brain, set `video` on that build.
- LinkedIn profile is outdated; update it, then consider a shorter custom URL and update `profile.linkedin`.
- After ICECC submission (deadline 2026-10-15): set paper2 to "Submitted", replace its CV `citation` with the real title (Ice will send it), bump `cv.updated`.
- ITC-CSCC DOI: badge → "Published", add DOI link to paper1 (timeline + CV).
- Ice to review CV Skills. Full to-do list (incl. LinkedIn copy): vault `wiki/meta/2026-10-07-session-portfolio-website.md` § Pending.
- Resume for employers (separate from academic CV).
- ORCID (now) and Google Scholar (after the ITC-CSCC paper is on IEEE Xplore): add as `profile.orcid` / `profile.scholar` and show them in Contact.
