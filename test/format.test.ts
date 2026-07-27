import { describe, expect, it } from 'vitest';
import { format, patternTokens, monthNames, weekdayNames } from '../src/core/format.js';
import { PlainDate } from '../src/core/plain-date.js';

// Monday, 27 July 2026.
const date = new PlainDate(2026, 6, 27);
const en = { locale: 'en-GB' };

describe('format tokens', () => {
  it('renders year tokens', () => {
    expect(format(date, 'yyyy', en)).toBe('2026');
    expect(format(date, 'yy', en)).toBe('26');
  });

  it('renders month tokens', () => {
    expect(format(date, 'mmmm', en)).toBe('July');
    expect(format(date, 'mmm', en)).toBe('Jul');
    expect(format(date, 'mm', en)).toBe('07');
    expect(format(date, 'm', en)).toBe('7');
    expect(format(date, 'mx', en)).toBe('7th');
  });

  it('renders day tokens', () => {
    expect(format(date, 'dd', en)).toBe('27');
    expect(format(date, 'd', en)).toBe('27');
    expect(format(date, 'dx', en)).toBe('27th');
    expect(format(date, 'ddd', en)).toBe('208');
    expect(format(date, 'dddd', en)).toBe('208');
  });

  it('renders weekday tokens', () => {
    expect(format(date, 'wwww', en)).toBe('Monday');
    expect(format(date, 'www', en)).toBe('Mon');
    expect(format(date, 'w', en)).toBe('1');
  });

  it('picks the right ordinal suffix for each category', () => {
    expect(format(new PlainDate(2026, 6, 1), 'dx', en)).toBe('1st');
    expect(format(new PlainDate(2026, 6, 2), 'dx', en)).toBe('2nd');
    expect(format(new PlainDate(2026, 6, 3), 'dx', en)).toBe('3rd');
    expect(format(new PlainDate(2026, 6, 4), 'dx', en)).toBe('4th');
    // The 11/12/13 exceptions, which a naive `n % 10` check gets wrong.
    expect(format(new PlainDate(2026, 6, 11), 'dx', en)).toBe('11th');
    expect(format(new PlainDate(2026, 6, 12), 'dx', en)).toBe('12th');
    expect(format(new PlainDate(2026, 6, 13), 'dx', en)).toBe('13th');
    expect(format(new PlainDate(2026, 6, 21), 'dx', en)).toBe('21st');
  });
});

describe('format patterns', () => {
  it('renders the documented 0.x example patterns', () => {
    expect(format(date, 'dx mmm yyyy', en)).toBe('27th Jul 2026');
    expect(format(date, 'wwww, dx mmmm yyyy', en)).toBe('Monday, 27th July 2026');
    expect(format(date, 'yyyy-mm-dd', en)).toBe('2026-07-27');
    expect(format(date, "mmm 'yy", en)).toBe("Jul '26");
  });

  it('defaults to the ISO date pattern', () => {
    expect(format(date)).toBe('2026-07-27');
  });

  it('renders the mode-appropriate short patterns', () => {
    expect(format(date, 'mmm yyyy', en)).toBe('Jul 2026');
    expect(format(date, 'yyyy-mm', en)).toBe('2026-07');
  });

  it('escapes literals with a backslash', () => {
    // 0.x had no escape mechanism at all, so any literal containing token
    // letters was silently rewritten.
    expect(format(date, '\\d\\a\\y d', en)).toBe('day 27');
    expect(format(date, '\\m\\m\\m', en)).toBe('mmm');
  });

  it('escapes one character at a time, not a whole token', () => {
    // `\mmm` is a literal "m" followed by the live `mm` token, which is the
    // conventional printf/regex reading of a backslash escape.
    expect(format(date, '\\mmm', en)).toBe('m07');
  });

  it('leaves a trailing backslash alone rather than reading past the end', () => {
    expect(format(date, 'yyyy\\', en)).toBe('2026\\');
  });

  it('passes non-token characters through untouched', () => {
    expect(format(date, '[dd/mm/yyyy]', en)).toBe('[27/07/2026]');
  });
});

describe('locale awareness', () => {
  it('renders month and weekday names in the requested locale', () => {
    expect(format(date, 'mmmm', { locale: 'fr-FR' })).toBe('juillet');
    expect(format(date, 'mmmm', { locale: 'de-DE' })).toBe('Juli');
    expect(format(date, 'wwww', { locale: 'fr-FR' })).toBe('lundi');
  });

  it('omits English ordinal suffixes for locales that do not use them', () => {
    expect(format(date, 'dx', { locale: 'fr-FR' })).toBe('27');
  });

  it('lets explicit month names override the locale', () => {
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    expect(format(date, 'mmm', { locale: 'fr-FR', monthNamesShort: names })).toBe('Jul');
  });
});

describe('monthNames / weekdayNames', () => {
  it('returns twelve months in calendar order', () => {
    const names = monthNames('en-GB', 'short');
    expect(names).toHaveLength(12);
    expect(names[0]).toBe('Jan');
    expect(names[11]).toBe('Dec');
  });

  it('returns seven weekdays indexed from Sunday', () => {
    const names = weekdayNames('en-GB', 'long');
    expect(names).toHaveLength(7);
    expect(names[0]).toBe('Sunday');
    expect(names[1]).toBe('Monday');
    expect(names[6]).toBe('Saturday');
  });
});

describe('patternTokens', () => {
  it('lists the tokens a pattern uses, in order', () => {
    expect(patternTokens('dx mmm yyyy')).toEqual(['dx', 'mmm', 'yyyy']);
    expect(patternTokens('yyyy-mm')).toEqual(['yyyy', 'mm']);
  });

  it('ignores escaped tokens', () => {
    expect(patternTokens('\\d\\d yyyy')).toEqual(['yyyy']);
  });
});
