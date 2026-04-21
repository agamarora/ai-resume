import { readFileSync, writeFileSync } from "fs";

const PROMPT_FILE = "templates/paste-prompt.txt";
const README = "README.md";
const BEGIN = "<!-- BEGIN:PASTE_PROMPT -->";
const END = "<!-- END:PASTE_PROMPT -->";

const prompt = readFileSync(PROMPT_FILE, "utf8").trimEnd();
const readme = readFileSync(README, "utf8");

const beginIdx = readme.indexOf(BEGIN);
const endIdx = readme.indexOf(END);
if (beginIdx === -1 || endIdx === -1 || endIdx < beginIdx) {
  console.error(`README.md is missing ${BEGIN} ... ${END} markers around the paste prompt block.`);
  process.exit(1);
}

const before = readme.slice(0, beginIdx + BEGIN.length);
const after = readme.slice(endIdx);
const block = "\n\n```text\n" + prompt + "\n```\n\n";
const next = before + block + after;

if (next === readme) {
  console.log("README.md paste-prompt already in sync.");
} else {
  writeFileSync(README, next, "utf8");
  console.log(`README.md paste-prompt synced from ${PROMPT_FILE}.`);
}
