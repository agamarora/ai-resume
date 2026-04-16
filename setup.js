#!/usr/bin/env node

// ai-resume setup script
// Reads setup-config.json, applies palette + name/URL replacements to template files.
// Atomic writes: all replacements happen in memory, validated, then written at once.

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "fs";
import { join } from "path";
import { palettes, derivePaletteVars, validateContrast } from "./palettes.js";

const TEMPLATE_FILES = ["index.html", "netlify/functions/groqHandler.mjs"];
const BACKUP_DIR = ".template-backup";

// --- Validation ---

function validate(config) {
  const errors = [];
  if (!config.name || typeof config.name !== "string" || config.name.length > 100)
    errors.push("name: required, max 100 chars");
  if (!config.palette || (config.palette !== "custom" && !palettes[config.palette]))
    errors.push(`palette: must be one of ${Object.keys(palettes).join(", ")} or "custom"`);
  if (!config.initials || !/^[a-z]{1,4}$/.test(config.initials))
    errors.push("initials: required, 1-4 lowercase letters");
  if (config.domain && /^https?:\/\//.test(config.domain))
    errors.push("domain: should not include protocol (just 'example.netlify.app')");
  if (config.palette === "custom") {
    const cp = config.custom_palette;
    if (!cp || !cp.bg || !cp.border || !cp.text || !cp.textDim || !cp.accent)
      errors.push("custom_palette: requires bg, border, text, textDim, accent hex values");
    else {
      const contrast = validateContrast(cp.text, cp.bg);
      if (!contrast.passes_aa)
        console.warn(`⚠ Custom palette contrast ratio ${contrast.ratio}:1 — below WCAG AA (4.5:1). Text may be hard to read.`);
    }
  }
  return errors;
}

// --- Escaping ---

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeJs(str) {
  return str.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$").replace(/<\/script>/gi, "<\\/script>");
}

// --- Main ---

try {
  // 1. Read config
  if (!existsSync("setup-config.json")) {
    console.error("❌ setup-config.json not found. Run Claude Code to generate it.");
    process.exit(1);
  }
  const config = JSON.parse(readFileSync("setup-config.json", "utf8"));

  // 2. Validate
  const errors = validate(config);
  if (errors.length) {
    console.error("❌ Config validation failed:");
    errors.forEach((e) => console.error(`   - ${e}`));
    process.exit(1);
  }

  // 3. Load palette
  const palette = config.palette === "custom" ? config.custom_palette : palettes[config.palette];
  const vars = derivePaletteVars(palette);

  // 4. Backup originals (first run only)
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
    mkdirSync(join(BACKUP_DIR, "netlify/functions"), { recursive: true });
    for (const file of TEMPLATE_FILES) {
      if (existsSync(file)) {
        copyFileSync(file, join(BACKUP_DIR, file));
      }
    }
    console.log("📦 Template backup created in .template-backup/");
  }

  // 5. Read templates (from backup if exists, otherwise current)
  const sources = {};
  for (const file of TEMPLATE_FILES) {
    const backupPath = join(BACKUP_DIR, file);
    sources[file] = readFileSync(existsSync(backupPath) ? backupPath : file, "utf8");
  }

  // 6. Build replacement map
  const name = config.name;
  const firstName = name.split(" ")[0];
  const domain = config.domain || "localhost:8888";
  const originUrl = domain.startsWith("localhost") ? `http://${domain}` : `https://${domain}`;

  const replacements = {
    "{{PAGE_TITLE}}": escapeHtml(`Chat with ${firstName}`),
    "{{META_DESCRIPTION}}": escapeHtml(config.meta_description || `Ask ${firstName}'s AI about their career.`),
    "{{OG_URL}}": escapeHtml(originUrl),
    "{{CSS_BG}}": palette.bg,
    "{{CSS_BORDER}}": palette.border,
    "{{CSS_TEXT}}": palette.text,
    "{{CSS_TEXT_DIM}}": palette.textDim,
    "{{CSS_ACCENT}}": palette.accent,
    "{{CSS_SURFACE}}": vars["--surface"],
    "{{RGBA_VARIANTS}}": Object.entries(vars)
      .filter(([k]) => k.startsWith("--accent-") || k.startsWith("--key-"))
      .map(([k, v]) => `${k}: ${v};`)
      .join("\n    "),
    "{{HERO_NAME}}": escapeHtml(name),
    "{{FIRST_NAME}}": escapeHtml(firstName),
    "{{MARK_INITIALS}}": escapeHtml(config.initials),
    "{{MARK_STROKE_COLOR}}": palette.text,
    "{{MARK_DOT_COLOR}}": palette.accent,
    "{{WELCOME_MESSAGE}}": escapeJs(config.welcome_message || `hey! ask me anything about ${firstName}'s career.`),
    "{{PLACEHOLDER_TEXT}}": escapeHtml(config.placeholder_text || `Ask me about ${firstName}...`),
    "{{AUTO_QUESTIONS_JSON}}": JSON.stringify(config.auto_type_questions || [
      `what does ${firstName} do?`,
      `why should I hire them?`,
      `what have they shipped?`,
    ]),
    "{{ALLOWED_ORIGINS}}": originUrl,
  };

  // 7. Apply replacements in memory
  const outputs = {};
  for (const file of TEMPLATE_FILES) {
    let content = sources[file];
    for (const [placeholder, value] of Object.entries(replacements)) {
      content = content.split(placeholder).join(value);
    }
    outputs[file] = content;
  }

  // 8. Validate no remaining placeholders
  let hasRemaining = false;
  for (const [file, content] of Object.entries(outputs)) {
    const remaining = content.match(/\{\{[A-Z_]+\}\}/g);
    if (remaining) {
      console.error(`❌ Unreplaced placeholders in ${file}: ${remaining.join(", ")}`);
      hasRemaining = true;
    }
  }
  if (hasRemaining) {
    console.error("Setup aborted. No files were modified.");
    process.exit(1);
  }

  // 9. Write all files atomically
  for (const [file, content] of Object.entries(outputs)) {
    writeFileSync(file, content, "utf8");
  }

  console.log(`\n✅ Setup complete!`);
  console.log(`   Name: ${name}`);
  console.log(`   Palette: ${config.palette === "custom" ? "Custom" : palettes[config.palette].name}`);
  console.log(`   Domain: ${domain}`);
  console.log(`\n   ✓ index.html updated`);
  console.log(`   ✓ groqHandler.mjs updated`);
  console.log(`\nNext: create .env with your GROQ_API_KEY, then run 'netlify dev' to test.`);
} catch (err) {
  console.error(`❌ Setup failed: ${err.message}`);
  process.exit(1);
}
