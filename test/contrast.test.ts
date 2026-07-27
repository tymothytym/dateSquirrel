/**
 * Colour contrast, measured against the shipped stylesheet.
 *
 * The palette is read out of src/styles/date-squirrel.css rather than duplicated
 * here, so these thresholds guard what actually ships.
 *
 * Target: readable — WCAG 2.2 level AA, 4.5:1 for normal text and 3:1 for
 * non-text indicators (SC 1.4.11).
 *
 * Disabled cells are held to the same 4.5:1 as everything else. WCAG exempts
 * inactive controls from contrast requirements, which is exactly why disabled
 * dates are normally unreadable. Raising them removes contrast as the cue for
 * "disabled", so that state is also carried by a strikethrough — see the
 * `line-through` assertion below, and SC 1.4.1 (Use of Colour).
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extractTokens, ratio, round } from './helpers/contrast.js';

const CSS = readFileSync('src/styles/date-squirrel.css', 'utf8');

const TEXT = 4.5;
const NON_TEXT = 3;

const light = extractTokens(CSS, ':where(.dsq)');
// The dark block re-declares a subset, so layer it over the light defaults.
const dark = { ...light, ...extractTokens(CSS, '@media (prefers-color-scheme: dark)') };

/** Text pairs that must be readable, in both schemes. */
const TEXT_PAIRS: [label: string, fg: string, bg: string][] = [
  ['input text', 'var(--dsq-text)', 'var(--dsq-surface)'],

  ['year resting', 'var(--dsq-year-text)', 'var(--dsq-year-surface)'],
  ['year hover', 'var(--dsq-year-text)', 'var(--dsq-year-surface-hover)'],
  ['year selected', 'var(--dsq-year-text-active)', 'var(--dsq-year-surface-active)'],
  ['year disabled', 'var(--dsq-year-text-disabled)', 'var(--dsq-year-surface-disabled)'],

  ['month resting', 'var(--dsq-month-text)', 'var(--dsq-month-surface)'],
  ['month hover', 'var(--dsq-month-text)', 'var(--dsq-month-surface-hover)'],
  ['month selected', 'var(--dsq-month-text-active)', 'var(--dsq-month-surface-active)'],
  ['month disabled', 'var(--dsq-month-text-disabled)', 'var(--dsq-month-surface-disabled)'],

  ['day resting', 'var(--dsq-day-text)', 'var(--dsq-day-surface)'],
  ['day hover', 'var(--dsq-day-text)', 'var(--dsq-day-surface-hover)'],
  ['day selected', 'var(--dsq-day-text-active)', 'var(--dsq-day-surface-active)'],
  ['day disabled', 'var(--dsq-day-text-disabled)', 'var(--dsq-day-surface-disabled)'],
  ['day today', 'var(--dsq-day-text)', 'var(--dsq-day-surface)'],

  ['weekday header', 'var(--dsq-muted)', 'var(--dsq-day-surface)'],
  ['back strip', 'var(--dsq-side-text)', 'var(--dsq-side-surface)'],
  ['back strip hover', 'var(--dsq-side-text-hover)', 'var(--dsq-side-surface-hover)'],
  ['placeholder', 'var(--dsq-placeholder)', 'var(--dsq-surface)'],
];

/** Non-text indicators: 3:1 against whatever they sit on. */
const INDICATOR_PAIRS: [label: string, fg: string, bg: string][] = [
  ['wrapper border', 'var(--dsq-border)', 'var(--dsq-surface)'],
  ['today ring', 'var(--dsq-today-ring)', 'var(--dsq-day-surface)'],
  ['input focus glow', 'var(--dsq-focus)', 'var(--dsq-surface)'],
];

