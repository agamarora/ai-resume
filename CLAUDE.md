# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Open-source template for an AI-powered interactive resume. Visitors chat with an AI that knows the user's career. Built on Groq (free tier) + Netlify (free tier) = $0/month hosting. The repo is also a Claude Code product: CLAUDE.md acts as a setup wizard when users clone the template.

See `PLAN.md` for the full implementation plan with 12 tasks, specs, and verification steps.

## Development

```bash
npm install                  # install groq-sdk (only dependency)
netlify dev                  # local dev server at localhost:8888
node setup.js                # apply setup-config.json to template files
node eval-prompt.mjs         # run 10-test behavioral eval suite (needs .env with GROQ_API_KEY)
```

Requires `.env` with `GROQ_API_KEY=gsk_...` for local dev and eval. The key is never in client code — groqHandler reads it from `process.env`.

## Architecture

The project has two pipelines that feed into one chat UI:

**Content pipeline** (runs once during setup, driven by Claude Code):
```
resume.md → [Claude Code generates] → system-prompt.md
```

**Config pipeline** (runs via `node setup.js`, re-runnable):
```
setup-config.json → setup.js → replaces {{PLACEHOLDERS}} in index.html + groqHandler.mjs
```

**Runtime** (every chat message):
```
index.html (SSE fetch) → groqHandler.mjs (reads system-prompt.md, streams via Groq) → SSE back to client
```

### Template Placeholder System

`index.html` and `groqHandler.mjs` contain `{{PLACEHOLDER}}` tokens (e.g. `{{CSS_BG}}`, `{{HERO_NAME}}`, `{{ALLOWED_ORIGINS}}`). `setup.js` reads these from `.template-backup/` (created on first run), applies all replacements in memory, validates no placeholders remain, then writes atomically. To re-run: edit `setup-config.json`, run `node setup.js` again. To reset: delete `.template-backup/` and run setup.js from git-clean templates.

### groqHandler.mjs — Model Cascade

The serverless function tries 4 Groq models in sequence: `llama-3.1-8b-instant` → `qwen/qwen3-32b` → `openai/gpt-oss-20b` → `llama-3.3-70b-versatile`. Continues on RateLimitError, BadRequestError, NotFoundError, APIConnectionTimeoutError. Stops on auth errors. System prompt is read from `system-prompt.md` via `fs.readFileSync` at module scope (cold-start cached, bundled via `netlify.toml` `included_files`).

### system-prompt.md Structure

Has two sections parsed by groqHandler: everything between `# System Prompt` and `## Reminder` becomes the system message; the `## Reminder` section is appended as a second system message after the user's input. Contains `{{NAME}}` and `{{TITLE}}` placeholders meant to be replaced by Claude Code (not setup.js) when generating from resume.md.

### Client-Side Streaming

`index.html` POSTs to `/.netlify/functions/groqHandler` with `{input, history}`. Reads SSE stream, renders with 30ms throttled DOM updates. Shows "still thinking..." after 5s of silence. 15s request timeout. Conversation history is in-memory (last 6 messages), cleared on reload.

## Key Constraints

- **Zero external runtime dependencies**: no CDN, no external scripts, everything inline in index.html
- **Mobile-first**: `100svh`, `font-size: 16px` on textarea (prevents iOS zoom), `visualViewport` listener, `env(safe-area-inset-*)`, passive scroll listeners
- **Samsung Internet CORS**: allows empty/missing Origin header (same-origin omits it)
- **Injection filter**: 4 regex patterns in groqHandler block prompt injection attempts; history messages are also filtered
- **200-char input limit, 100 max completion tokens**: keeps responses short, prevents abuse
- **4 palettes** defined in `palettes.js`: midnight-gold, deep-ocean, obsidian-rose, slate-mint. Each has 5 base colors; `derivePaletteVars()` generates all rgba variants and keyboard key shades. Custom palettes validated for WCAG AA contrast (4.5:1).

## Deploy

```bash
netlify login
netlify init                              # link to Netlify site
netlify env:set GROQ_API_KEY gsk_...      # set API key in production
netlify deploy --prod                     # deploy
```

API key must be set in BOTH `.env` (local) and Netlify env vars (production).

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
