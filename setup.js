#!/usr/bin/env node

// ai-resume setup script
// Reads setup-config.json, generates all output artifacts atomically.
// Templates backed up to .template-backup/ on first run.
// Generated outputs: index.html, netlify/functions/groqHandler.mjs,
// system-prompt.md, ai-resume.json, manifest.json

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { palettes, derivePaletteVars, validateContrast } from "./palettes.js";

// Files with {{PLACEHOLDER}} substitution. Read from templates/, write hydrated to root.
// system-prompt.md is NOT here — it's wizard-generated per user, setup.js only refreshes
// the full_highlights list between HTML-comment markers in place.
const TEMPLATE_FILES = [
  "index.html",
  "netlify/functions/groqHandler.mjs",
];
const TEMPLATES_DIR = "templates";

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

const GITHUB_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.107-.776.418-1.305.762-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`;

const EMAIL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`;

function generateConnectIconsHtml(links) {
  if (!links || (!links.linkedin && !links.github && !links.email)) return "";
  const items = [];
  if (links.linkedin) {
    items.push(
      `    <a class="connect-icon" href="${escapeHtml(links.linkedin)}" aria-label="Connect on LinkedIn" target="_blank" rel="noopener noreferrer">${LINKEDIN_SVG}</a>`
    );
  }
  if (links.github) {
    items.push(
      `    <a class="connect-icon" href="${escapeHtml(links.github)}" aria-label="View on GitHub" target="_blank" rel="noopener noreferrer">${GITHUB_SVG}</a>`
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
  if (links.github) sameAs.push(links.github);
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
  if (links.github) sameAs.push(links.github);
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

const DEMO_PROMPT_TEXT = `I want to make a personal AI resume page using the ai-resume template at github.com/agamarora/ai-resume. Walk me through setup — ask about my career, generate the config files, help me deploy to Netlify. Push hard for quantified metrics (numbers, percentages, outcomes).`;

const DEMO_BANNER_CSS = `
    /* Demo banner + header CTA + modal — only injected when demo_mode=true */
    /* CTA is the primary conversion surface — solid accent, pill, lift on hover */
    .demo-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 14px;
      height: 30px;
      border-radius: 999px;
      border: none;
      background: var(--accent);
      color: var(--bg);
      font-size: 13px;
      font-weight: 600;
      letter-spacing: -0.005em;
      white-space: nowrap;
      text-decoration: none;
      cursor: pointer;
      flex-shrink: 0;
      touch-action: manipulation;
      font-family: inherit;
      box-shadow: 0 0 0 1px var(--accent), 0 4px 14px -6px var(--accent);
      transition: transform 120ms ease-out, box-shadow 180ms ease-out;
    }
    .demo-chip:hover {
      transform: translateY(-1px);
      box-shadow: 0 0 0 1px var(--accent), 0 8px 20px -6px var(--accent);
    }
    .demo-chip:active { transform: translateY(0); }
    .demo-chip:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
    /* Hide CTA during intro animation (matches other header elements) */
    body.intro-active .chat-header .demo-chip { opacity: 0; pointer-events: none; }
    @media (max-width: 480px) {
      .demo-chip { height: 28px; font-size: 12px; padding: 0 12px; }
    }

    /* Modal overlay */
    .demo-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      padding-top: max(16px, env(safe-area-inset-top));
      padding-bottom: max(16px, env(safe-area-inset-bottom));
      z-index: 1000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 180ms ease-out;
    }
    .demo-modal-overlay.open {
      opacity: 1;
      pointer-events: auto;
    }
    .demo-modal {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 28px 24px 24px;
      max-width: 520px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
      transform: translateY(12px) scale(0.98);
      transition: transform 180ms ease-out;
    }
    .demo-modal-overlay.open .demo-modal { transform: translateY(0) scale(1); }
    .demo-modal-close {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 36px;
      height: 36px;
      background: transparent;
      border: none;
      color: var(--text-dim);
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      padding: 0;
      touch-action: manipulation;
      line-height: 1;
    }
    .demo-modal-close:hover { background: var(--accent-06); color: var(--text); }
    .demo-modal-close:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .demo-modal h2 {
      font-size: 19px;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: var(--text);
      margin: 0 0 6px;
      padding-right: 32px;
    }
    .demo-modal-intro {
      font-size: 14px;
      color: var(--text-dim);
      line-height: 1.5;
      margin: 0 0 14px;
      letter-spacing: -0.005em;
    }
    .demo-modal-prompt {
      position: relative;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px 14px 48px 14px;
      font-size: 13px;
      line-height: 1.55;
      color: var(--text);
      margin: 0 0 14px;
      font-family: ui-monospace, "SF Mono", "Roboto Mono", Menlo, Consolas, monospace;
      word-wrap: break-word;
      overflow-wrap: break-word;
      white-space: pre-wrap;
    }
    .demo-modal-copy {
      position: absolute;
      bottom: 8px;
      right: 8px;
      min-height: 32px;
      padding: 6px 14px;
      background: var(--accent);
      color: var(--bg);
      border: none;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      touch-action: manipulation;
      font-family: inherit;
      letter-spacing: -0.005em;
      transition: opacity 150ms ease-out, transform 100ms ease-out;
    }
    .demo-modal-copy:hover { opacity: 0.9; }
    .demo-modal-copy:active { transform: scale(0.97); }
    .demo-modal-copy:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    .demo-modal-tools {
      font-size: 12px;
      color: var(--text-dim);
      line-height: 1.5;
      margin: 0 0 18px;
    }
    .demo-modal-tools strong { color: var(--text); font-weight: 500; }
    .demo-modal-cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 44px;
      padding: 10px 18px;
      background: var(--accent);
      color: var(--bg);
      text-decoration: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: -0.005em;
      transition: opacity 150ms ease-out;
      touch-action: manipulation;
    }
    .demo-modal-cta:hover { opacity: 0.9; }
    .demo-modal-cta:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
    body.intro-active .demo-modal-overlay { display: none; }
    @media (max-width: 480px) {
      .demo-modal { padding: 24px 16px 20px; border-radius: 10px; }
      .demo-modal h2 { font-size: 17px; }
      .demo-modal-intro { font-size: 13px; }
      .demo-modal-prompt { font-size: 12.5px; padding: 12px 12px 44px; }
      .demo-modal-cta { width: 100%; justify-content: center; }
    }

    .demo-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 8px 40px 8px 16px;
      background: var(--accent-08);
      border-bottom: 1px solid var(--border);
      font-size: 13px;
      color: var(--text);
      flex-shrink: 0;
      position: relative;
      line-height: 1.4;
      letter-spacing: -0.005em;
    }
    .demo-banner strong { font-weight: 600; color: var(--text); }
    .demo-banner a {
      color: var(--accent);
      text-decoration: none;
      font-weight: 500;
      margin-left: 4px;
    }
    .demo-banner a:hover { text-decoration: underline; }
    .demo-banner-close {
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: var(--text-dim);
      cursor: pointer;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      border-radius: 4px;
      touch-action: manipulation;
      padding: 0;
      line-height: 1;
    }
    .demo-banner-close:hover { color: var(--text); background: var(--accent-04); }
    .demo-banner.dismissed { display: none; }
    body.intro-active .demo-banner { display: none; }
    @media (max-width: 480px) {
      .demo-banner { font-size: 12px; padding: 6px 36px 6px 12px; justify-content: flex-start; text-align: left; }
    }`;

const DEMO_BANNER_HTML = `<div class="demo-banner" id="demo-banner" role="note">
    <span>Demo of the <strong>ai-resume</strong> template</span>
    <button class="demo-banner-close" id="demo-banner-close" aria-label="Dismiss demo banner" type="button">✕</button>
  </div>`;

const DEMO_MODAL_HTML = `<div class="demo-modal-overlay" id="demo-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="demo-modal-title" aria-hidden="true">
    <div class="demo-modal" role="document">
      <button class="demo-modal-close" id="demo-modal-close" aria-label="Close dialog" type="button">✕</button>
      <h2 id="demo-modal-title">Make your own AI resume</h2>
      <p class="demo-modal-intro">Paste this into Claude Code, Codex CLI, ChatGPT, Claude Desktop, Copilot, or any AI assistant. It will walk you through setup and deploy.</p>
      <div class="demo-modal-prompt" id="demo-modal-prompt-text">${DEMO_PROMPT_TEXT}<button class="demo-modal-copy" id="demo-modal-copy" type="button" aria-label="Copy prompt to clipboard">Copy</button></div>
      <p class="demo-modal-tools">Setup takes <strong>~30 minutes</strong>. Works with any AI that can read and write files. $0/month to host.</p>
      <a class="demo-modal-cta" href="https://github.com/agamarora/ai-resume" target="_blank" rel="noopener noreferrer">View template on GitHub →</a>
    </div>
  </div>`;

const DEMO_BANNER_JS = `(function demoBanner() {
      const banner = document.getElementById("demo-banner");
      const overlay = document.getElementById("demo-modal-overlay");
      const chip = document.querySelector(".demo-chip");

      // Banner dismiss (sessionStorage so banner returns in new sessions)
      if (banner) {
        try {
          if (sessionStorage.getItem("ai-resume-demo-dismissed") === "1") {
            banner.classList.add("dismissed");
          }
        } catch (e) {}
        document.getElementById("demo-banner-close")?.addEventListener("click", () => {
          banner.classList.add("dismissed");
          try { sessionStorage.setItem("ai-resume-demo-dismissed", "1"); } catch (e) {}
        });
      }

      // Modal open/close
      if (!overlay) return;
      let lastFocus = null;
      const close = () => {
        overlay.classList.remove("open");
        overlay.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
        lastFocus?.focus?.();
      };
      const open = (source) => {
        lastFocus = source || document.activeElement;
        overlay.classList.add("open");
        overlay.setAttribute("aria-hidden", "false");
        document.body.style.overflow = "hidden";
        setTimeout(() => document.getElementById("demo-modal-close")?.focus(), 50);
      };

      chip?.addEventListener("click", (e) => { e.preventDefault(); open(chip); });
      document.getElementById("demo-modal-close")?.addEventListener("click", close);
      overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("open")) close();
      });

      // Copy prompt to clipboard
      const copyBtn = document.getElementById("demo-modal-copy");
      const promptEl = document.getElementById("demo-modal-prompt-text");
      copyBtn?.addEventListener("click", async () => {
        // Extract prompt text (first text node, excluding the Copy button)
        const text = Array.from(promptEl.childNodes)
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent)
          .join("")
          .trim();
        try {
          await navigator.clipboard.writeText(text);
          copyBtn.textContent = "Copied ✓";
          navigator.vibrate?.([10]);
          setTimeout(() => { copyBtn.textContent = "Copy"; }, 1800);
        } catch (err) {
          copyBtn.textContent = "Failed";
          setTimeout(() => { copyBtn.textContent = "Copy"; }, 1800);
        }
      });
    })();
`;

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

  // 4. Read templates from tracked templates/ directory
  if (!existsSync(TEMPLATES_DIR)) {
    console.error(`❌ ${TEMPLATES_DIR}/ directory not found — this repo is missing the template source of truth.`);
    process.exit(1);
  }
  const sources = {};
  for (const file of TEMPLATE_FILES) {
    const templatePath = join(TEMPLATES_DIR, file);
    if (!existsSync(templatePath)) {
      console.error(`❌ template missing: ${templatePath}`);
      process.exit(1);
    }
    sources[file] = readFileSync(templatePath, "utf8");
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
    "{{DEMO_BANNER_CSS}}": config.demo_mode ? DEMO_BANNER_CSS : "",
    "{{DEMO_BANNER_HTML}}": config.demo_mode ? DEMO_BANNER_HTML : "",
    "{{DEMO_MODAL_HTML}}": config.demo_mode ? DEMO_MODAL_HTML : "",
    "{{DEMO_BANNER_JS}}": config.demo_mode ? DEMO_BANNER_JS : "",
    "{{DEMO_CHIP_HTML}}": config.demo_mode
      ? `<button type="button" class="demo-chip" aria-label="Make your own AI resume using this template">Make yours</button>`
      : "",
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

  // 11. Write templated files atomically
  for (const [file, content] of Object.entries(outputs)) {
    writeFileSync(file, content, "utf8");
  }
  writeFileSync("ai-resume.json", JSON.stringify(aiResumeJson, null, 2), "utf8");
  writeFileSync("manifest.json", JSON.stringify(manifestJson, null, 2), "utf8");

  // 12. Refresh full_highlights list inside system-prompt.md between markers.
  // The file itself is wizard-generated per user; we only own the list block.
  let promptUpdated = false;
  if (existsSync("system-prompt.md")) {
    const prompt = readFileSync("system-prompt.md", "utf8");
    const markerRe = /<!-- BEGIN:FULL_HIGHLIGHTS -->[\s\S]*?<!-- END:FULL_HIGHLIGHTS -->/;
    if (markerRe.test(prompt)) {
      const block = `<!-- BEGIN:FULL_HIGHLIGHTS -->\n${fullHighlightsMd}\n<!-- END:FULL_HIGHLIGHTS -->`;
      writeFileSync("system-prompt.md", prompt.replace(markerRe, block), "utf8");
      promptUpdated = true;
    } else {
      console.warn("⚠ system-prompt.md has no <!-- BEGIN:FULL_HIGHLIGHTS --> markers — full_highlights list not refreshed.");
      console.warn("  Add markers around the bulleted list so `node setup.js` can keep it in sync with setup-config.json.");
    }
  }

  const whCount = resume.welcome_highlights?.length || 0;
  const fhCount = resume.full_highlights?.length || 0;

  console.log(`\n✅ Setup complete!`);
  console.log(`   Name: ${name}`);
  console.log(`   Palette: ${config.palette === "custom" ? "Custom" : palettes[config.palette].name}`);
  console.log(`   Domain: ${domain}`);
  console.log(`\n   ✓ index.html (${whCount} welcome cards, JSON-LD, connect icons${config.demo_mode ? ", demo banner" : ""})`);
  console.log(`   ✓ netlify/functions/groqHandler.mjs (CORS: ${originUrl})`);
  console.log(`   ${promptUpdated ? "✓" : "·"} system-prompt.md (${promptUpdated ? `${fhCount} full highlights refreshed between markers` : "untouched — add <!-- BEGIN/END:FULL_HIGHLIGHTS --> markers to enable sync"})`);
  console.log(`   ✓ ai-resume.json (/.well-known/ endpoint)`);
  console.log(`   ✓ manifest.json (PWA)`);
  console.log(`\nNext: add GROQ_API_KEY to .env, then 'netlify dev' to test.`);
} catch (err) {
  console.error(`❌ Setup failed: ${err.message}`);
  if (err.stack) console.error(err.stack);
  process.exit(1);
}
