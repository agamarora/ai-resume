// Seed prompt eval — tests the paste prompt against a matrix of agent models.
// Each model gets the seed prompt as if a user pasted it, plus a meta-instruction
// to describe the plan instead of executing. A judge model grades each plan
// against a 10-dim rubric. Output: JSON + markdown scorecard in ./results.
//
// Usage:
//   node tests/seed-prompt-eval/run.mjs                      # all variants, all models
//   node tests/seed-prompt-eval/run.mjs --variant v1-sharpened
//   node tests/seed-prompt-eval/run.mjs --model llama-3.1-8b-instant
//
// Requires GROQ_API_KEY in .env.

import Groq from "groq-sdk";
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const VARIANTS_DIR = join(__dirname, "variants");
const RESULTS_DIR = join(__dirname, "results");

// Load .env
try {
  const env = readFileSync(join(ROOT, ".env"), "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

if (!process.env.GROQ_API_KEY) {
  console.error("Missing GROQ_API_KEY in .env");
  process.exit(1);
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Agent models under test — proxies for the spectrum of coding agents a user
// might have. Llama 8B = dumb-model floor (worst case agent). Llama 70B =
// competent mid-tier. Matches our production cascade; no reason to test against
// models we don't ship.
const AGENT_MODELS = [
  { id: "llama-3.1-8b-instant", tier: "dumb" },
  { id: "llama-3.3-70b-versatile", tier: "smart" },
];

// Judge model — needs to be strong enough to grade reliably
const JUDGE_MODEL = "llama-3.3-70b-versatile";

const args = process.argv.slice(2);
const variantFilter = args.includes("--variant") ? args[args.indexOf("--variant") + 1] : null;
const modelFilter = args.includes("--model") ? args[args.indexOf("--model") + 1] : null;

const META_INSTRUCTION = `
You are a coding agent operating on the user's laptop. The user has Node 18+, gh CLI, git, and netlify CLI installed. You have full shell access.

DO NOT EXECUTE anything. Instead, write out the complete plan you would follow, in this exact format:

## Understanding
(2-3 sentences: what is the user asking for? what are the hard constraints?)

## Ordered steps
1. <first thing I would do, with exact shell command if applicable>
2. <next thing, with command>
...
(Be concrete. Include actual shell commands you would run.)

## Files I would read before acting
- <path> — <why>

## What I would say to the user first
<the exact message you would send back — one paragraph>

## Risks I am watching for
- <risk 1>
- <risk 2>

Stop there. Do not actually run anything. Output plain text only (no JSON, no code blocks around the sections).
`;

const RUBRIC = [
  { id: "R1", weight: 3, name: "reads_claude_md_first",
    criterion: "Plan explicitly says it will read/open the repo's CLAUDE.md BEFORE running the wizard steps. This is the single most important check — without it, the agent is winging it." },
  { id: "R2", weight: 2, name: "uses_gh_template_correctly",
    criterion: "Plan uses `gh repo create --template agamarora/ai-resume` (NOT git clone, NOT fork). The command appears verbatim or near-verbatim in the ordered steps." },
  { id: "R3", weight: 2, name: "runs_preflight_doctor",
    criterion: "Plan includes `npm install` AND `npm run doctor` (or equivalent preflight check) BEFORE starting the wizard's resume/config steps." },
  { id: "R4", weight: 2, name: "asks_for_api_key_early",
    criterion: "Plan asks user for the Groq API key EARLY (before running any eval), validates the gsk_ prefix, and writes it to .env." },
  { id: "R5", weight: 2, name: "plans_resume_coaching_loop",
    criterion: "Plan describes a draft→critique→refine loop for the resume (not a one-shot write). Mentions critiquing for metrics / vague verbs / specificity." },
  { id: "R6", weight: 2, name: "plans_eval_loop_with_stop_conditions",
    criterion: "Plan runs `npm run eval` in a loop, makes targeted edits to system-prompt.md on failure, keeps a best-so-far snapshot, stops when tests pass OR no-improvement ceiling hit (NOT infinitely)." },
  { id: "R7", weight: 2, name: "sets_groq_key_in_both_places",
    criterion: "Plan sets GROQ_API_KEY in BOTH .env (local) AND Netlify env vars (production). Missing either place is a common bug." },
  { id: "R8", weight: 1, name: "handles_edge_cases",
    criterion: "Plan acknowledges at least one edge case: site-name collision on `netlify sites:create`, or re-running setup.js after domain changes, or what to do if doctor flags real problems." },
  { id: "R9", weight: 2, name: "avoids_fork_clone_language",
    criterion: "Plan does NOT use the words 'fork' or 'clone' when talking to the user (or when describing the setup). Uses 'create from template' or similar. Internal mentions of `git clone` inside gh commands are OK — this is about user-facing language." },
  { id: "R10", weight: 2, name: "degrades_gracefully_not_fabricated",
    criterion: "Plan does NOT fabricate file paths, commands, or features that aren't in the paste prompt. If unsure about a step, it says 'I will check CLAUDE.md' or 'I will ask the user' rather than inventing." },
];

const MAX_POINTS = RUBRIC.reduce((s, r) => s + r.weight * 2, 0); // each item 0/1/2

async function callWithBackoff(params, maxRetries = 5) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await groq.chat.completions.create(params);
    } catch (e) {
      const is429 = e.status === 429 || /429|rate limit/i.test(e.message || "");
      if (!is429 || attempt === maxRetries) throw e;
      const retryAfter = Number(e.headers?.["retry-after"]) || 0;
      const wait = retryAfter > 0 ? retryAfter * 1000 : Math.min(60000, 2000 * 2 ** attempt);
      process.stdout.write(` [429, waiting ${Math.round(wait/1000)}s]`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

async function getPlan(seedPrompt, model) {
  const res = await callWithBackoff({
    model,
    messages: [
      { role: "system", content: META_INSTRUCTION.trim() },
      { role: "user", content: seedPrompt },
    ],
    temperature: 0.2,
    max_tokens: 2500,
  });
  return res.choices[0].message.content;
}

async function judge(seedPrompt, plan) {
  const rubricText = RUBRIC.map(r => `${r.id} (${r.name}, weight ${r.weight}): ${r.criterion}`).join("\n");
  const sys = `You are a strict evaluator grading a coding agent's execution plan.

For each rubric item, score:
- 2 (FULL): plan clearly and explicitly meets the criterion
- 1 (PARTIAL): plan partially meets it (mentioned but vague, or implied but not explicit)
- 0 (FAIL): plan does not meet it, contradicts it, or omits it entirely

Be strict. Implied ≠ explicit. If the plan doesn't mention CLAUDE.md by name for R1, that's at best PARTIAL.

Output ONLY valid JSON, no prose, no code fences, in this exact schema:
{
  "scores": [
    {"id": "R1", "score": 0|1|2, "evidence": "one-line quote or paraphrase from the plan"},
    ...
  ],
  "overall_note": "one sentence on the biggest weakness"
}`;
  const user = `RUBRIC:\n${rubricText}\n\n---\nORIGINAL USER PROMPT:\n${seedPrompt}\n\n---\nAGENT'S PLAN:\n${plan}\n\n---\nGrade every rubric item. Output JSON only.`;
  const res = await callWithBackoff({
    model: JUDGE_MODEL,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    temperature: 0,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });
  return JSON.parse(res.choices[0].message.content);
}

function tallyScore(judgeResult) {
  let total = 0;
  const byItem = {};
  for (const s of judgeResult.scores) {
    const rubric = RUBRIC.find(r => r.id === s.id);
    if (!rubric) continue;
    const pts = s.score * rubric.weight;
    total += pts;
    byItem[s.id] = { score: s.score, points: pts, max: rubric.weight * 2, evidence: s.evidence };
  }
  return { total, max: MAX_POINTS, pct: Math.round((total / MAX_POINTS) * 1000) / 10, byItem };
}

async function evalOne(variantName, seedPrompt, modelSpec) {
  process.stdout.write(`  [${modelSpec.tier.padEnd(9)}] ${modelSpec.id.padEnd(35)}`);
  const t0 = Date.now();
  let plan, judged, error;
  try {
    plan = await getPlan(seedPrompt, modelSpec.id);
    judged = await judge(seedPrompt, plan);
  } catch (e) {
    error = e.message;
    console.log(` ERROR: ${e.message.slice(0, 80)}`);
    return { variantName, model: modelSpec.id, tier: modelSpec.tier, error };
  }
  const tally = tallyScore(judged);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  ${tally.total}/${tally.max} (${tally.pct}%)  [${elapsed}s]`);
  return {
    variantName,
    model: modelSpec.id,
    tier: modelSpec.tier,
    plan,
    judgement: judged,
    tally,
    elapsed_s: Number(elapsed),
  };
}

async function main() {
  mkdirSync(RESULTS_DIR, { recursive: true });

  const variants = readdirSync(VARIANTS_DIR)
    .filter(f => f.endsWith(".txt"))
    .filter(f => !variantFilter || f.includes(variantFilter))
    .sort();

  const models = AGENT_MODELS.filter(m => !modelFilter || m.id === modelFilter);

  console.log(`Seed prompt eval — ${variants.length} variants × ${models.length} models\n`);
  console.log(`Rubric max: ${MAX_POINTS} points. Judge: ${JUDGE_MODEL}\n`);

  const runs = [];
  for (const variantFile of variants) {
    const variantName = variantFile.replace(/\.txt$/, "");
    const seedPrompt = readFileSync(join(VARIANTS_DIR, variantFile), "utf8");
    console.log(`== ${variantName} ==`);
    for (const model of models) {
      const result = await evalOne(variantName, seedPrompt, model);
      runs.push(result);
    }
    console.log("");
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const jsonPath = join(RESULTS_DIR, `run-${timestamp}.json`);
  writeFileSync(jsonPath, JSON.stringify({ timestamp, judge: JUDGE_MODEL, max_points: MAX_POINTS, rubric: RUBRIC, runs }, null, 2));

  const summary = summarize(runs);
  const mdPath = join(RESULTS_DIR, `run-${timestamp}.md`);
  writeFileSync(mdPath, summary);

  console.log("\n" + summary);
  console.log(`\nResults → ${jsonPath}\n            ${mdPath}`);
}

function summarize(runs) {
  const variants = [...new Set(runs.map(r => r.variantName))];
  const models = [...new Set(runs.map(r => r.model))];
  let md = `# Seed Prompt Eval — ${new Date().toISOString().slice(0, 10)}\n\n`;
  md += `## Scoreboard\n\n`;
  md += `| Variant | ` + models.map(m => m.replace(/^.*\//, "").replace("-instant","").replace("-versatile","")).join(" | ") + " | avg |\n";
  md += `|---|` + models.map(() => "---").join("|") + "|---|\n";
  for (const v of variants) {
    const row = [v];
    let sum = 0, count = 0;
    for (const m of models) {
      const run = runs.find(r => r.variantName === v && r.model === m);
      if (run?.error) row.push("ERR");
      else if (run?.tally) { row.push(`${run.tally.total}/${run.tally.max} (${run.tally.pct}%)`); sum += run.tally.pct; count++; }
      else row.push("-");
    }
    row.push(count ? `${(sum / count).toFixed(1)}%` : "-");
    md += `| ${row.join(" | ")} |\n`;
  }
  md += `\n## Per-rubric breakdown (avg score 0-2 across all models)\n\n`;
  md += `| Rubric | ${variants.join(" | ")} |\n|---|${variants.map(() => "---").join("|")}|\n`;
  for (const r of RUBRIC) {
    const cols = [`${r.id} ${r.name}`];
    for (const v of variants) {
      const vRuns = runs.filter(run => run.variantName === v && run.tally);
      if (!vRuns.length) { cols.push("-"); continue; }
      const avg = vRuns.reduce((s, run) => s + run.tally.byItem[r.id].score, 0) / vRuns.length;
      cols.push(avg.toFixed(2));
    }
    md += `| ${cols.join(" | ")} |\n`;
  }
  md += `\n## Lowest-scoring items per variant (target for next iteration)\n\n`;
  for (const v of variants) {
    md += `### ${v}\n`;
    const vRuns = runs.filter(run => run.variantName === v && run.tally);
    if (!vRuns.length) { md += `(no runs)\n\n`; continue; }
    const itemAvgs = RUBRIC.map(r => ({
      id: r.id, name: r.name,
      avg: vRuns.reduce((s, run) => s + run.tally.byItem[r.id].score, 0) / vRuns.length,
    })).sort((a, b) => a.avg - b.avg).slice(0, 3);
    for (const it of itemAvgs) md += `- ${it.id} ${it.name}: ${it.avg.toFixed(2)}/2\n`;
    md += `\n`;
  }
  return md;
}

main().catch(e => { console.error(e); process.exit(1); });
