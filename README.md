# ai-resume

An AI-powered interactive resume. Visitors ask questions about your career and get real-time streaming responses from an AI that knows your background.

**Stack:** Vanilla HTML/CSS/JS + Groq API + Netlify Functions. Zero build step, zero framework, $0/month.

## Quick Start

1. **Use this template** — click "Use this template" on GitHub to create your own repo
2. **Clone your repo** and open it in [Claude Code](https://claude.ai/code)
3. **Follow the setup wizard** — Claude Code reads the `CLAUDE.md` and walks you through everything:
   - Paste your resume or describe your career
   - Choose a color palette
   - Set your Groq API key
   - Test locally, then deploy to Netlify

Total setup time: ~30 minutes. Three accounts needed: GitHub, [Groq](https://console.groq.com) (free), [Netlify](https://app.netlify.com) (free).

### Manual Setup (without Claude Code)

```bash
git clone https://github.com/<your-username>/ai-resume.git
cd ai-resume
npm install
```

1. Edit `resume.md` with your career data
2. Edit `system-prompt.md` — replace placeholder name/title with yours, add your career facts
3. Create `setup-config.json`:
   ```json
   {
     "name": "Your Name",
     "title": "Your Title",
     "palette": "midnight-gold",
     "domain": "yourname.netlify.app",
     "initials": "yn",
     "welcome_message": "hey! ask me anything about my career.",
     "placeholder_text": "Ask me about...",
     "auto_type_questions": ["what do you do?", "why should I hire you?"]
   }
   ```
4. Run `node setup.js`
5. Create `.env` with `GROQ_API_KEY=gsk_...`
6. Run `netlify dev` to test locally
7. Deploy: `netlify login && netlify init && netlify env:set GROQ_API_KEY <key> && netlify deploy --prod`

## Palettes

| Palette | Description |
|---------|-------------|
| `midnight-gold` | Dark editorial with warm gold accents |
| `deep-ocean` | Navy depths with electric cyan highlights |
| `obsidian-rose` | Cool charcoal with dusty rose warmth |
| `slate-mint` | Cool slate with fresh mint energy |
| `custom` | Your own 5 colors (validated for WCAG AA contrast) |

## How It Works

```
resume.md → system-prompt.md → groqHandler.mjs → AI responses (SSE stream)
                                                        ↓
setup-config.json → setup.js → index.html ←──────── Chat UI
```

- **index.html** — Single-file chat interface. Inline CSS and JS. Mobile-first with iOS keyboard handling, streaming with 30ms throttled rendering, suggestion chips, and auto-scroll.
- **groqHandler.mjs** — Netlify serverless function. Reads `system-prompt.md` at cold start, streams responses via SSE. Cascades through 4 Groq models if one is rate-limited. Includes prompt injection filtering.
- **setup.js** — Reads `setup-config.json`, replaces template placeholders in `index.html` and `groqHandler.mjs`. Atomic writes with validation.
- **palettes.js** — 4 curated dark-mode palettes with derived RGBA variants and WCAG AA contrast validation.
- **eval-prompt.mjs** — 10-test behavioral suite covering greetings, identity, hiring signal, off-topic deflection, prompt injection resistance, and follow-up context.

## Customization

| What | How |
|------|-----|
| AI personality | Edit `system-prompt.md` — change tone, word limit, banned words |
| Resume content | Edit `resume.md`, then regenerate `system-prompt.md` |
| Colors | Change `palette` in `setup-config.json`, run `node setup.js` |
| Custom colors | Set `"palette": "custom"` with `"custom_palette": { "bg": "#...", "border": "#...", "text": "#...", "textDim": "#...", "accent": "#..." }` |

## FAQ

**How much does it cost?**
$0/month. Groq's free tier handles the AI. Netlify's free tier handles hosting.

**Do I need Claude Code?**
Recommended but not required. Claude Code reads the `CLAUDE.md` and guides you through setup conversationally. Without it, follow the manual setup above.

**Does it work on mobile?**
Yes. The UI is mobile-first with iOS keyboard handling, safe area insets, and 44px touch targets.

**Can I use a custom domain?**
Yes. Set up a custom domain in Netlify, update `domain` in `setup-config.json`, re-run `setup.js`, and redeploy.

**How do I update my resume?**
Edit `resume.md`, regenerate `system-prompt.md` (via Claude Code or manually), and redeploy with `netlify deploy --prod`.

## Running Tests

```bash
npm run eval
```

Runs 10 behavioral tests against your configured AI. Requires `.env` with `GROQ_API_KEY`. Tests cover greeting quality, identity awareness, hiring signal (checks for metrics), off-topic deflection, injection resistance, and follow-up context.

## License

MIT
