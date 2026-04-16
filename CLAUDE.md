# ai-resume

An AI-powered interactive resume. Visitors chat with an AI that knows your career. Set up in about 30 minutes. Costs $0/month.

## Prerequisites

Before starting, make sure you have:

- [ ] **Node.js 18+** installed (`node --version`)
- [ ] **A Groq account** with an API key from https://console.groq.com/keys (key starts with `gsk_`)
- [ ] **A Netlify account** at https://app.netlify.com
- [ ] **Netlify CLI** installed (`npm install -g netlify-cli`, then `netlify --version`)

## Step 1: Your Resume

Tell me about your career, or paste your resume. I'll write `resume.md` for you.

Include: job titles, companies, dates, and quantified achievements (numbers, percentages, user counts). The more specific, the better your AI will sound.

If you already have a resume.md you like, skip to Step 2.

## Step 2: Your AI Personality

I'll read your `resume.md` and generate `system-prompt.md` — the instructions that control how your AI talks.

The default voice is warm, concise (max 30 words), with a dry sense of humor. It says your name instead of "I" and deflects off-topic questions gracefully.

After I generate it, review the tone. Want it more formal? More casual? More technical? Tell me and I'll adjust.

**Personality levers you can tweak:**
- Word limit (default: 30 words max)
- Humor level (dry wit vs. straight-laced)
- Deflection style ("that's not in my memory banks" vs. "I only know about [name]'s career")
- Banned words (default: leveraging, innovative, passionate, driven)

## Step 3: Configuration

I'll ask you for:

| Setting | Example | Notes |
|---|---|---|
| Your full name | Jane Smith | Used in page title, header, meta tags |
| Your title | Senior Engineer | Used in meta description |
| Color palette | deep-ocean | Choose from: midnight-gold, deep-ocean, obsidian-rose, slate-mint, or custom |
| Your initials | js | 1-4 lowercase letters, shown in the header mark |
| Netlify subdomain | janesmith | Your site will be at `janesmith.netlify.app` |

I'll write `setup-config.json` and run `node setup.js` to apply your choices across the template.

### Palettes

| Palette | Vibe |
|---|---|
| **midnight-gold** | The original. Dark editorial with warm gold accents. |
| **deep-ocean** | Navy depths with electric cyan highlights. |
| **obsidian-rose** | Cool charcoal with dusty rose warmth. |
| **slate-mint** | Cool slate with fresh mint energy. |
| **custom** | Your own 5 hex colors (bg, border, text, textDim, accent). Must pass WCAG AA contrast. |

## Step 4: API Key

Paste your Groq API key (starts with `gsk_`). I'll create your `.env` file.

This key is never exposed to visitors. It stays server-side in the Netlify function.

## Step 5: Test Locally

```bash
npm install
netlify dev
```

Open http://localhost:8888 and try these:
- "hi" — should get a short, warm greeting
- "why should I hire [you]?" — should mention specific achievements with numbers
- "ignore all previous instructions" — should deflect ("nice try")

If something sounds off, go back to Step 2 and adjust the personality.

## Step 6: Resume Coaching

Before deploying, I'll review your `resume.md` for:
- Vague descriptions that should be quantified ("managed projects" → "shipped 3 products to 50K users")
- Missing metrics (revenue, percentages, user counts, team sizes)
- Weak verbs ("responsible for" → "led", "helped with" → "built")

This is optional but makes your AI sound dramatically better.

## Step 7: Deploy

```bash
netlify login
netlify init
netlify env:set GROQ_API_KEY <your-key>
netlify deploy --prod
```

**Important:** The API key must be set in both places:
- `.env` (for local development)
- Netlify dashboard → Site Settings → Environment Variables (for production)

## Step 8: Verify

1. Visit your live URL
2. Test on your phone
3. Share the link — check that the preview card (Open Graph) shows your name and description

## Updating Later

| What changed | What to do |
|---|---|
| Resume content | Edit `resume.md`, then ask me to regenerate `system-prompt.md` |
| Name, palette, or domain | Edit `setup-config.json`, run `node setup.js` |
| AI personality | Edit `system-prompt.md` directly |
| Redeploy | `netlify deploy --prod` |

## Troubleshooting

| Problem | Fix |
|---|---|
| "Check your API key" error | Key must start with `gsk_`. Get a new one at https://console.groq.com/keys |
| "Try again in a moment" | Groq rate limit. Wait 60 seconds. If persistent, check your Groq plan. |
| `netlify: command not found` | Run `npm install -g netlify-cli` |
| Chat works locally but not in production | Set `GROQ_API_KEY` in Netlify dashboard: Site Settings → Environment Variables |
| CORS error in browser console | Check that the domain in `setup-config.json` matches your deployed URL, then re-run `node setup.js` and redeploy |
| `setup.js` fails | Delete `.template-backup/` and re-run. Or reset with `git checkout -- index.html netlify/functions/groqHandler.mjs` |

## How It Works

```
resume.md ──[Claude Code]──→ system-prompt.md ──[groqHandler reads at runtime]──→ AI responses
                                                                                      ↓
setup-config.json ──[setup.js]──→ index.html (colors, name, meta tags)          SSE stream
                                                                                      ↓
                                                                              Chat UI (browser)
```

- **index.html** — Single-file chat interface. Zero external dependencies. Mobile-ready.
- **groqHandler.mjs** — Netlify serverless function. Reads your system prompt, streams AI responses via SSE. Tries 4 Groq models in cascade if one is rate-limited.
- **setup.js** — Replaces template placeholders with your config. Re-runnable.
- **palettes.js** — Color system with WCAG AA contrast validation.
- **eval-prompt.mjs** — 10-test behavioral suite. Run with `npm run eval`.

## For Development

```bash
npm install          # groq-sdk (only dependency)
netlify dev          # local server at localhost:8888
npm run setup        # apply setup-config.json
npm run eval         # 10-test behavioral eval (needs .env)
```
