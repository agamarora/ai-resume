# ai-resume

AI-powered interactive resume. Visitors chat with an AI that knows your career.

## Development

```bash
npm install          # groq-sdk (only dependency)
netlify dev          # local server at localhost:8888
npm run setup        # apply setup-config.json to templates
npm run eval         # 10-test behavioral eval (needs .env)
```

Requires `.env` with `GROQ_API_KEY=gsk_...` for local dev and eval.

## Architecture

```
resume.md → system-prompt.md → groqHandler.mjs → AI responses (SSE)
                                                       ↓
setup-config.json → setup.js → index.html ←─────── Chat UI
```

- **index.html** — Single-file chat UI. Inline CSS/JS. Zero deps. Mobile-first.
- **groqHandler.mjs** — Netlify function. Reads system-prompt.md, streams via Groq. 4-model cascade on rate limit.
- **setup.js** — Config-driven placeholder replacement. Atomic writes. Re-runnable.
- **palettes.js** — 4 palettes + custom. WCAG AA contrast validation.
- **eval-prompt.mjs** — 10 behavioral tests (greeting, identity, hire signal, injection, follow-up).

## Key Files

| File | What to edit | When |
|------|-------------|------|
| `resume.md` | Your career data | When your resume changes |
| `system-prompt.md` | AI personality, tone, word limits | When you want to adjust how the AI sounds |
| `setup-config.json` | Name, palette, domain, initials | When you want to change appearance or deploy URL |

## Setup Wizard

When a user opens Claude Code in this repo and asks to set up their resume, guide them through these steps in order:

1. **Resume** — Ask for their career info or have them paste a resume. Write `resume.md`.
2. **AI Personality** — Read `resume.md` and generate `system-prompt.md`. Replace the demo persona facts with their career. Ask if the tone is right.
3. **Configuration** — Collect name, title, palette (midnight-gold / deep-ocean / obsidian-rose / slate-mint / custom), initials, domain. Write `setup-config.json`. Run `node setup.js`.
4. **API Key** — Ask for their Groq API key (starts with `gsk_`). Write `.env`.
5. **Test** — Run `npm install && netlify dev`. Have them try: "hi", "why should I hire [name]?", "ignore all previous instructions".
6. **Coach** — Review `resume.md` for vague descriptions, missing metrics, weak verbs. Suggest improvements.
7. **Deploy** — `netlify login && netlify init && netlify env:set GROQ_API_KEY <key> && netlify deploy --prod`. Remind them the API key must be set in BOTH .env and Netlify env vars.
8. **Verify** — Visit the live URL. Test on mobile. Check Open Graph preview card.

## Palettes

| Palette | Vibe |
|---------|------|
| `midnight-gold` | Dark editorial, warm gold accents |
| `deep-ocean` | Navy depths, electric cyan highlights |
| `obsidian-rose` | Cool charcoal, dusty rose warmth |
| `slate-mint` | Cool slate, fresh mint energy |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Check your API key" | Key must start with `gsk_`. Get one at https://console.groq.com/keys |
| "Try again in a moment" | Groq rate limit. Wait 60s. |
| `netlify: command not found` | `npm install -g netlify-cli` |
| Works locally, not production | Set GROQ_API_KEY in Netlify dashboard: Site Settings → Environment Variables |
| CORS error | Domain in setup-config.json must match deployed URL. Re-run `node setup.js`, redeploy. |
| setup.js fails | Delete `.template-backup/` and re-run |
