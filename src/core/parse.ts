/**
 * Free-text date parsing, for when the user types instead of picking.
 *
 * Notable fixes over dateSquirrel 0.x:
 *  - a delimiter is no longer required. The old parser opened with
 *    `if (delimiter) { ... } else { return false }`, so a year-only picker
 *    could not accept "2027" and a month picker could not accept "March".
 *  - month names are matched in the active locale, not just English.
 *  - partial dates are first-class: "2027" and "Mar 2027" resolve for the
 *    `y` and `ym` modes rather than being rejected as "too few parts".
 */

import { PlainDate } from './plain-date.js';
import { monthNames } from './format.js';

/** Expected ordering of ambiguous numeric parts. */
export type ParseRule = 'dmy' | 'mdy' | 'ymd' | 'ydm';

export interface ParseOptions {
  rule?: ParseRule;
  locale?: string | string[] | undefined;
  /** Overrides locale month names when matching text like "Mar". */
  monthNames?: readonly string[] | undefined;
  /** Reference year used to expand 2-digit years and to fill a missing year. */
  referenceYear?: number;
}

export interface ParsedDate {
  year: number;
  /** 0-indexed, or null when the text carried no month. */
  month: number | null;
  /** null when the text carried no day. */
  day: number | null;
}

const DELIMITERS = /[\s./\-:;,]+/;
const ISO_DATE = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
const ISO_MONTH = /^(\d{4})-(\d{1,2})$/;
const COMPACT_8 = /^(\d{8})$/;

const EN_MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;
const EN_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;
const EN_WEEKDAYS_LONG = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const;
const EN_WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Lowercase, strip diacritics and punctuation, so "Juil." matches "juillet". */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');
}

/**
 * Match a token against groups of candidate names, in priority order.
 *
 * Exact matches are tried across all groups before any prefix matching, and a
 * prefix only counts when it identifies exactly one candidate. The old parser
 * compared `token.substring(0, 3)` against a name list, which silently picked
 * the wrong month in any locale with a colliding 3-letter prefix — French
 * "juin" and "juillet" both begin "jui", so every July parsed as June.
 */
function matchName(token: string, groups: readonly (readonly string[])[]): number | null {
  const needle = normalise(token);
  if (needle.length < 2) return null;

  for (const group of groups) {
    const index = group.findIndex((name) => normalise(name) === needle);
    if (index !== -1) return index;
  }

  for (const group of groups) {
    let found: number | null = null;
    for (let index = 0; index < group.length; index++) {
      if (normalise(group[index] ?? '').startsWith(needle)) {
        if (found !== null) {
          found = null; // ambiguous within this group
          break;
        }
        found = index;
      }
    }
    if (found !== null) return found;
  }

  return null;
}

/**
 * Parse free text into whatever parts it actually contained.
 * Returns `null` if the text cannot be read as a date at all.
 */
export function parseDateParts(input: string, options: ParseOptions = {}): ParsedDate | null {
  const { rule = 'dmy', locale, referenceYear = new Date().getFullYear() } = options;
  if (typeof input !== 'string') return null;

  const cleaned = input.trim().replace(/[()[\]]/g, '');
  if (!cleaned) return null;

  // ISO forms are unambiguous, so they bypass the rule ordering entirely.
  const isoDate = ISO_DATE.exec(cleaned);
  if (isoDate) return finalise(+isoDate[1]!, +isoDate[2]! - 1, +isoDate[3]!);
  const isoMonth = ISO_MONTH.exec(cleaned);
  if (isoMonth) return finalise(+isoMonth[1]!, +isoMonth[2]! - 1, null);
  const compact = COMPACT_8.exec(cleaned);
  if (compact) {
    const digits = compact[1]!;
    return finalise(+digits.slice(0, 4), +digits.slice(4, 6) - 1, +digits.slice(6, 8));
  }

  const monthGroups = monthCandidates(locale, options.monthNames);
  const weekdayGroups = weekdayCandidates(locale);

  // Split, then classify each token rather than assuming positions up front.
  const tokens = cleaned.split(DELIMITERS).filter(Boolean);
  if (tokens.length === 0 || tokens.length > 4) return null;

  let month: number | null = null;
  let year: number | null = null;
  const numeric: string[] = [];

  for (const token of tokens) {
    // A textual month is self-identifying, so consume it wherever it appears.
    // Months are tested before weekdays because names collide across the two
    // in several locales (French "mars" the month vs "mardi" the weekday).
    const asMonth = matchName(token, monthGroups);
    if (asMonth !== null) {
      month = asMonth;
      continue;
    }
    // Weekday names carry no information we need; drop them.
    if (matchName(token, weekdayGroups) !== null) continue;

    const digits = token.replace(/\D/g, '');
    if (!digits) continue;

    // A 4-digit token can only be a year.
    if (digits.length === 4) {
      year = +digits;
      continue;
    }
    numeric.push(digits);
  }

  // Assign whatever numeric tokens are left according to the rule, skipping
  // any slot already filled by a textual month or a 4-digit year.
  const slots = ruleToSlots(rule).filter((slot) => {
    if (slot === 'm' && month !== null) return false;
    if (slot === 'y' && year !== null) return false;
    return true;
  });

  let day: number | null = null;
  for (let i = 0; i < numeric.length; i++) {
    const slot = slots[i];
    if (!slot) return null; // more numbers than slots
    const value = +numeric[i]!;
    if (slot === 'd') day = value;
    else if (slot === 'm') month = value - 1; // typed months are 1-indexed
    else year = expandYear(numeric[i]!, referenceYear);
  }

  if (year === null && month === null && day === null) return null;

  // A lone number that landed in the day slot but reads as a year (e.g. "2027"
  // handled above) or a lone month name with no year: fill from the reference.
  if (year === null) year = referenceYear;

  return finalise(year, month, day);
}

