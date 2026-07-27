/**
 * Pattern-based date formatting.
 *
 * The pattern DSL from dateSquirrel 0.x is preserved verbatim — `dx mmm yyyy`,
 * `wwww, dx mmmm yyyy` and friends all still work. What changed underneath:
 *
 *  - month and weekday names come from `Intl.DateTimeFormat` in the caller's
 *    locale instead of a hardcoded `'en-gb'`;
 *  - the pattern is tokenised in a single left-to-right pass instead of being
 *    fed through `String.replace` with a generated alternation, so literal text
 *    containing token letters is no longer silently mangled;
 *  - `\` escapes the next character, so literals are actually expressible.
 */

import type { PlainDate } from './plain-date.js';

/** Longest-first so `mmmm` wins over `mmm`, `dddd` over `ddd`, and so on. */
const TOKENS = [
  'dddd', 'dddx', 'ddd', 'dd', 'dx', 'd',
  'mmmm', 'mmm', 'mm', 'mx', 'm',
  'wwww', 'www', 'ww', 'w',
  'yyyy', 'yy',
] as const;

export type FormatToken = (typeof TOKENS)[number];

export interface FormatContext {
  locale?: string | string[] | undefined;
  /** Overrides the Intl-derived long month names. */
  monthNames?: readonly string[] | undefined;
  /** Overrides the Intl-derived short month names. Also drives the month list UI. */
  monthNamesShort?: readonly string[] | undefined;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: string | string[] | undefined, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${JSON.stringify(locale ?? null)}|${JSON.stringify(options)}`;
  let cached = formatterCache.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat(locale, options);
    formatterCache.set(key, cached);
  }
  return cached;
}

/** Long month names (January…) for a locale, in calendar order. */
export function monthNames(locale?: string | string[], width: 'long' | 'short' | 'narrow' = 'long'): string[] {
  const fmt = formatter(locale, { month: width, timeZone: 'UTC' });
  return Array.from({ length: 12 }, (_, month) => fmt.format(Date.UTC(2000, month, 1)));
}

/** Weekday names for a locale, indexed 0 = Sunday .. 6 = Saturday. */
export function weekdayNames(locale?: string | string[], width: 'long' | 'short' | 'narrow' = 'short'): string[] {
  const fmt = formatter(locale, { weekday: width, timeZone: 'UTC' });
  // 2 Jan 2000 was a Sunday.
  return Array.from({ length: 7 }, (_, day) => fmt.format(Date.UTC(2000, 0, 2 + day)));
}

/**
 * The locale's first day of the week, 0 = Sunday .. 6 = Saturday.
 * Falls back to Monday, which is what dateSquirrel 0.x hardcoded.
 */
export function firstDayOfWeek(locale?: string | string[]): number {
  try {
    const resolved = new Intl.Locale(
      Array.isArray(locale) ? (locale[0] ?? 'en') : (locale ?? navigatorLocale()),
    ) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
    const info = resolved.getWeekInfo?.() ?? resolved.weekInfo;
    // Intl reports 1 = Monday .. 7 = Sunday; we want 0 = Sunday.
    if (info && typeof info.firstDay === 'number') return info.firstDay % 7;
  } catch {
    // Older engines have no weekInfo; Monday is the sane default.
  }
  return 1;
}

function navigatorLocale(): string {
  return typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en';
}

const ordinalPluralCache = new Map<string, Intl.PluralRules>();

/**
 * English-style ordinal suffixes. Only applied for English locales — inventing
 * suffixes for languages whose ordinals do not work this way would be worse
 * than omitting them, so other locales get the bare number.
 */
function ordinal(value: number, locale: string | string[] | undefined): string {
  const tag = Array.isArray(locale) ? locale[0] : locale;
  const resolved = tag ?? navigatorLocale();
  if (!/^en\b/i.test(resolved)) return String(value);

  let rules = ordinalPluralCache.get(resolved);
  if (!rules) {
    rules = new Intl.PluralRules(resolved, { type: 'ordinal' });
    ordinalPluralCache.set(resolved, rules);
  }
  const suffixes: Partial<Record<Intl.LDMLPluralRule, string>> = { one: 'st', two: 'nd', few: 'rd' };
  return `${value}${suffixes[rules.select(value)] ?? 'th'}`;
}

function pad(value: number, length = 2): string {
  return Math.abs(value).toString().padStart(length, '0');
}

function expand(token: FormatToken, date: PlainDate, context: FormatContext): string {
  const { locale } = context;
  const utc = Date.UTC(date.year, date.month, date.day);

  switch (token) {
    case 'yyyy': return pad(date.year, 4);
    case 'yy': return pad(date.year, 4).slice(-2);

    case 'mmmm': return context.monthNames?.[date.month] ?? formatter(locale, { month: 'long', timeZone: 'UTC' }).format(utc);
    case 'mmm': return context.monthNamesShort?.[date.month] ?? formatter(locale, { month: 'short', timeZone: 'UTC' }).format(utc);
    case 'mm': return pad(date.month + 1);
    case 'mx': return ordinal(date.month + 1, locale);
    case 'm': return String(date.month + 1);

    case 'wwww': return formatter(locale, { weekday: 'long', timeZone: 'UTC' }).format(utc);
    case 'www': return formatter(locale, { weekday: 'short', timeZone: 'UTC' }).format(utc);
    case 'ww': return formatter(locale, { weekday: 'narrow', timeZone: 'UTC' }).format(utc);
    case 'w': return String(date.weekday);

    case 'dddd': return pad(date.dayOfYear, 3);
    case 'dddx': return ordinal(date.dayOfYear, locale);
    case 'ddd': return String(date.dayOfYear);
    case 'dd': return pad(date.day);
    case 'dx': return ordinal(date.day, locale);
    case 'd': return String(date.day);
  }
}

/**
 * Render `date` using a dateSquirrel pattern.
 *
 * @example format(date, 'dx mmm yyyy')          // "27th Jul 2026"
 * @example format(date, 'yyyy-mm')              // "2026-07"
 * @example format(date, 'wwww, dx mmmm yyyy')   // "Monday, 27th July 2026"
 * @example format(date, '\\d\\a\\y: d')         // "day: 27"  (\ escapes literals)
 */
export function format(date: PlainDate, pattern = 'yyyy-mm-dd', context: FormatContext = {}): string {
  let out = '';
  let index = 0;

  while (index < pattern.length) {
    const char = pattern[index]!;

    if (char === '\\') {
      // Escape: emit the next character verbatim, or a trailing backslash as-is.
      out += pattern[index + 1] ?? '\\';
      index += 2;
      continue;
    }

    const token = TOKENS.find((candidate) => pattern.startsWith(candidate, index));
    if (token) {
      out += expand(token, date, context);
      index += token.length;
      continue;
    }

    out += char;
    index += 1;
  }

  return out;
}

/** The tokens a pattern uses, in order of appearance. Used to infer parse order. */
export function patternTokens(pattern: string): FormatToken[] {
  const found: FormatToken[] = [];
  let index = 0;
  while (index < pattern.length) {
    if (pattern[index] === '\\') {
      index += 2;
      continue;
    }
    const token = TOKENS.find((candidate) => pattern.startsWith(candidate, index));
    if (token) {
      found.push(token);
      index += token.length;
    } else {
      index += 1;
    }
  }
  return found;
}
