# ai-resume

Open-source AI-powered interactive resume. Visitors chat with an AI that knows your career.

## For Development

This repo is a template. See `PLAN.md` for the full implementation plan with 12 tasks, specs, and verification steps.

### Current Status
- [x] Repo created + foundation files (package.json, .gitignore, netlify.toml, LICENSE)
- [x] palettes.js — 4 curated palettes + hex→rgba derivation + WCAG contrast validation
- [x] resume.md — demo persona (Alex Chen) template
- [x] system-prompt.md — template with placeholder structure
- [x] groqHandler.mjs — serverless function with system-prompt.md runtime read, model cascade fix, Samsung Internet CORS fix
- [x] setup.js — config → atomic find-and-replace with validation, escaping, backup
- [ ] index.html — chat UI (Task 3 in PLAN.md) — THE MAIN BUILD TASK
- [ ] eval-prompt.mjs — behavioral test suite (Task 8)
- [ ] CLAUDE.md rewrite — setup wizard for end users (Task 7)
- [ ] Demo site deployment (Task 9)
- [ ] Landing page on agamarora.com (Task 10)
- [ ] README.md for GitHub (Task 11)

### Architecture
```
resume.md ──[Claude Code]──→ system-prompt.md ──[groqHandler reads at runtime]──→ AI responses
                                                                                      ↓
setup-config.json ──[setup.js]──→ index.html (colors, name, meta tags)          SSE stream
                                                                                      ↓
                                                                              index.html (chat UI)
```

### Key Design Decisions
- Chat UI is ChatGPT/Claude-style (message bubbles), NOT a custom terminal
- Zero external runtime dependencies (no CDN, no external scripts)
- Mobile-first: patterns from Loquix/Ultralytics/QuikChat frozen in our code
- system-prompt.md editable by users, read by groqHandler at runtime via Netlify included_files
- 4 color palettes (midnight-gold, deep-ocean, obsidian-rose, slate-mint) + custom
- Groq free tier + Netlify free tier = $0/month

### Source Reference
Original codebase at `D:\AA\agamarora`:
- `enter/index.html` — streaming client, keyboard bg, auto-type, visualViewport
- `netlify/functions/groqHandler.mjs` — system prompt structure, SSE streaming, injection filter
- `eval-prompt.mjs` — eval harness, Groq API connection pattern
- `DESIGN.md` — design tokens for landing page