/**
 * Parse free text into a complete `PlainDate`, filling missing parts with
 * sensible defaults (January, the 1st). Returns `null` if nothing parses.
 */
export function parseDate(input: string, options: ParseOptions = {}): PlainDate | null {
  const parts = parseDateParts(input, options);
  if (!parts) return null;
  const month = parts.month ?? 0;
  const day = parts.day ?? 1;
  // Reject genuinely impossible input rather than silently clamping it.
  if (month < 0 || month > 11) return null;
  if (day < 1 || day > 31) return null;
  return new PlainDate(parts.year, month, day);
}

function finalise(year: number, month: number | null, day: number | null): ParsedDate | null {
  if (!Number.isFinite(year)) return null;
  if (month !== null && (month < 0 || month > 11)) return null;
  if (day !== null && (day < 1 || day > 31)) return null;
  return { year, month, day };
}

const monthCandidateCache = new Map<string, readonly string[][]>();
const weekdayCandidateCache = new Map<string, readonly string[][]>();

/**
 * Candidate month names in priority order: caller-supplied, then the locale's
 * long and short forms, then English. English stays in the list because stored
 * values and hand-written patterns are so often English regardless of locale.
 */
function monthCandidates(
  locale: string | string[] | undefined,
  override: readonly string[] | undefined,
): readonly string[][] {
  const key = JSON.stringify(locale ?? null);
  let cached = monthCandidateCache.get(key);
  if (!cached) {
    cached = [
      monthNames(locale, 'long'),
      monthNames(locale, 'short'),
      [...EN_MONTHS_LONG],
      [...EN_MONTHS_SHORT],
    ];
    monthCandidateCache.set(key, cached);
  }
  return override ? [[...override], ...cached] : cached;
}

function weekdayCandidates(locale: string | string[] | undefined): readonly string[][] {
  const key = JSON.stringify(locale ?? null);
  let cached = weekdayCandidateCache.get(key);
  if (!cached) {
    const long = new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' });
    const short = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' });
    // 2 Jan 2000 was a Sunday, so this indexes 0 = Sunday.
    cached = [
      Array.from({ length: 7 }, (_, day) => long.format(Date.UTC(2000, 0, 2 + day))),
      Array.from({ length: 7 }, (_, day) => short.format(Date.UTC(2000, 0, 2 + day))),
      [...EN_WEEKDAYS_LONG],
      [...EN_WEEKDAYS_SHORT],
    ];
    weekdayCandidateCache.set(key, cached);
  }
  return cached;
}

function ruleToSlots(rule: ParseRule): ('d' | 'm' | 'y')[] {
  return rule.split('') as ('d' | 'm' | 'y')[];
}

/**
 * Expand a 2-digit year. Values above the current 2-digit year are treated as
 * last century, matching dateSquirrel 0.x — so in 2026, "27" is 1927 and
 * "24" is 2024. Sensible for dates of birth, which is the common case here.
 */
function expandYear(digits: string, referenceYear: number): number {
  if (digits.length >= 3) return +digits;
  const century = Math.floor(referenceYear / 100) * 100;
  const pivot = referenceYear % 100;
  const value = +digits;
  return value > pivot ? century - 100 + value : century + value;
}
