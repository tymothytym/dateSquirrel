/**
 * WCAG 2.2 contrast maths, plus just enough CSS colour parsing to evaluate the
 * stylesheet's own custom properties.
 *
 * Used by contrast.test.ts, which reads the real CSS rather than a copy of the
 * palette — so the thresholds cannot drift away from what ships.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
  /** 0–1. */
  a: number;
}

const HEX = /^#([0-9a-f]{3,8})$/i;
const RGB_FN = /^rgba?\(([^)]+)\)$/i;
const COLOR_MIX = /^color-mix\(\s*in\s+srgb\s*,\s*(.+)\)$/i;

const NAMED: Record<string, string> = {
  transparent: 'rgba(0,0,0,0)',
  white: '#ffffff',
  black: '#000000',
};

/** Split on commas that are not inside parentheses. */
function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of input) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/**
 * Resolve a CSS colour to RGBA, following `var()` references through the
 * supplied token map and evaluating `color-mix(in srgb, …)`.
 */
export function parseColor(value: string, tokens: Record<string, string> = {}, seen = new Set<string>()): Rgb {
  const raw = value.trim();

  const named = NAMED[raw.toLowerCase()];
  if (named) return parseColor(named, tokens, seen);

  // var(--name) or var(--name, fallback)
  if (raw.startsWith('var(')) {
    const inner = raw.slice(4, -1);
    const [name, ...fallback] = splitTopLevel(inner);
    const key = (name ?? '').trim();
    if (seen.has(key)) throw new Error(`circular custom property: ${key}`);
    const resolved = tokens[key];
    if (resolved !== undefined) {
      return parseColor(resolved, tokens, new Set([...seen, key]));
    }
    if (fallback.length > 0) return parseColor(fallback.join(','), tokens, seen);
    throw new Error(`unknown custom property: ${key}`);
  }

  const mix = COLOR_MIX.exec(raw);
  if (mix) return parseMix(mix[1] ?? '', tokens, seen);

  const hex = HEX.exec(raw);
  if (hex) return parseHex(hex[1] ?? '');

  const fn = RGB_FN.exec(raw);
  if (fn) return parseRgbFn(fn[1] ?? '');

  throw new Error(`unsupported colour: ${raw}`);
}

function parseMix(body: string, tokens: Record<string, string>, seen: Set<string>): Rgb {
  const parts = splitTopLevel(body);
  if (parts.length !== 2) throw new Error(`color-mix needs two colours: ${body}`);

  const read = (part: string) => {
    const match = /^(.*?)\s+(\d+(?:\.\d+)?)%$/.exec(part.trim());
    if (match) return { color: match[1] ?? '', weight: Number(match[2]) / 100 };
    return { color: part.trim(), weight: null as number | null };
  };

  const first = read(parts[0] ?? '');
  const second = read(parts[1] ?? '');

  // Percentages default so the pair sums to 100%.
  let w1 = first.weight;
  let w2 = second.weight;
  if (w1 === null && w2 === null) { w1 = 0.5; w2 = 0.5; }
  else if (w1 === null) w1 = 1 - (w2 as number);
  else if (w2 === null) w2 = 1 - w1;

  const c1 = parseColor(first.color, tokens, seen);
  const c2 = parseColor(second.color, tokens, seen);

  // color-mix in srgb premultiplies by alpha.
  const a = c1.a * (w1 as number) + c2.a * (w2 as number);
  const channel = (k: 'r' | 'g' | 'b') => {
    if (a === 0) return 0;
    return (c1[k] * c1.a * (w1 as number) + c2[k] * c2.a * (w2 as number)) / a;
  };
  return { r: channel('r'), g: channel('g'), b: channel('b'), a };
}

function parseHex(digits: string): Rgb {
  let hex = digits;
  if (hex.length === 3 || hex.length === 4) {
    hex = hex.split('').map((c) => c + c).join('');
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}

function parseRgbFn(body: string): Rgb {
  const bits = body.split(/[\s,/]+/).filter(Boolean);
  const num = (text: string | undefined, scale = 255) => {
    if (!text) return 0;
    return text.endsWith('%') ? (Number(text.slice(0, -1)) / 100) * scale : Number(text);
  };
  return {
    r: num(bits[0]),
    g: num(bits[1]),
    b: num(bits[2]),
    a: bits.length > 3 ? num(bits[3], 1) : 1,
  };
}

/** Composite a possibly-translucent colour over an opaque backdrop. */
export function flatten(color: Rgb, backdrop: Rgb): Rgb {
  if (color.a >= 1) return { ...color, a: 1 };
  const blend = (k: 'r' | 'g' | 'b') => color[k] * color.a + backdrop[k] * (1 - color.a);
  return { r: blend('r'), g: blend('g'), b: blend('b'), a: 1 };
}

/** WCAG relative luminance. */
export function luminance(color: Rgb): number {
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
}

/** WCAG contrast ratio, 1–21. Foreground is flattened over the background. */
export function contrast(foreground: Rgb, background: Rgb): number {
  const bg = flatten(background, { r: 255, g: 255, b: 255, a: 1 });
  const fg = flatten(foreground, bg);
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

/** Contrast between two CSS colour strings, resolved against a token map. */
export function ratio(
  foreground: string,
  background: string,
  tokens: Record<string, string>,
  backdrop = '#ffffff',
): number {
  const base = flatten(parseColor(background, tokens), parseColor(backdrop, tokens));
  return contrast(parseColor(foreground, tokens), base);
}

export const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Extract custom properties from a CSS block whose selector matches `selector`.
 * Deliberately simple: it only needs to read our own stylesheet.
 */
export function extractTokens(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const open = css.indexOf('{', start);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    if (css[i] === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  const body = css.slice(open + 1, end);
  const tokens: Record<string, string> = {};
  for (const match of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens[(match[1] ?? '').trim()] = (match[2] ?? '').trim();
  }
  return tokens;
}
