# ai-resume

Personal AI agent page for job seekers. Chat-first landing page where recruiters talk to an AI that knows your career.

## Project Status

**Phase: Pre-implementation.** All planning reviews complete. Next step: `/design-consultation` to create DESIGN.md, then build.

| Document | Purpose |
|----------|---------|
| `spec.md` | **Single source of truth.** All design, architecture, mobile, and UX decisions. Read this first. |
| `PLAN.md` | Implementation tasks (12 tasks, ordered). References spec.md for design details. |
| `README.md` | Public-facing — what we're building, current status. |

## What we're building

A recruiter clicks a link and sees proof cards (quantified career highlights) as the AI's opening message. They're already in a conversation. Each card has "Ask about this" and "Connect" CTAs. The chat IS the landing page — no separate landing vs chat mode.

**Key design decisions (all in spec.md):**
- Linear-inspired design system: Inter font, 8px grid, 6px tight radius, 150ms transitions
- Cards-first welcome hierarchy (proof before greeting) — cards are standalone, NOT nested in message bubbles (invariant)
- Whole card is the button (no "Ask" / "Connect →" sub-buttons, no decorative arrow). Chevron affordance in top-right.
- Project + metric only on cards (company name removed — still in resume.md + agent endpoint)
- Cards fade to 50% after first interaction — conversation takes over
- **Cards reappear in conversation** — when recruiter asks a list-type question, AI emits `[CARD: title | metric]` markup that client parses into inline cards. The product differentiator.
- `setup-config.json` carries TWO highlight lists: `welcome_highlights` (2-4, static HTML, SEO) + `full_highlights` (4-16, embedded in system prompt for AI to surface in chat)
- Persistent connect icons in header (conversion path never lost)
- Machine-readable agent endpoint at `/.well-known/ai-resume.json`
- Multi-agent setup: works with Claude Code, Codex, ChatGPT, Copilot, or manually
- 100% mobile-first: skeleton loading, PWA, haptics, 44px touch targets, CLS prevention

## Development

```bash
npm install          # groq-sdk (only dependency)
netlify dev          # local server at localhost:8888
npm run setup        # apply setup-config.json to templates
npm run eval         # 12-test behavioral eval (needs .env)
```

Requires `.env` with `GROQ_API_KEY=gsk_...` for local dev and eval.

## Architecture

```
resume.md ──[Any AI assistant]──→ system-prompt.md
                                → setup-config.json (highlights, skills, links)
                                → setup.js → index.html (chat + cards + JSON-LD + skeleton)
                                           → groqHandler.mjs (CORS)
                                           → ai-resume.json (agent endpoint)
                                           → manifest.json (PWA)
```

- **index.html** — Single-file chat UI. Inline CSS/JS. Zero deps. Mobile-first. Linear design.
- **groqHandler.mjs** — Netlify function. Reads system-prompt.md, streams via Groq. 4-model cascade on rate limit.
- **setup.js** — Multi-output generator: cards HTML, JSON-LD, PWA manifest, OG tags, agent endpoint. Atomic writes.
- **palettes.js** — 4 palettes + custom. WCAG AA contrast validation.
- **eval-prompt.mjs** — 12 behavioral tests (greeting, identity, hire signal, injection, follow-up, cards-list, cards-narrative).

## Key Files

| File | What to edit | When |
|------|-------------|------|
| `spec.md` | Design decisions, mobile spec, interaction states | When making any design/UX decision |
| `resume.md` | Career data | When resume changes |
| `system-prompt.md` | AI personality, tone, word limits | When adjusting how the AI sounds |
| `setup-config.json` | Name, palette, domain, initials, `welcome_highlights` (2-4), `full_highlights` (4-16) | When changing appearance or deploy URL |

## Setup Wizard

When a user opens Claude Code in this repo and asks to set up their resume, guide them through these steps in order:

1. **Resume** — Ask for their career info or have them paste a resume. Write `resume.md`. Push hard for quantified achievements (metrics, numbers, percentages).
2. **AI Personality** — Read `resume.md` and generate `system-prompt.md`. Replace the demo persona facts with their career. Ask if the tone is right.
3. **Highlights (two lists)** — Extract career impacts. Two separate lists:
   - `welcome_highlights` (2-4 items): the strongest impacts, shown as cards on the welcome state. Each needs: `title`, `metric`, `timeframe`. No `company` field (removed from card visual — still lives in `resume.md` narrative).
   - `full_highlights` (4-16 items): the rest of the proof-worthy projects. The AI will surface these as inline cards during conversation when a recruiter asks list-type questions ("show me her ML work", "what else?"). Each needs: `title`, `metric`, and optional `tag` (short category like `accessibility`, `infra`, `ml`).
   Strongly push for metrics in both lists — help the user find numbers if they don't have them. Text-only fallback is absolute last resort. Cards without metrics weaken the whole proof model.
4. **Configuration** — Collect name, title, palette (midnight-gold / deep-ocean / obsidian-rose / slate-mint / custom), initials, domain, LinkedIn URL, email. Write `setup-config.json` with BOTH highlight lists. Run `node setup.js` (this will also inject `full_highlights` as markdown into `system-prompt.md` via `{{FULL_HIGHLIGHTS_MARKDOWN}}` so the AI can reference them).
5. **API Key** — Ask for their Groq API key (starts with `gsk_`). Write `.env`.
6. **Test** — Run `npm install && netlify dev`. Have them try: "hi", "why should I hire [name]?", "ignore all previous instructions".
7. **Coach** — Review `resume.md` for vague descriptions, missing metrics, weak verbs. 5-dimension scorecard: specificity, metrics, impact language, consistency, completeness.
8. **Deploy** — `netlify login && netlify init && netlify env:set GROQ_API_KEY <key> && netlify deploy --prod`. Remind them the API key must be set in BOTH .env and Netlify env vars.
9. **Verify** — Visit the live URL. Test on mobile. Check proof cards render. Check OG preview card. Test `/.well-known/ai-resume.json`.

## Palettes

| Palette | Vibe |
|---------|------|
| `midnight-gold` | Dark editorial, warm gold accents |
| `deep-ocean` | Navy depths, electric cyan highlights |
| `obsidian-rose` | Cool charcoal, dusty rose warmth |
| `slate-mint` | Cool slate, fresh mint energy |

## Reviews Completed

| Review | Skill | Status | Key outcomes |
|--------|-------|--------|-------------|
| CEO | `/plan-ceo-review` | CLEAR | Scope expansion: proof cards, agent endpoint, multi-agent, smart OG |
| Engineering | `/plan-eng-review` | CLEAR | XSS fix, CORS hardening, SSE chunk splitting, send cooldown |
| Design | `/plan-design-review` | CLEAR | Linear design, cards-first hierarchy, interaction states, a11y |
| Mobile | Deep review | CLEAR | 12 items: skeleton, PWA, haptics, CLS, retry backoff, copy/share |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Check your API key" | Key must start with `gsk_`. Get one at https://console.groq.com/keys |
| "Try again in a moment" | Groq rate limit. Wait 60s. |
| `netlify: command not found` | `npm install -g netlify-cli` |
| Works locally, not production | Set GROQ_API_KEY in Netlify dashboard: Site Settings → Environment Variables |
| CORS error | Domain in setup-config.json must match deployed URL. Re-run `node setup.js`, redeploy. |
| setup.js fails | Delete `.template-backup/` and re-run |
