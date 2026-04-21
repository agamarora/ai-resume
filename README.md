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

Do everything for me:

1. Create a new GitHub repo for me from that template (use `gh repo create --template agamarora/ai-resume --public <repo-name>`). Pick a sensible default name from my GitHub username or ask me one question if you need to.
2. Scaffold it locally in ~/ai-resume (or wherever I already am if it makes sense).
3. Read the repo's CLAUDE.md. It's the setup wizard — follow it start to finish.
4. Walk me through it conversationally: resume (draft → critique → refine), API key (I have a Groq key ready), highlights with metrics, config. Then run setup.js, run the eval-in-a-loop until all 12 tests pass on all 4 cascade models or we hit 3 no-improvement rounds.
5. Deploy to Netlify. Set the GROQ_API_KEY env var in the Netlify dashboard too.
6. Give me the live URL at the end.

I'll answer your questions. Ask before anything destructive. I'm on a laptop with Node 18+, gh CLI, and git installed.
```

<!-- END:PASTE_PROMPT -->

Claude Code reads the repo's `CLAUDE.md`, becomes the setup wizard, and walks you through: your career → AI personality → a behavioral eval loop (12 tests × 4 models, coached until they pass) → Netlify deploy. ~30 minutes end-to-end. $0/month to run (Groq free tier + Netlify free tier).

**No Claude Code?** See [`SETUP-GUIDE.md`](SETUP-GUIDE.md) for the same flow on ChatGPT / Claude Desktop / Copilot / Gemini / manual. ~45 minutes.

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
                                 → eval-prompt.mjs (12 tests × 4 models, +eval-custom.json)
                                 → .github/workflows/eval.yml (CI on PR)
```

- **index.html** — Single-file chat UI. Zero deps. Mobile-first. Welcome cards, inline `[CARD:...]` parser for conversation cards, streaming SSE, skeleton loading, PWA.
- **groqHandler.mjs** — Netlify function. 4-model cascade on rate limit, injection filter, SSE streaming, CORS.
- **setup.js** — Config-driven multi-file generator. Welcome cards HTML, JSON-LD, PWA manifest, OG tags, agent endpoint. HARD ERROR on missing FULL_HIGHLIGHTS markers. Atomic writes.
- **eval-prompt.mjs** — 12 behavioral tests × 4 models, with custom tests from `eval-custom.json` if present. Exponential backoff on 429s. `--all-models`, `--model=`, `--custom-only` flags.
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
- **AI:** Groq free tier (Llama + Qwen + GPT-OSS models, 4-model cascade on rate limit)
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
