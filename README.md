# ai-resume

Your resume, alive. A personal AI agent page for job seekers.

**Live demo:** https://ai-resume-demo.netlify.app

A recruiter clicks a link and immediately sees proof cards with your strongest career impacts. They scan three metrics in six seconds. They ask questions. They chat with an AI that knows your career. They connect. The chat IS the landing page.

Recruiter AI agents can also query `/.well-known/ai-resume.json` for structured Schema.org data. Your career is readable by humans AND machines.

## Quick start

| You have | Follow |
|---|---|
| Claude Code or Codex CLI | Click **Use this template** → clone → open in Claude Code → follow [CLAUDE.md](CLAUDE.md). ~10 min. |
| ChatGPT, Claude Desktop, Copilot, Gemini | Click **Use this template** → clone → follow [SETUP-GUIDE.md](SETUP-GUIDE.md). ~30 min. |
| No AI assistant | Same as above. SETUP-GUIDE.md walks you through manually editing files. ~45 min. |

All paths end at a live Netlify URL. $0/month.

## How it looks

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

**Cards come back in conversation.** When a recruiter asks a list-type question ("show me her ML work", "what else has she shipped?"), the AI answers with 2-3 inline cards instead of prose. Same visual grammar, recruiter never reads a wall of text to find proof. This is the product differentiator.

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
resume.md ──[Any AI assistant]──→ system-prompt.md
                                → setup-config.json (welcome + full highlights, skills, links)
                                → setup.js → index.html (chat + cards + JSON-LD)
                                           → ai-resume.json (agent endpoint)
                                           → manifest.json (PWA)
```

- **index.html** — Single-file chat UI. Zero deps. Mobile-first. Welcome cards, inline `[CARD:...]` parser for conversation cards, streaming SSE, skeleton loading, PWA.
- **groqHandler.mjs** — Netlify function. 4-model cascade on rate limit, injection filter, SSE streaming, CORS.
- **setup.js** — Config-driven multi-file generator. Welcome cards HTML, JSON-LD, PWA manifest, OG tags, agent endpoint. Atomic writes.
- **ai-resume.json** — Schema.org Person endpoint for agent-to-agent communication.
- **palettes.js** — 4 palettes + custom, WCAG AA validation.
- **eval-prompt.mjs** — 12 behavioral tests (greeting, identity, hire signal, injection, follow-up, cards-list, cards-narrative).

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

## Tech

- **Frontend:** Vanilla HTML/CSS/JS. Zero framework, zero build step.
- **AI:** Groq free tier (Llama models, 4-model cascade on rate limit)
- **Hosting:** Netlify free tier (static + one serverless function)
- **Cost:** $0/month

## Full spec

- [spec.md](spec.md) — design, architecture, mobile, and UX decisions. Single source of truth.
- [CLAUDE.md](CLAUDE.md) — Claude Code setup wizard.
- [SETUP-GUIDE.md](SETUP-GUIDE.md) — setup for ChatGPT, Claude Desktop, Copilot, Gemini.

## License

MIT
