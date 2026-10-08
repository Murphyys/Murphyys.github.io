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
- Tone: English, plain, first person. Era names are epic, each with a plain subtitle.
- Test with a local server (`python -m http.server`) at desktop and phone width; no horizontal scroll.

## Pending / Known issues

- Photos: gallery support is in (`photos` list per event, `profile.portrait`); waiting for Ice's files (`portrait`, `kushiro-N`, `uec-N`, `itc-cscc-N`, `graduation-N`). Resize to ≤1600px wide (portrait ≤600px square) and compress, then add paths to `journey.json`.
- Demo clips: when Ice sends a link for cutkit / Home bot / Gmail digest / Second brain, set `video` on that build.
- LinkedIn profile is outdated; update it, then consider a shorter custom URL and update `profile.linkedin`.
- After ICECC submission (deadline 2026-10-15): set paper2 to "Submitted".
- Resume for employers (separate from academic CV).
- ORCID (now) and Google Scholar (after the ITC-CSCC paper is on IEEE Xplore): add as `profile.orcid` / `profile.scholar` and show them in Contact.
