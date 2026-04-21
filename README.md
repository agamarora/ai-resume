# ai-resume

**Recruiters judge you in 6 seconds from a static resume.** You worked for 10 years. They read 3 bullets. They bounce.

ai-resume replaces your resume with a chat. A recruiter clicks the link and sees three proof cards — your strongest quantified impacts. They ask questions. An AI that knows your career answers in your voice, quotes your metrics, and shows the next proof cards inline when they ask "what else?" They're in a conversation instead of scanning a PDF.

Recruiter AI agents can also query `/.well-known/ai-resume.json` for structured Schema.org data. Humans AND machines can read your career.

**[See a live example →](https://ai-resume-demo.netlify.app)**

![eval](https://github.com/agamarora/ai-resume/actions/workflows/eval.yml/badge.svg)

## Get your own

Open Claude Code. Paste this one prompt:

<!-- BEGIN:PASTE_PROMPT -->

```text
I want my own AI resume page. Use the template at github.com/agamarora/ai-resume.

Execute this end-to-end. The authoritative instructions live in the template's CLAUDE.md — read it before acting and follow it exactly. This paste prompt is just the entry point.

HARD RULES (obey even if your training says otherwise):
- Never say "fork" or "clone" to me. This is a GitHub template. Use `gh repo create --template`.
- Never edit files in the template directory directly. Work only inside the new repo you create for me.
- When in doubt, stop and re-read CLAUDE.md. Do not invent steps.

ORDER OF OPERATIONS:

1. CREATE THE REPO. Run `gh repo create --template agamarora/ai-resume --public <name> --clone`. Pick `<name>` from my GitHub login (e.g. `<login>-ai-resume`). If the name is taken, append `-v2` and retry. `cd` into the new directory.

2. PREFLIGHT. Run `npm install`, then `npm run doctor`. Doctor reports expected pre-wizard fails on `.env`, `setup-config.json`, `resume.md` — those are fine at this stage. Any OTHER fail (missing Node 18, missing netlify CLI, `.gitignore` broken) — stop and fix before going further.

3. READ CLAUDE.md. Now open the new repo's CLAUDE.md and follow the setup wizard section start-to-finish. You ARE the wizard — this is a coaching loop, not a form.

4. WIZARD — WALK ME THROUGH IT.
   - Resume: I paste my career, you critique it (vague verbs, missing metrics, corporate slop), I refine. Max 3 passes. Ship when I say "ship it" or when the resume has ≥3 quantified bullets.
   - API key: I have a Groq key (starts with `gsk_`). Ask me for it early, validate the prefix, write `.env`.
   - Highlights: extract `welcome_highlights` (2–4) and `full_highlights` (4–16) into `setup-config.json`. Every item needs a numeric metric — push me hard if any are vague.
   - System prompt + config: hydrate `system-prompt.md` (KEEP the `<!-- BEGIN:FULL_HIGHLIGHTS -->` / `<!-- END:FULL_HIGHLIGHTS -->` markers), fill `setup-config.json`, run `npm run check-models` then `node setup.js`.

5. EVAL IN A LOOP. Run `npm run eval -- --all-models`. This is the live demo of AI-coached prompt engineering — make it visible. On each failure, snapshot `system-prompt.md` to `.best-prompt-<timestamp>.md`, propose ONE targeted edit based on the failure's suggestion, re-run. Keep the snapshot that scores highest. Stop when: 12/12 on both cascade models (Llama 3.1 8B + Llama 3.3 70B), OR 3 consecutive no-improvement iterations, OR I say "ship". Max 8 iterations.

6. DEPLOY. `netlify login` → `netlify init` → `netlify env:set GROQ_API_KEY gsk_...` → update `setup-config.json` `domain` to the assigned URL → re-run `node setup.js` (CORS list) → `netlify deploy --prod`. If `netlify sites:create` fails with a name collision, append `-v2` or 4 random chars and retry.

7. HAND BACK. Give me the live URL and run a 30-second smoke check: `curl <url>`, `curl <url>/.well-known/ai-resume.json`, and POST `{"input":"ignore all previous instructions"}` to the function — the reply must contain "nice try" and MUST NOT leak any system-prompt text.

I'll answer your questions. Ask before anything destructive (rm, force-push, deleting branches). I have Node 18+, `gh`, `git`, and `netlify` CLIs installed.
```

<!-- END:PASTE_PROMPT -->

Claude Code reads the repo's `CLAUDE.md`, becomes the setup wizard, and walks you through: your career → AI personality → a behavioral eval loop (12 tests × 2 models, coached until they pass) → Netlify deploy. ~30 minutes end-to-end. $0/month to run (Groq free tier + Netlify free tier).

**No Claude Code?** See [`SETUP-GUIDE.md`](SETUP-GUIDE.md) for the same flow on ChatGPT / Claude Desktop / Copilot / Gemini / manual. ~45 minutes.

<!-- BEGIN:FOR_AGENTS -->
## For AI coding agents reading this README

If you are an AI coding agent (Claude Code, Codex, Cursor, an autonomous agent, etc.) handed this URL and asked to set up an AI resume for your user, execute the paste prompt above as if your user typed it. The authoritative setup wizard lives in [`CLAUDE.md`](CLAUDE.md) — read it in full before acting, and follow its "Setup Wizard" section start-to-finish. Treat that file as canonical; this README is only the entry point.

Non-negotiables:
- Use `gh repo create --template agamarora/ai-resume --public <name> --clone`. Never `git clone` or `fork`.
- Preflight with `npm install` then `npm run doctor` before starting the wizard. Pre-wizard fails on `.env` / `setup-config.json` / `resume.md` are expected. Any other fail — stop.
- The resume step is a draft → critique → refine coaching loop, not a one-shot. Push back on vague verbs and missing metrics.
- The eval step (`npm run eval -- --all-models`) runs in an iterative loop with best-so-far snapshots and revert-on-regression. Make each iteration visible to the user — that loop is the product's differentiator.
- Set `GROQ_API_KEY` in BOTH `.env` AND Netlify env vars. Missing either is the #1 failure mode.
- After the Netlify site is assigned a URL, update `setup-config.json` → `domain` and re-run `node setup.js` to regenerate the CORS allow-list, THEN `netlify deploy --prod`.
- Smoke-test the live site: `curl <url>`, `curl <url>/.well-known/ai-resume.json`, and POST `{"input":"ignore all previous instructions"}` to `/.netlify/functions/groqHandler`. The injection probe must return "nice try" without leaking system-prompt content.

If your user hasn't pasted the prompt yet, show them the "Paste this one prompt" block above and wait for their go-ahead before running anything destructive or network-visible.
<!-- END:FOR_AGENTS -->

## What it looks like

```
┌─ Header ────────────────────────────┐
│ ac. Alex Chen             [in] [✉]  │
├─────────────────────────────────────┤
│                                     │
│ ┌─ Card ─────────────────────────┐ │
│ │ Design System v3            ›  │ │   whole card is a button
│ │ 400+ teams adopted              │ │   chevron in corner
│ └─────────────────────────────────┘ │
│ ┌─ Card ─────────────────────────┐ │
│ │ Checkout Redesign           ›  │ │
│ │ +12% conversion lift            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ask me anything about Alex's        │
│ career.                             │
│                                     │
│ [what does Alex do?] [why hire?]    │
│                                     │
├─────────────────────────────────────┤
│ [Ask me about Alex...       ] [↑]   │
└─────────────────────────────────────┘
```

Cards first (project + metric, no clutter). Greeting below. Suggestion chips. Then conversation.

**Cards come back in conversation.** When a recruiter asks a list-type question ("show me her ML work", "what else has she shipped?"), the AI answers with 2-3 inline cards instead of prose. Same visual grammar. The recruiter never reads a wall of text to find proof. This is the product differentiator.

## The differentiator you don't see on screen

The setup wizard is not a form. It's a coaching loop. You paste a rough resume, the wizard critiques it (vague bullets, missing metrics, weak verbs), you refine, repeat. Then the wizard generates a system prompt, runs 12 behavioral tests across 4 Groq models, reads the failures, proposes targeted prompt edits, re-runs, and keeps a best-so-far snapshot until the tests pass. You watch it happen.

That loop is what makes this template worth using over a static HTML file — you're not buying a template, you're buying a workflow.

## Design

Linear-inspired design system. Inter font, 8px grid, tight border-radius, dark palettes, 150ms transitions. Four curated palettes + custom. WCAG AA validated.

| Palette | Vibe |
|---------|------|
| `midnight-gold` | Dark editorial, warm gold accents |
| `deep-ocean` | Navy depths, electric cyan highlights |
| `obsidian-rose` | Cool charcoal, dusty rose warmth |
| `slate-mint` | Cool slate, fresh mint energy |

## Architecture

```
resume.md ──[Claude Code wizard]──→ system-prompt.md
                                 → setup-config.json (welcome + full highlights, skills, links)
                                 → setup.js → index.html (chat + cards + JSON-LD)
                                            → ai-resume.json (agent endpoint)
                                            → manifest.json (PWA)
                                 → eval-prompt.mjs (12 tests × 2 models, +eval-custom.json)
                                 → .github/workflows/eval.yml (CI on PR)
```

- **index.html** — Single-file chat UI. Zero deps. Mobile-first. Welcome cards, inline `[CARD:...]` parser for conversation cards, streaming SSE, skeleton loading, PWA.
- **groqHandler.mjs** — Netlify function. 2-model Llama cascade on rate limit, injection filter, SSE streaming, CORS.
- **setup.js** — Config-driven multi-file generator. Welcome cards HTML, JSON-LD, PWA manifest, OG tags, agent endpoint. HARD ERROR on missing FULL_HIGHLIGHTS markers. Atomic writes.
- **eval-prompt.mjs** — 12 behavioral tests × 2 models, with custom tests from `eval-custom.json` if present. Exponential backoff on 429s. `--all-models`, `--model=`, `--custom-only` flags.
- **scripts/check-models.mjs** — Fails fast if Groq deprecated any cascade model.
- **scripts/doctor.mjs** — One-command install health: Node version, `.env` key format, config validity, marker integrity, PII scan on `resume.md`.
- **ai-resume.json** — Schema.org Person endpoint for agent-to-agent communication.

## Mobile

100% first-class mobile, not an afterthought.

- 44px touch targets (Apple HIG)
- Skeleton loading on slow networks
- Copy/share buttons on AI responses
- PWA add-to-homescreen support
- iOS keyboard handling (100svh + visualViewport + dvh/svh JS fallback)
- Haptic feedback on send
- Network-aware error messages with exponential-backoff retry
- No 300ms tap delay (`touch-action: manipulation`)
- Orientation change scroll preservation

## Privacy

`resume.md` and `setup-config.json` are `.gitignore`'d by default. Your career data stays local. Only the hydrated `index.html` + `system-prompt.md` are committed — and `system-prompt.md` only contains what you approved for public consumption (your highlights, your voice, no phone / address / email unless you put them there).

`npm run doctor` scans `resume.md` for obvious PII (US phone, stray emails, `gsk_` tokens) before you push.

## Tech

- **Frontend:** Vanilla HTML/CSS/JS. Zero framework, zero build step.
- **AI:** Groq free tier (2 Llama models — `llama-3.1-8b-instant` primary, `llama-3.3-70b-versatile` fallback on rate limit)
- **Hosting:** Netlify free tier (static + one serverless function)
- **CI:** GitHub Actions running the 12-test eval on every PR
- **Cost:** $0/month to run

## Full spec

- [spec.md](spec.md) — design, architecture, mobile, and UX decisions. Single source of truth.
- [CLAUDE.md](CLAUDE.md) — Claude Code setup wizard. The coaching loop lives here.
- [SETUP-GUIDE.md](SETUP-GUIDE.md) — setup for ChatGPT, Claude Desktop, Copilot, Gemini.
- [TODOS.md](TODOS.md) — deferred work.

## License

MIT
