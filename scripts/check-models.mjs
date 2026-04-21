import Groq from "groq-sdk";
import { readFileSync } from "fs";

const dotenv = readFileSync(".env", "utf8").toString();
const apiKey = (dotenv.match(/GROQ_API_KEY=(.+)/)?.[1]?.trim() || "").replace(/^["']|["']$/g, "");
if (!apiKey) {
  console.error("No GROQ_API_KEY in .env — cannot check models.");
  process.exit(1);
}

const handler = readFileSync("netlify/functions/groqHandler.mjs", "utf8");
const modelMatch = handler.match(/const MODELS\s*=\s*\[([\s\S]*?)\]/);
if (!modelMatch) {
  console.error("Could not parse MODELS array from netlify/functions/groqHandler.mjs.");
  process.exit(1);
}
const EXPECTED = [...modelMatch[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);

const groq = new Groq({ apiKey, maxRetries: 0, timeout: 15000 });

try {
  const { data } = await groq.models.list();
  const available = new Set(data.map((m) => m.id));
  const missing = EXPECTED.filter((id) => !available.has(id));
  console.log("Expected models (from groqHandler.mjs):");
  EXPECTED.forEach((id) => console.log(`  ${available.has(id) ? "✓" : "✗"} ${id}`));
  if (missing.length) {
    console.error(`\n${missing.length} model(s) missing from Groq API:`);
    missing.forEach((id) => console.error(`  - ${id}`));
    console.error("\nSuggested replacements (current available, sampled):");
    data.slice(0, 8).forEach((m) => console.error(`  - ${m.id}`));
    console.error("\nUpdate MODELS in netlify/functions/groqHandler.mjs and re-run `npm run check-models`.");
    process.exit(1);
  }
  console.log("\nAll cascade models are available.");
} catch (err) {
  console.error(`Failed to list Groq models: ${err.message}`);
  process.exit(1);
}
