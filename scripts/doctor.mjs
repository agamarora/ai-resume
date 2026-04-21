import { existsSync, readFileSync, statSync } from "fs";
import { execSync } from "child_process";

const rows = [];
function row(name, status, detail) { rows.push({ name, status, detail }); }

const nodeMajor = Number(process.versions.node.split(".")[0]);
row("Node >= 18", nodeMajor >= 18 ? "OK" : "FAIL", `found ${process.versions.node}`);

try {
  const netlifyVer = execSync("netlify --version", { stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" }).trim();
  row("netlify CLI", "OK", netlifyVer);
} catch {
  row("netlify CLI", "WARN", "not installed — run `npm install -g netlify-cli` when deploying");
}

if (existsSync(".env")) {
  const env = readFileSync(".env", "utf8");
  const key = (env.match(/GROQ_API_KEY=(.+)/)?.[1]?.trim() || "").replace(/^["']|["']$/g, "");
  if (!key) row(".env GROQ_API_KEY", "FAIL", "line missing or empty");
  else if (!/^gsk_[A-Za-z0-9]+$/.test(key)) row(".env GROQ_API_KEY", "FAIL", "must start with gsk_ and contain no quotes/spaces");
  else row(".env GROQ_API_KEY", "OK", `${key.slice(0, 6)}…${key.slice(-4)}`);
} else {
  row(".env", "FAIL", "missing — create it with GROQ_API_KEY=gsk_...");
}

if (existsSync("setup-config.json")) {
  try {
    const cfg = JSON.parse(readFileSync("setup-config.json", "utf8"));
    const missing = ["name", "palette", "initials"].filter((k) => !cfg[k]);
    const welcomes = cfg.resume?.welcome_highlights?.length || 0;
    const fulls = cfg.resume?.full_highlights?.length || 0;
    if (missing.length) row("setup-config.json", "FAIL", `missing: ${missing.join(", ")}`);
    else if (welcomes < 2) row("setup-config.json", "WARN", `only ${welcomes} welcome_highlights (recommend 2-4)`);
    else if (fulls < 4) row("setup-config.json", "WARN", `only ${fulls} full_highlights (recommend 4-16)`);
    else row("setup-config.json", "OK", `${welcomes} welcome, ${fulls} full`);
  } catch (e) {
    row("setup-config.json", "FAIL", `unreadable: ${e.message}`);
  }
} else {
  row("setup-config.json", "FAIL", "missing — wizard did not write it");
}

if (existsSync("templates/system-prompt.md")) row("templates/system-prompt.md", "OK", "present");
else row("templates/system-prompt.md", "FAIL", "missing — re-run `git pull` or check repo integrity");

if (existsSync("system-prompt.md")) {
  const sp = readFileSync("system-prompt.md", "utf8");
  const hasBegin = sp.includes("<!-- BEGIN:FULL_HIGHLIGHTS -->");
  const hasEnd = sp.includes("<!-- END:FULL_HIGHLIGHTS -->");
  if (hasBegin && hasEnd) row("system-prompt.md markers", "OK", "BEGIN/END present");
  else row("system-prompt.md markers", "FAIL", "missing BEGIN/END FULL_HIGHLIGHTS markers — setup.js cannot sync");
} else {
  row("system-prompt.md", "WARN", "missing — wizard step 2 not yet complete");
}

if (existsSync("resume.md")) {
  const body = readFileSync("resume.md", "utf8");
  const leaks = [];
  // US phone: require at least one separator OR parens — avoids "500-user", "10-year".
  if (/(?:\(\d{3}\)[\s.\-]?\d{3}[\s.\-]?\d{4}|\b\d{3}[.\-\s]\d{3}[.\-\s]\d{4}\b)/.test(body)) leaks.push("US phone number");
  const emails = body.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
  let configuredEmail = "";
  try { configuredEmail = JSON.parse(readFileSync("setup-config.json", "utf8")).resume?.links?.email || ""; } catch {}
  const stray = emails.filter((e) => e.toLowerCase() !== configuredEmail.toLowerCase());
  if (stray.length) leaks.push(`${stray.length} email(s) not in setup-config.json`);
  if (/gsk_[A-Za-z0-9]{20,}/.test(body)) leaks.push("Groq API key pattern");
  if (leaks.length) row("resume.md privacy", "WARN", leaks.join("; ") + " — resume.md is gitignored by default, keep it that way");
  else row("resume.md privacy", "OK", `${statSync("resume.md").size} bytes, no obvious leaks`);
} else {
  row("resume.md", "WARN", "missing — wizard step 1 not yet complete");
}

try {
  const gi = readFileSync(".gitignore", "utf8");
  const required = ["resume.md", "setup-config.json", ".env"];
  const missing = required.filter((x) => !gi.split(/\r?\n/).includes(x));
  if (missing.length) row(".gitignore coverage", "FAIL", `should list: ${missing.join(", ")}`);
  else row(".gitignore coverage", "OK", "resume.md + setup-config.json + .env ignored");
} catch {
  row(".gitignore", "WARN", "not readable");
}

console.log("\nai-resume doctor\n");
const pad = Math.max(...rows.map((r) => r.name.length));
for (const r of rows) {
  const icon = r.status === "OK" ? "✓" : r.status === "WARN" ? "⚠" : "✗";
  console.log(`  ${icon} ${r.name.padEnd(pad)}  ${r.detail}`);
}
const fails = rows.filter((r) => r.status === "FAIL").length;
const warns = rows.filter((r) => r.status === "WARN").length;
console.log(`\n  ${fails} fail, ${warns} warn`);
process.exit(fails > 0 ? 1 : 0);
