/**
 * Disabled-date matching.
 *
 * The old implementation (`tagDisabled`) eagerly expanded every rule into Sets
 * of `"2019/0/31"` strings covering the entire selectable range, in ~140 lines
 * of branching that carried a `// range is years && months [bug]` comment and
 * could allocate tens of thousands of strings for a wide range.
 *
 * Here a rule stays a rule and is evaluated on demand. A month view asks about
 * at most 31 days, so a lazy check is both faster and — more importantly —
 * simple enough to be obviously correct.
 */

import { PlainDate, daysInMonth } from './plain-date.js';
import type { PlainDateInput } from './plain-date.js';

/** 0 = Sunday .. 6 = Saturday. */
const WEEKDAY_INDEX: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

/** Matches the legacy recurring "mm/dd" form, where month is 0-indexed. */
const RECURRING_LEGACY = /^(\d{1,2})\/(\d{1,2})$/;
/** Matches the ISO 8601 recurring form "--MM-DD", where month is 1-indexed. */
const RECURRING_ISO = /^--(\d{2})-(\d{2})$/;
/** Matches a 3-letter weekday name, optionally longer ("wednesday"). */
const WEEKDAY_NAME = /^([a-z]{3})[a-z]*$/i;

export type DisabledRule =
  | { kind: 'weekday'; weekday: number }
  | { kind: 'monthDay'; month: number; day: number }
  | { kind: 'date'; date: PlainDate }
  | { kind: 'range'; start: PlainDate; end: PlainDate }
  | { kind: 'year'; year: number }
  | { kind: 'month'; month: number }
  | { kind: 'predicate'; test: (date: PlainDate) => boolean };

/** A range expressed as an object rather than a positional tuple. */
export interface DisabledRangeObject {
  from: PlainDateInput;
  to: PlainDateInput;
}

export type DisabledDateSpec =
  | PlainDateInput
  | [PlainDateInput, PlainDateInput]
  | DisabledRangeObject
  | ((date: PlainDate) => boolean);

export interface ParseDisabledResult {
  rules: DisabledRule[];
  /** Specs we could not understand, so callers can warn once rather than per-cell. */
  invalid: unknown[];
}

/** Turn the user's heterogeneous `disabledDates` array into typed rules. */
export function parseDisabledDates(specs: readonly DisabledDateSpec[] | false | null | undefined): ParseDisabledResult {
  const rules: DisabledRule[] = [];
  const invalid: unknown[] = [];
  if (!specs || !Array.isArray(specs)) return { rules, invalid };

  for (const spec of specs) {
    const rule = parseOne(spec);
    if (rule) rules.push(rule);
    else invalid.push(spec);
  }
  return { rules, invalid };
}

function parseOne(spec: DisabledDateSpec): DisabledRule | null {
  if (typeof spec === 'function') {
    return { kind: 'predicate', test: spec as (date: PlainDate) => boolean };
  }

  if (typeof spec === 'number') {
    // A fractional year or month is not a thing; report it rather than truncate.
    if (!Number.isInteger(spec)) return null;
    // Legacy convention: >2 digits is a whole year, otherwise a recurring month.
    if (Math.abs(spec) > 99) return { kind: 'year', year: spec };
    if (spec >= 0 && spec <= 11) return { kind: 'month', month: spec };
    return null;
  }

  if (typeof spec === 'string') {
    const value = spec.trim();

    const iso = RECURRING_ISO.exec(value);
    if (iso) {
      const month = +iso[1]! - 1;
      const day = +iso[2]!;
      return isValidMonthDay(month, day) ? { kind: 'monthDay', month, day } : null;
    }

    const legacy = RECURRING_LEGACY.exec(value);
    if (legacy) {
      const month = +legacy[1]!;
      const day = +legacy[2]!;
      return isValidMonthDay(month, day) ? { kind: 'monthDay', month, day } : null;
    }

    const weekday = WEEKDAY_NAME.exec(value);
    if (weekday) {
      const index = WEEKDAY_INDEX[weekday[1]!.toLowerCase()];
      if (index !== undefined) return { kind: 'weekday', weekday: index };
    }

    // Fall through to ISO date / month / year strings.
    const date = PlainDate.from(value);
    if (date) {
      if (/^\d{4}$/.test(value)) return { kind: 'year', year: date.year };
      return { kind: 'date', date };
    }
    return null;
  }

  if (Array.isArray(spec)) {
    if (spec.length !== 2) return null;
    const start = PlainDate.from(spec[0]);
    const end = PlainDate.from(spec[1]);
    if (!start || !end) return null;
    return start.isAfter(end)
      ? { kind: 'range', start: end, end: start }
      : { kind: 'range', start, end };
  }

  if (spec instanceof PlainDate || spec instanceof Date) {
    const date = PlainDate.from(spec);
    return date ? { kind: 'date', date } : null;
  }

  if (typeof spec === 'object' && spec !== null) {
    const asRange = spec as Partial<DisabledRangeObject>;
    if ('from' in asRange && 'to' in asRange) {
      const start = PlainDate.from(asRange.from);
      const end = PlainDate.from(asRange.to);
      if (!start || !end) return null;
      return start.isAfter(end)
        ? { kind: 'range', start: end, end: start }
        : { kind: 'range', start, end };
    }
    const date = PlainDate.from(spec as PlainDateInput);
    return date ? { kind: 'date', date } : null;
  }

  return null;
}