describe.each([
  ['light', light],
  ['dark', dark],
])('%s scheme', (scheme, tokens) => {
  const backdrop = tokens['--dsq-surface'] ?? '#ffffff';

  it.each(TEXT_PAIRS)('%s is readable', (label, fg, bg) => {
    const measured = round(ratio(fg, bg, tokens, backdrop));
    expect(measured, `${scheme}: ${label} measured ${measured}:1`).toBeGreaterThanOrEqual(TEXT);
  });

  it.each(INDICATOR_PAIRS)('%s meets non-text contrast', (label, fg, bg) => {
    const measured = round(ratio(fg, bg, tokens, backdrop));
    expect(measured, `${scheme}: ${label} measured ${measured}:1`).toBeGreaterThanOrEqual(NON_TEXT);
  });
});

describe('measured ratios', () => {
  // Not a threshold assertion — prints the table so the numbers are visible when
  // tuning the palette. `npm test -- test/contrast.test.ts` shows it.
  it('reports every pair', () => {
    const lines = ['', 'contrast ratios (target: text 4.5:1, indicators 3:1)', ''];
    for (const [scheme, tokens] of [['light', light], ['dark', dark]] as const) {
      const backdrop = tokens['--dsq-surface'] ?? '#ffffff';
      lines.push(`  ${scheme}:`);
      for (const [label, fg, bg] of [...TEXT_PAIRS, ...INDICATOR_PAIRS]) {
        const measured = round(ratio(fg, bg, tokens, backdrop));
        const target = TEXT_PAIRS.some(([name]) => name === label) ? TEXT : NON_TEXT;
        const mark = measured >= target ? 'ok  ' : 'FAIL';
        lines.push(`    ${mark} ${label.padEnd(20)} ${measured.toFixed(2).padStart(5)}:1`);
      }
    }
    // eslint-disable-next-line no-console
    console.log(lines.join('\n'));
    expect(lines.some((line) => line.includes('FAIL'))).toBe(false);
  });
});

describe('disabled state does not rely on colour alone', () => {
  it('strikes through disabled options and days', () => {
    // SC 1.4.1: with contrast raised to readable, "disabled" needs a second cue.
    expect(CSS).toMatch(/text-decoration:\s*line-through/);
  });
});

describe('focus indicator', () => {
  /** Every `:focus-visible` block in the stylesheet, with its selector. */
  const focusRules = [...CSS.matchAll(/([^{}]+):focus-visible\s*(?:::[a-z-]+\s*)?\{([^}]*)\}/g)].map(
    (match) => ({ selector: (match[1] ?? '').trim(), body: match[2] ?? '' }),
  );

  it('draws every focus ring in currentColor', () => {
    /*
     * A fixed focus colour cannot clear 3:1 against both the white year/day
     * panels and the dark month panel at once. currentColor is the cell's own
     * text colour, which every pair above already holds to 4.5:1 against its own
     * background — so the ring is compliant wherever it lands.
     */
    // Lookahead before the whitespace: `outline:\s*(?!none)` backtracks to zero
    // width and matches `outline: none` on the leading space.
    const drawn = focusRules.filter(({ body }) => /outline:(?!\s*none)/.test(body));
    expect(drawn.length).toBeGreaterThan(0);
    for (const { selector, body } of drawn) {
      expect(body, `${selector}:focus-visible`).toMatch(/outline:[^;]*currentColor/i);
    }
  });

  it('only suppresses the outline where the wrapper shows focus instead', () => {
    // The input is the one legitimate `outline: none`: focus is shown on the
    // wrapper via :focus-within, which is more visible than a ring inside a
    // borderless field.
    const suppressed = focusRules
      .filter(({ body }) => /outline:\s*none/.test(body))
      .map(({ selector }) => selector);
    expect(suppressed).toEqual(['.dsq > input']);

    const wrapperFocus = /\.dsq:focus-within\s*\{([^}]*)\}/.exec(CSS);
    expect(wrapperFocus, '.dsq:focus-within rule not found').not.toBeNull();
    expect(wrapperFocus?.[1]).toMatch(/border-color:/);
    expect(wrapperFocus?.[1]).toMatch(/box-shadow:/);
  });
});
