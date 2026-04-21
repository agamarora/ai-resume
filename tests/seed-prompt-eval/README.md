# Seed Prompt Eval

Tests the paste prompt in `templates/paste-prompt.txt` against a matrix of coding-agent
proxies. Each model receives the seed prompt plus a meta-instruction to **plan, not execute**.
A judge model grades each plan against a 10-item weighted rubric (max 40 points).

## Why

The paste prompt is the first thing every user's agent sees. A strong agent (Claude Opus,
GPT-5) will fill in gaps. A weak agent (Llama 8B) will do exactly what the prompt says —
and skip anything it doesn't. This eval quantifies how robust the prompt is to the floor
case so we don't ship a prompt that only works with expensive agents.

## Run

```bash
npm run eval-seed-prompt              # all variants × all models
node tests/seed-prompt-eval/run.mjs --variant v1-sharpened
node tests/seed-prompt-eval/run.mjs --model llama-3.1-8b-instant
```

Requires `GROQ_API_KEY` in `.env`. Each full run is ~8 Groq calls (2 variants × 2 models × [1 plan + 1 judge]).

## Layout

- `variants/*.txt` — candidate seed prompts. `v0-current.txt` = control (what shipped before). Add new variants as `v2-*.txt`, `v3-*.txt`.
- `run.mjs` — harness.
- `results/*.json` + `*.md` — one pair per run, timestamped. `baseline-*.md` = reference scores.

## Adding a rubric dimension

Edit `RUBRIC` in `run.mjs`. Each item has `id`, `weight`, `name`, and a `criterion` the
judge sees. Scored 0 (fail) / 1 (partial) / 2 (full), multiplied by weight. Keep weights
proportional to real-world breakage risk — e.g. `reads_claude_md_first` is weight 3
because skipping it cascades into every other failure.

## Shipped winner

`v1-sharpened` — 97.5% avg across Llama 8B + 70B. See `results/baseline-2026-04-21.md`.