function isValidMonthDay(month: number, day: number): boolean {
  // Use a leap year so 29 Feb is accepted as a recurring date.
  return month >= 0 && month <= 11 && day >= 1 && day <= daysInMonth(2000, month);
}

function matchesRule(date: PlainDate, rule: DisabledRule): boolean {
  switch (rule.kind) {
    case 'weekday':
      return date.weekday === rule.weekday;
    case 'monthDay':
      return date.month === rule.month && date.day === rule.day;
    case 'date':
      return date.equals(rule.date);
    case 'range':
      return date.isBetween(rule.start, rule.end);
    case 'year':
      return date.year === rule.year;
    case 'month':
      return date.month === rule.month;
    case 'predicate':
      return rule.test(date) === true;
  }
}

export interface SelectabilityOptions {
  min: PlainDate | null;
  max: PlainDate | null;
  rules: readonly DisabledRule[];
}

/**
 * Answers "can this be picked?" for days, months and years.
 *
 * Month and year answers are derived by scanning their contents rather than
 * being maintained as a separate parallel data structure, which is what made
 * the original implementation drift out of sync with the day-level answer.
 * Results are memoised per instance because list rendering asks repeatedly.
 */
export class Selectability {
  private readonly min: PlainDate | null;
  private readonly max: PlainDate | null;
  private readonly rules: readonly DisabledRule[];
  private readonly monthCache = new Map<number, boolean>();
  private readonly yearCache = new Map<number, boolean>();
  /** True when nothing can ever be excluded, enabling a fast path. */
  private readonly unrestricted: boolean;

  constructor(options: SelectabilityOptions) {
    this.min = options.min;
    this.max = options.max;
    this.rules = options.rules;
    this.unrestricted = !options.min && !options.max && options.rules.length === 0;
  }

  isDayInRange(date: PlainDate): boolean {
    if (this.min && date.isBefore(this.min)) return false;
    if (this.max && date.isAfter(this.max)) return false;
    return true;
  }

  isDaySelectable(date: PlainDate): boolean {
    if (this.unrestricted) return true;
    if (!this.isDayInRange(date)) return false;
    for (const rule of this.rules) {
      if (matchesRule(date, rule)) return false;
    }
    return true;
  }

  /** True if at least one day in the month can be picked. */
  isMonthSelectable(year: number, month: number): boolean {
    if (this.unrestricted) return true;
    const key = year * 12 + month;
    const cached = this.monthCache.get(key);
    if (cached !== undefined) return cached;

    let selectable = false;
    const total = daysInMonth(year, month);
    for (let day = 1; day <= total; day++) {
      if (this.isDaySelectable(new PlainDate(year, month, day))) {
        selectable = true;
        break;
      }
    }
    this.monthCache.set(key, selectable);
    return selectable;
  }

  /** True if at least one day in the year can be picked. */
  isYearSelectable(year: number): boolean {
    if (this.unrestricted) return true;
    const cached = this.yearCache.get(year);
    if (cached !== undefined) return cached;

    let selectable = false;
    for (let month = 0; month < 12; month++) {
      if (this.isMonthSelectable(year, month)) {
        selectable = true;
        break;
      }
    }
    this.yearCache.set(year, selectable);
    return selectable;
  }

  /** The first selectable day in a month, or null if the month is fully excluded. */
  firstSelectableDayIn(year: number, month: number): PlainDate | null {
    const total = daysInMonth(year, month);
    for (let day = 1; day <= total; day++) {
      const candidate = new PlainDate(year, month, day);
      if (this.isDaySelectable(candidate)) return candidate;
    }
    return null;
  }

  /** The first selectable month in a year, or null if the year is fully excluded. */
  firstSelectableMonthIn(year: number): number | null {
    for (let month = 0; month < 12; month++) {
      if (this.isMonthSelectable(year, month)) return month;
    }
    return null;
  }
}
