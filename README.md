# ai-resume

Your resume, alive. A personal AI agent page for job seekers.

> **Status: Building in public.** Spec finalized, reviews cleared, implementation next. See [spec.md](spec.md) for the full design.

## What this is

A chat-first personal page where recruiters talk to an AI that knows your career. Not a chatbot slapped onto a portfolio — the chat IS the landing page. Proof cards show your strongest impacts at a glance. A machine-readable endpoint lets recruiter AI agents query your career data.

**For job seekers:** Paste your resume into any AI assistant (Claude Code, ChatGPT, Codex). Minutes later, you have a live AI agent page. Setup takes one prompt.

**For recruiters:** Click a link, see proof cards (quantified career impacts), ask anything, connect. The 6-second first impression is built in.

**For recruiter AI agents:** Query `/.well-known/ai-resume.json` for structured Schema.org Person data, skills, availability, and a chat endpoint.

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

**Cards come back in conversation.** When a recruiter asks a list-type question ("show me her ML work", "what else has she shipped?"), the AI answers with 2-3 inline cards instead of prose. Same visual grammar — recruiter never has to read a wall of text to find proof. This is the product differentiator.

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
                                → setup-config.json (highlights, skills, links)
                                → setup.js → index.html (chat + cards + JSON-LD)
                                           → ai-resume.json (agent endpoint)
                                           → manifest.json (PWA)
```

- **index.html** — Single-file chat UI. Zero deps. Mobile-first. Proof cards, streaming SSE, skeleton loading.
- **groqHandler.mjs** — Netlify function. 4-model cascade, injection filter, SSE streaming.
- **setup.js** — Config-driven multi-file generator. Cards, JSON-LD, PWA manifest, OG tags. Atomic writes.
- **ai-resume.json** — Schema.org Person endpoint for agent-to-agent communication.

## Mobile

100% first-class mobile, not just responsive. Built for Product Hunt launch quality.

- 44px touch targets (Apple HIG)
- Skeleton loading on slow networks
- Copy/share buttons on AI responses
- PWA add-to-homescreen support
- iOS keyboard handling (100svh + visualViewport)
- Haptic feedback on send
- Network-aware error messages with retry backoff
- No 300ms tap delay (`touch-action: manipulation`)
- Orientation change scroll preservation

## Multi-agent setup

Works with any AI assistant, not just Claude Code:

| Tier | Tool | Time |
|------|------|------|
| Agentic | Claude Code, Codex CLI | ~10 min |
| Generative | ChatGPT, Copilot, Claude Desktop | ~20-30 min |
| Manual | README instructions | ~30-45 min |

## Tech

- **Frontend:** Vanilla HTML/CSS/JS. Zero framework, zero build step.
- **AI:** Groq free tier (Llama models, 4-model cascade on rate limit)
- **Hosting:** Netlify free tier
- **Cost:** $0/month

## Status

All planning reviews complete:

| Review | Status |
|--------|--------|
| CEO / Strategy | CLEAR — scope expansion, proof cards, agent endpoint, multi-agent setup |
| Engineering | CLEAR — XSS fix, CORS hardening, SSE chunk splitting, send cooldown |
| Design | CLEAR — Linear design system, cards-first hierarchy, interaction states, a11y |
| Mobile | CLEAR — 12 items for Product Hunt quality (skeleton, PWA, haptics, CLS) |

**Next:** `/design-consultation` to create DESIGN.md, then implement.

Full spec: [spec.md](spec.md) | Plan: [PLAN.md](PLAN.md)

## License

MIT
