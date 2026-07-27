import { describe, expect, it } from 'vitest';
import { parseDate, parseDateParts } from '../src/core/parse.js';
import type { ParseOptions } from '../src/core/parse.js';

const en: ParseOptions = { locale: 'en-GB' };
const iso = (input: string, options: ParseOptions = en) =>
  parseDate(input, options)?.toString() ?? null;

describe('unambiguous ISO input', () => {
  it('parses ISO dates regardless of the configured rule', () => {
    expect(iso('2026-07-27', { ...en, rule: 'dmy' })).toBe('2026-07-27');
    expect(iso('2026-07-27', { ...en, rule: 'mdy' })).toBe('2026-07-27');
  });

  it('parses an ISO month to the first of that month', () => {
    expect(iso('2026-07')).toBe('2026-07-01');
  });

  it('parses a compact 8-digit date', () => {
    expect(iso('20260727')).toBe('2026-07-27');
  });
});

describe('delimiters', () => {
  it('accepts every delimiter 0.x supported', () => {
    for (const input of ['27/07/2026', '27-07-2026', '27.07.2026', '27 07 2026']) {
      expect(iso(input)).toBe('2026-07-27');
    }
  });

  it('tolerates repeated and mixed whitespace', () => {
    expect(iso('27   07   2026')).toBe('2026-07-27');
  });
});

describe('rule ordering', () => {
  it('reads ambiguous numbers according to the rule', () => {
    expect(iso('03/04/2026', { ...en, rule: 'dmy' })).toBe('2026-04-03');
    expect(iso('03/04/2026', { ...en, rule: 'mdy' })).toBe('2026-03-04');
  });

  it('lets a textual month override the rule position', () => {
    // The month is self-identifying, so the remaining number must be the day
    // whichever order the rule specifies.
    expect(iso('4 March 2026', { ...en, rule: 'dmy' })).toBe('2026-03-04');
    expect(iso('March 4 2026', { ...en, rule: 'mdy' })).toBe('2026-03-04');
    expect(iso('March 4 2026', { ...en, rule: 'dmy' })).toBe('2026-03-04');
  });
});

describe('partial input', () => {
  it('parses a bare year, which 0.x rejected outright', () => {
    // The old parser opened with `if (delimiter) {...} else { return false }`,
    // so a year-only picker could never accept its own output.
    expect(iso('2026')).toBe('2026-01-01');
    expect(parseDateParts('2026', en)).toEqual({ year: 2026, month: null, day: null });
  });

  it('parses a bare month name against the reference year', () => {
    expect(parseDateParts('March', { ...en, referenceYear: 2026 }))
      .toEqual({ year: 2026, month: 2, day: null });
  });

  it('parses a month and year with no day', () => {
    expect(iso('Mar 2026')).toBe('2026-03-01');
    expect(iso('March 2026')).toBe('2026-03-01');
    expect(parseDateParts('Mar 2026', en)).toEqual({ year: 2026, month: 2, day: null });
  });

  it('reports which parts were present, so callers can respect precision', () => {
    expect(parseDateParts('27 Jul 2026', en)).toEqual({ year: 2026, month: 6, day: 27 });
  });
});

describe('weekday names', () => {
  it('ignores a leading weekday', () => {
    expect(iso('Monday, 27 July 2026')).toBe('2026-07-27');
    expect(iso('Mon 27 Jul 2026')).toBe('2026-07-27');
  });

  it('ignores a weekday in a non-English locale', () => {
    expect(parseDate('lundi 27 juillet 2026', { locale: 'fr-FR' })?.toString()).toBe('2026-07-27');
  });
});

describe('two-digit years', () => {
  it('pivots on the current year, matching 0.x', () => {
    // With a 2026 reference, "24" is recent past and "27" is last century.
    expect(iso('27/07/24', { ...en, referenceYear: 2026 })).toBe('2024-07-27');
    expect(iso('27/07/27', { ...en, referenceYear: 2026 })).toBe('1927-07-27');
  });
});

describe('locale month names', () => {
  it('matches month names in the active locale', () => {
    expect(parseDate('27 juillet 2026', { locale: 'fr-FR' })?.toString()).toBe('2026-07-27');
    expect(parseDate('27 Juli 2026', { locale: 'de-DE' })?.toString()).toBe('2026-07-27');
  });

  it('accepts a caller-supplied month list', () => {
    const monthNames = ['Ein', 'Zwei', 'Drei', 'Vier', 'Fun', 'Sechs', 'Sieben', 'Acht', 'Neun', 'Zehn', 'Elf', 'Zwolf'];
    expect(parseDate('27 Sieben 2026', { monthNames })?.toString()).toBe('2026-07-27');
  });
});

describe('rejections', () => {
  it('returns null for text that is not a date', () => {
    expect(parseDate('', en)).toBeNull();
    expect(parseDate('   ', en)).toBeNull();
    expect(parseDate('hello world', en)).toBeNull();
  });

  it('rejects impossible components rather than silently clamping', () => {
    expect(parseDate('27/13/2026', { ...en, rule: 'dmy' })).toBeNull(); // month 13
    expect(parseDate('32/07/2026', { ...en, rule: 'dmy' })).toBeNull(); // day 32
  });

  it('rejects input with more parts than the rule can place', () => {
    expect(parseDate('1/2/3/4/5', en)).toBeNull();
  });

  it('strips brackets and commas as 0.x did', () => {
    expect(iso('(27/07/2026)')).toBe('2026-07-27');
    expect(iso('27 July, 2026')).toBe('2026-07-27');
  });
});

describe('round-tripping', () => {
  it('reads back the ym-mode storage format', () => {
    expect(iso('2026-07')).toBe('2026-07-01');
  });

  it('reads back the ym-mode display format', () => {
    expect(iso('Jul 2026')).toBe('2026-07-01');
  });

  it('reads back the y-mode format', () => {
    expect(iso('2026')).toBe('2026-01-01');
  });
});
