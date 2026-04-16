# ai-resume

Your resume, alive. An AI that answers questions about your career, deployed for free.

Visitors chat with an AI version of you. It knows your work history, speaks in your voice, and deflects off-topic questions. Built with vanilla HTML/CSS/JS, Groq (free tier), and Netlify (free tier). Zero framework, zero build step, $0/month.

## Set up with Claude Code — 30 minutes

**Requirements:** [Node.js 18+](https://nodejs.org/), a [Groq API key](https://console.groq.com/keys) (free), a [Netlify account](https://app.netlify.com) (free), [Netlify CLI](https://docs.netlify.com/cli/get-started/) (`npm i -g netlify-cli`)

### Step 1: Create your repo

Click **"Use this template"** on GitHub. Clone your new repo.

### Step 2: Open Claude Code and paste this

> Set up my AI resume. Walk me through: writing my resume, generating the AI personality, choosing a color palette, configuring the site, setting my Groq API key, testing locally, and deploying to Netlify. Take it step by step.

Claude Code reads the `CLAUDE.md` in this repo and becomes your setup wizard. It will:
- Ask about your career and write `resume.md`
- Generate `system-prompt.md` (the AI's personality and knowledge)
- Collect your name, palette choice, and domain
- Run `node setup.js` to apply your config
- Help you test locally and deploy

### Step 3: Done

Your AI resume is live. Share the URL.

## Set up manually — no Claude Code needed

```bash
git clone https://github.com/<you>/ai-resume.git && cd ai-resume && npm install
```

1. Edit `resume.md` with your career data
2. Edit `system-prompt.md` — replace "Alex Chen" / "Senior Product Designer" with your name and facts
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
  "auto_type_questions": ["what do you do?", "why should I hire you?", "what have you shipped?"]
}
```
4. Run `node setup.js`
5. Create `.env` with `GROQ_API_KEY=gsk_your_key_here`
6. Test: `netlify dev` → open http://localhost:8888
7. Deploy: `netlify login && netlify init && netlify env:set GROQ_API_KEY <key> && netlify deploy --prod`

## Palettes

| Palette | Description |
|---------|-------------|
| `midnight-gold` | Dark editorial with warm gold accents |
| `deep-ocean` | Navy depths with electric cyan highlights |
| `obsidian-rose` | Cool charcoal with dusty rose warmth |
| `slate-mint` | Cool slate with fresh mint energy |
| `custom` | Your own 5 hex colors — validated for WCAG AA contrast |

## How it works

```
resume.md → system-prompt.md → groqHandler.mjs → streaming AI responses
                                                        ↓
setup-config.json → setup.js → index.html ←──────── Chat UI
```

**index.html** — Single-file chat interface. Message bubbles, suggestion chips, streaming with cursor animation, mobile keyboard handling. Zero external dependencies.

**groqHandler.mjs** — Netlify serverless function. Reads your system prompt at cold start, streams responses via SSE. Cascades through 4 Groq models if one hits rate limits. Includes prompt injection filtering.

**setup.js** — Reads your config, replaces template placeholders across all files. Atomic writes, validates no placeholders remain. Re-runnable.

**palettes.js** — Color system with derived RGBA variants and WCAG AA contrast validation.

## Customization

| Change | Edit | Then |
|--------|------|------|
| Resume content | `resume.md` | Regenerate `system-prompt.md` |
| AI personality | `system-prompt.md` | Redeploy |
| Colors/name/domain | `setup-config.json` | Run `node setup.js`, redeploy |
| Custom palette | Add `"palette": "custom"` and `"custom_palette": {...}` to config | Run `node setup.js` |

## Running tests

```bash
npm run eval
```

10 behavioral tests: greeting tone, identity awareness, hiring signal (checks for metrics), off-topic deflection, prompt injection resistance, and follow-up context. Requires `.env` with `GROQ_API_KEY`.

## FAQ

**Cost?** $0/month. Groq free tier + Netlify free tier.

**Mobile?** Yes. iOS keyboard handling, safe area insets, 44px touch targets.

**Custom domain?** Yes. Set it up in Netlify, update `domain` in `setup-config.json`, re-run `node setup.js`, redeploy.

**Update resume?** Edit `resume.md`, regenerate `system-prompt.md`, `netlify deploy --prod`.

## License

MIT
