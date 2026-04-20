# TODOS

Captured follow-ups that aren't blocking current work.

## Template product improvements

These sharpen the "public template that works for other people" experience. The current wizard does a one-shot setup; these upgrades turn the setup agent into a coach that iterates until the output is good.

### 1. Coach the agent to refine resume + prompt, not just write them
The CLAUDE.md wizard tells Claude Code to generate `resume.md` and `system-prompt.md` in one pass. For most users this produces a decent-but-generic result. Upgrade to a two-pass flow:
- **Pass 1** — draft: wizard writes the first version from the user's raw input.
- **Pass 2** — critique: wizard reads the draft back, flags vague bullets, missing metrics, weak verbs, bland persona lines. Proposes specific improvements.
- **Pass 3** — refine: user accepts or modifies suggestions. Wizard rewrites.

Same agent, three turns. Repeat until user says "ship it." This is how a human ghostwriter works, not a form-filler.

### 2. Generate user-specific eval cases
The current eval harness has 12 fixed behavioral tests ("hi", "why should I hire them?", etc.). These work for any resume but miss career-specific failure modes. After the user's `setup-config.json` exists, the wizard should generate ~5 extra eval cases tailored to their career — questions a real recruiter would ask. Example: if highlights mention "voice AI", a test case could be "what's his voice AI stack?" and check the answer mentions a real technology from `resume.md`.

These generated cases get merged into `eval-prompt.mjs` (or a separate `eval-custom.mjs`) and become part of the pre-deploy check.

### 3. Run evals in a loop, not once
Today's wizard runs `npm run eval` once at step 6 (manual test) — if anything fails, the user is on their own to interpret and fix. Upgrade: wizard runs eval → reads failures → proposes specific edits to `system-prompt.md` (stronger injection deflection, word cap reminders, card-rule clarifications, etc.) → applies them → reruns → iterates until all 12 pass or user hits "skip."

This is the actual AI-coding-fluent workflow the project preaches. Practice what we preach.

### 4. Default out-of-the-box prompts must pass all 12 tests on first setup
Today the default `system-prompt.md` template yielded 8/12 on first setup for Agam's config. That's an unacceptable starting point for a template — the "how good does this get" bar is set by the default. The stronger deflection rules added in `68e6120+` bumped that to 9/12 for Agam, but the template's default should ship a starting prompt that passes all 12 generic tests for any reasonable resume.

**Action:** Before any public template promotion, lock the default `system-prompt.md` template shape such that a fresh setup with any config passes 12/12 on the generic eval. Track regressions.

---

## Known issues (smaller, do later)

- **Fresh-clone template was validated with a simulated config swap, not a real clone-and-setup loop.** At some point actually click "Use this template" on GitHub, clone the fresh repo, go through CLAUDE.md with a throwaway persona, confirm the whole dance works. Should take 15 minutes.
- **Real-device mobile testing.** Samsung Internet + Firefox Android aren't in my test loop.
- **Demo GIF for README.** Record once the site is in a state worth showing off.
- **Landing page on agamarora.com (Task 10).** Separate repo.
- **User validation with 5-10 people (Task 12).** Post-public launch.
- **Custom domain for demo.** E.g., `ai-resume.agamarora.com`. Polish.

## Known issues (tiny, track for pattern)

- **HIRE eval "NO NUMBERS" still flags** as of `68e6120+`. Agam's stronger-deflection prompt produces narrative-without-metric answers. Fix requires coaching the model to always quote a concrete metric in hire questions. Candidate: add to system-prompt.md: "When asked 'why hire', lead with ONE specific metric from the highlights."
- **CARDS-LIST eval hit rate-limit 429** once. Not a regression, just token budget. Eval should probably add a small delay between requests.
