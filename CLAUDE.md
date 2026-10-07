# Murphyys.github.io — Portfolio

Static portfolio site on GitHub Pages (user site, served from `main`). No framework, no build.

> Global rules (Thai replies, git identity, round-trip): `~/.claude/CLAUDE.md`. Dev rules: `dev/CLAUDE.md`.

## Rules

- **Content lives in `journey.json`.** Change `index.html` only for layout/behaviour.
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

- Photos (idea A): add Kushiro, UEC, graduation, ITC-CSCC photos to `images/` and set `photo` on those events.
- LinkedIn profile is outdated; update it, then consider a shorter custom URL and update `profile.linkedin`.
- v1.1: printable `/cv` page generated from `journey.json`.
- After ICECC submission (deadline 2026-10-15): set paper2 to "Submitted".
- Resume for employers (separate from academic CV).
