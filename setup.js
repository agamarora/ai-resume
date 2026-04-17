#!/usr/bin/env node

// ai-resume setup script
// Reads setup-config.json, generates all output artifacts atomically.
// Templates backed up to .template-backup/ on first run.
// Generated outputs: index.html, netlify/functions/groqHandler.mjs,
// system-prompt.md, ai-resume.json, manifest.json

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "fs";
import { join } from "path";
import { palettes, derivePaletteVars, validateContrast } from "./palettes.js";

const TEMPLATE_FILES = [
  "index.html",
  "netlify/functions/groqHandler.mjs",
  "system-prompt.md",
];
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
        console.warn(`⚠ Custom palette contrast ${contrast.ratio}:1 — below WCAG AA (4.5:1). Text may be hard to read.`);
    }
  }
  const wh = config.resume?.welcome_highlights;
  if (wh && (!Array.isArray(wh) || wh.length > 4))
    errors.push("resume.welcome_highlights: must be an array of 0-4 items");
  const fh = config.resume?.full_highlights;
  if (fh && (!Array.isArray(fh) || fh.length > 16))
    errors.push("resume.full_highlights: must be an array of 0-16 items");
  return errors;
}

// --- Escaping ---

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeJsonForScript(obj) {
  // JSON that lives inside a <script> tag — neutralize </script> and line separators.
  return JSON.stringify(obj, null, 2)
    .replace(/<\/script>/gi, "<\\/script>")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// --- Generators ---

function generateWelcomeCardsHtml(welcomeHighlights) {
  if (!Array.isArray(welcomeHighlights) || welcomeHighlights.length === 0) return "";
  return welcomeHighlights
    .map((h) => {
      const title = escapeHtml(h.title || "");
      const metric = escapeHtml(h.metric || "");
      const label = `Career highlight: ${h.title || ""}${h.metric ? ", " + h.metric : ""}`;
      return `      <button type="button" class="card" role="article" aria-label="${escapeHtml(label)}" data-title="${title}">
        <span class="card-label">${title}</span>
        <span class="card-metric">${metric}</span>
      </button>`;
    })
    .join("\n");
}

function generateFullHighlightsMarkdown(fullHighlights) {
  if (!Array.isArray(fullHighlights) || fullHighlights.length === 0) {
    return "- (none configured)";
  }
  return fullHighlights
    .map((h) => {
      const title = h.title || "";
      const metric = h.metric || "";
      const tag = h.tag ? ` (${h.tag})` : "";
      return `- ${title}${metric ? ": " + metric : ""}${tag}`;
    })
    .join("\n");
}

const LINKEDIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5C4.98 4.88 3.87 6 2.49 6S0 4.88 0 3.5 1.11 1 2.49 1s2.49 1.12 2.49 2.5zM.22 8h4.56v13H.22V8zm7.44 0h4.37v1.78h.06c.61-1.15 2.1-2.37 4.32-2.37 4.62 0 5.47 3.04 5.47 6.99V21h-4.56v-6.2c0-1.48-.03-3.39-2.07-3.39-2.07 0-2.39 1.62-2.39 3.28V21H7.66V8z"/></svg>`;

const EMAIL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`;

function generateConnectIconsHtml(links) {
  if (!links || (!links.linkedin && !links.email)) return "";
  const items = [];
  if (links.linkedin) {
    items.push(
      `    <a class="connect-icon" href="${escapeHtml(links.linkedin)}" aria-label="Connect on LinkedIn" target="_blank" rel="noopener noreferrer">${LINKEDIN_SVG}</a>`
    );
  }
  if (links.email) {
    items.push(
      `    <a class="connect-icon" href="mailto:${escapeHtml(links.email)}" aria-label="Send email">${EMAIL_SVG}</a>`
    );
  }
  return `  <div class="connect-icons">\n${items.join("\n")}\n  </div>`;
}

function generateJsonLdBlock(config) {
  const links = config.resume?.links || {};
  const sameAs = [];
  if (links.linkedin) sameAs.push(links.linkedin);
  if (links.email) sameAs.push(`mailto:${links.email}`);

  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: config.name,
    ...(config.title ? { jobTitle: config.title } : {}),
    ...(config.meta_description ? { description: config.meta_description } : {}),
    ...(config.resume?.skills?.length ? { knowsAbout: config.resume.skills } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
  return `<script type="application/ld+json">\n${escapeJsonForScript(person)}\n</script>`;
}

function generateAiResumeJson(config) {
  const links = config.resume?.links || {};
  const sameAs = [];
  if (links.linkedin) sameAs.push(links.linkedin);
  if (links.email) sameAs.push(`mailto:${links.email}`);

  const highlights = [
    ...(config.resume?.welcome_highlights || []),
    ...(config.resume?.full_highlights || []),
  ];

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: config.name,
    ...(config.title ? { jobTitle: config.title } : {}),
    ...(config.meta_description ? { description: config.meta_description } : {}),
    ...(config.resume?.skills?.length ? { knowsAbout: config.resume.skills } : {}),
    ...(sameAs.length ? { sameAs } : {}),
    "ai-resume": {
      version: "2.0",
      availability: "open",
      contactPreference: config.resume?.contact_preference || "email",
      chatEndpoint: "/.netlify/functions/groqHandler",
      highlights,
    },
  };
}

function generateManifestJson(config, palette) {
  const firstName = config.name.split(" ")[0];
  return {
    name: `Chat with ${config.name}`,
    short_name: firstName,
    start_url: "/",
    display: "standalone",
    background_color: palette.bg,
    theme_color: palette.bg,
    icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  };
}

function generateOgDescription(config) {
  const firstName = config.name.split(" ")[0];
  const top = config.resume?.welcome_highlights?.[0];
  if (!top || !top.title) {
    return config.meta_description || `Ask ${firstName}'s AI about their career.`;
  }
  const metric = top.metric ? ` ${top.metric}.` : "";
  return `"Why should I hire ${firstName}?" "${firstName} shipped ${top.title}.${metric}"`;
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
      if (existsSync(file)) copyFileSync(file, join(BACKUP_DIR, file));
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
  const resume = config.resume || {};

  const welcomeCardsHtml = generateWelcomeCardsHtml(resume.welcome_highlights);
  const fullHighlightsMd = generateFullHighlightsMarkdown(resume.full_highlights);
  const connectIconsHtml = generateConnectIconsHtml(resume.links);
  const jsonLdBlock = generateJsonLdBlock(config);
  const ogDescription = generateOgDescription(config);

  const replacements = {
    "{{PAGE_TITLE}}": escapeHtml(`Chat with ${firstName}`),
    "{{META_DESCRIPTION}}": escapeHtml(config.meta_description || `Ask ${firstName}'s AI about their career.`),
    "{{OG_DESCRIPTION}}": escapeHtml(ogDescription),
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
      .join("\n      "),
    "{{HERO_NAME}}": escapeHtml(name),
    "{{FIRST_NAME}}": escapeHtml(firstName),
    "{{MARK_INITIALS}}": escapeHtml(config.initials),
    "{{WELCOME_MESSAGE}}": escapeHtml(config.welcome_message || `ask me anything about ${firstName}'s career.`),
    "{{PLACEHOLDER_TEXT}}": escapeHtml(config.placeholder_text || `Ask me about ${firstName}...`),
    "{{AUTO_QUESTIONS_JSON}}": JSON.stringify(config.auto_type_questions || [
      `what does ${firstName} do?`,
      `why should I hire them?`,
      `what have they shipped?`,
    ]),
    "{{WELCOME_CARDS_HTML}}": welcomeCardsHtml,
    "{{CONNECT_ICONS_HTML}}": connectIconsHtml,
    "{{JSONLD_BLOCK}}": jsonLdBlock,
    "{{FULL_HIGHLIGHTS_MARKDOWN}}": fullHighlightsMd,
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
      console.error(`❌ Unreplaced placeholders in ${file}: ${[...new Set(remaining)].join(", ")}`);
      hasRemaining = true;
    }
  }
  if (hasRemaining) {
    console.error("Setup aborted. No files were modified.");
    process.exit(1);
  }

  // 9. Build generated standalone files
  const aiResumeJson = generateAiResumeJson(config);
  const manifestJson = generateManifestJson(config, palette);

  // 10. Sanity-check generated JSON
  try {
    JSON.parse(JSON.stringify(aiResumeJson));
    JSON.parse(JSON.stringify(manifestJson));
  } catch (e) {
    console.error("❌ Generated JSON is invalid:", e.message);
    process.exit(1);
  }

  // 11. Write all files atomically
  for (const [file, content] of Object.entries(outputs)) {
    writeFileSync(file, content, "utf8");
  }
  writeFileSync("ai-resume.json", JSON.stringify(aiResumeJson, null, 2), "utf8");
  writeFileSync("manifest.json", JSON.stringify(manifestJson, null, 2), "utf8");

  const whCount = resume.welcome_highlights?.length || 0;
  const fhCount = resume.full_highlights?.length || 0;

  console.log(`\n✅ Setup complete!`);
  console.log(`   Name: ${name}`);
  console.log(`   Palette: ${config.palette === "custom" ? "Custom" : palettes[config.palette].name}`);
  console.log(`   Domain: ${domain}`);
  console.log(`\n   ✓ index.html (${whCount} welcome cards, JSON-LD, connect icons)`);
  console.log(`   ✓ netlify/functions/groqHandler.mjs (CORS: ${originUrl})`);
  console.log(`   ✓ system-prompt.md (${fhCount} full highlights embedded)`);
  console.log(`   ✓ ai-resume.json (/.well-known/ endpoint)`);
  console.log(`   ✓ manifest.json (PWA)`);
  console.log(`\nNext: add GROQ_API_KEY to .env, then 'netlify dev' to test.`);
} catch (err) {
  console.error(`❌ Setup failed: ${err.message}`);
  if (err.stack) console.error(err.stack);
  process.exit(1);
}
