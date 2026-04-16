// ai-resume palette system
// 4 curated dark-mode palettes + custom support
// Each palette defines 5 base colors; all rgba variants are derived automatically

export const palettes = {
  "midnight-gold": {
    name: "Midnight Gold",
    description: "The original. Dark editorial with warm gold accents.",
    bg: "#0A0A0A",
    border: "#1E1E1E",
    text: "#E8E4DF",
    textDim: "#7A7A7A",
    accent: "#E5A54B",
  },
  "deep-ocean": {
    name: "Deep Ocean",
    description: "Navy depths with electric cyan highlights.",
    bg: "#0B0E14",
    border: "#1A1F2E",
    text: "#E0E4E8",
    textDim: "#6B7280",
    accent: "#38BDF8",
  },
  "obsidian-rose": {
    name: "Obsidian Rose",
    description: "Cool charcoal with dusty rose warmth.",
    bg: "#0C0A0E",
    border: "#201C24",
    text: "#E8E4EC",
    textDim: "#7A7580",
    accent: "#F472B6",
  },
  "slate-mint": {
    name: "Slate Mint",
    description: "Cool slate with fresh mint energy.",
    bg: "#0A0C0E",
    border: "#1A1E22",
    text: "#E4E8EC",
    textDim: "#6B7580",
    accent: "#34D399",
  },
};

/**
 * Parse hex color to RGB components
 */
export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/**
 * Convert hex + alpha to rgba string
 */
export function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Lighten a hex color by adding `amount` to each channel (clamped at 255)
 */
function lighten(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (v) => Math.min(255, v + amount);
  return `#${clamp(r).toString(16).padStart(2, "0")}${clamp(g).toString(16).padStart(2, "0")}${clamp(b).toString(16).padStart(2, "0")}`;
}

/**
 * Derive all CSS variables from a palette's 5 base colors.
 * Returns an object with every CSS value needed by index.html and groqHandler.mjs.
 */
export function derivePaletteVars(palette) {
  const { bg, border, text, textDim, accent } = palette;
  const surface = lighten(bg, 7);

  return {
    // Base tokens
    "--bg": bg,
    "--border": border,
    "--text": text,
    "--text-dim": textDim,
    "--accent": accent,
    "--accent-fg": deriveForegroundColor(accent),
    "--surface": surface,

    // Accent rgba variants (used in chat UI, keyboard, terminal effects)
    "--accent-04": rgba(accent, 0.04),
    "--accent-06": rgba(accent, 0.06),
    "--accent-08": rgba(accent, 0.08),
    "--accent-12": rgba(accent, 0.12),
    "--accent-15": rgba(accent, 0.15),
    "--accent-25": rgba(accent, 0.25),
    "--accent-30": rgba(accent, 0.3),
    "--accent-35": rgba(accent, 0.35),
    "--accent-70": rgba(accent, 0.7),

    // Keyboard key shades (derived from bg)
    "--key-bg": lighten(bg, 12),
    "--key-border": lighten(bg, 32),
    "--key-border-bottom": lighten(bg, 24),
  };
}

/**
 * Derive the best foreground color (white or black) for text on a given background.
 * Uses relative luminance to pick the option with better contrast.
 */
export function deriveForegroundColor(bgHex) {
  const { r, g, b } = hexToRgb(bgHex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

/**
 * Validate WCAG AA contrast ratio between text and background.
 * Returns { ratio, passes_aa }
 */
export function validateContrast(textHex, bgHex) {
  function luminance(hex) {
    const { r, g, b } = hexToRgb(hex);
    const [rs, gs, bs] = [r, g, b].map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  const l1 = luminance(textHex);
  const l2 = luminance(bgHex);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

  return {
    ratio: Math.round(ratio * 100) / 100,
    passes_aa: ratio >= 4.5,
  };
}
