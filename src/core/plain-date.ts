/**
 * An immutable calendar date with no time and no timezone.
 *
 * The old dateSquirrel passed `Date` objects around and bolted extra properties
 * onto them (`.y`, `.m`, `.d`, `.save`, `.human`), which meant every consumer
 * shared mutable state and a "date" could silently drift by a timezone offset.
 * PlainDate has no time component at all, so none of that is representable.
 *
 * NOTE: `month` is 0-indexed (0 = January), matching `Date` and the documented
 * dateSquirrel option format. Temporal.PlainDate is 1-indexed; if this ever
 * migrates to Temporal, that is the one breaking change to plan for.
 */

export interface PlainDateParts {
  year: number;
  /** 0-indexed: 0 = January, 11 = December. */
  month: number;
  day: number;
}

/**
 * The short-key shape dateSquirrel 0.x used for `start` and `end`, e.g.
 * `{ d: 32, m: 6, y: 2026 }`. Still accepted everywhere `PlainDateParts` is.
 */
export interface LegacyDateParts {
  /** 0-indexed: 0 = January, 11 = December. */
  m?: number;
  d?: number;
  y: number;
}

/** Anything we can coerce into a PlainDate. */
export type PlainDateInput =
  | PlainDate
  | Date
  | Partial<PlainDateParts>
  | LegacyDateParts
  | string
  | number;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_MONTH = /^(\d{4})-(\d{2})$/;
const ISO_YEAR = /^(\d{4})$/;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 1) return isLeapYear(year) ? 29 : 28;
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month] ?? 31;
}

export class PlainDate implements PlainDateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;

  constructor(year: number, month = 0, day = 1) {
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      throw new RangeError(`PlainDate received a non-finite value: ${year}-${month}-${day}`);
    }
    // Normalise overflow the way a calendar would: month 12 -> next January,
    // day 32 -> clamped to the end of the month (the documented dateSquirrel
    // behaviour, where `{ d: 32 }` means "last day of the month").
    const yearShift = Math.floor(month / 12);
    const normalisedYear = Math.trunc(year) + yearShift;
    const normalisedMonth = Math.trunc(month) - yearShift * 12;
    const maxDay = daysInMonth(normalisedYear, normalisedMonth);

    this.year = normalisedYear;
    this.month = normalisedMonth;
    this.day = Math.min(Math.max(Math.trunc(day), 1), maxDay);
    Object.freeze(this);
  }

  static today(): PlainDate {
    const now = new Date();
    return new PlainDate(now.getFullYear(), now.getMonth(), now.getDate());
  }

  /**
   * Coerce a user-supplied value. Returns `null` rather than throwing for
   * unusable input, because these values come from options and HTML attributes.
   */
  static from(value: PlainDateInput | null | undefined): PlainDate | null {
    if (value == null) return null;
    if (value instanceof PlainDate) return value;

    if (value instanceof Date) {
      return Number.isNaN(value.getTime())
        ? null
        : new PlainDate(value.getFullYear(), value.getMonth(), value.getDate());
    }

    if (typeof value === 'number') {
      // A bare number is a year (matching `disabledDates: [2006]`).
      return Number.isFinite(value) ? new PlainDate(value, 0, 1) : null;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      const asDate = ISO_DATE.exec(trimmed);
      if (asDate) return new PlainDate(+asDate[1]!, +asDate[2]! - 1, +asDate[3]!);
      const asMonth = ISO_MONTH.exec(trimmed);
      if (asMonth) return new PlainDate(+asMonth[1]!, +asMonth[2]! - 1, 1);
      const asYear = ISO_YEAR.exec(trimmed);
      if (asYear) return new PlainDate(+asYear[1]!, 0, 1);
      return null;
    }

    // A `{ y, m, d }`-ish object. Both the legacy short keys and long keys work.
    const parts = value as Partial<PlainDateParts> & { y?: number; m?: number; d?: number };
    const year = parts.year ?? parts.y;
    if (year == null || !Number.isFinite(year)) return null;
    return new PlainDate(year, parts.month ?? parts.m ?? 0, parts.day ?? parts.d ?? 1);
  }

  /** 0 = Sunday .. 6 = Saturday, matching `Date.prototype.getDay`. */
  get weekday(): number {
    return this.toDate().getDay();
  }

  /** 1 = Monday .. 7 = Sunday, matching ISO 8601. */
  get isoWeekday(): number {
    return this.weekday === 0 ? 7 : this.weekday;
  }

  get daysInMonth(): number {
    return daysInMonth(this.year, this.month);
  }

  /** A sortable integer, e.g. 2026-07-27 -> 20260727. Cheaper than Date maths. */
  get ordinal(): number {
    return this.year * 10000 + this.month * 100 + this.day;
  }

  /** Local midnight. Only for interop — never used for internal arithmetic. */
  toDate(): Date {
    return new Date(this.year, this.month, this.day);
  }

  toParts(): PlainDateParts {
    return { year: this.year, month: this.month, day: this.day };
  }

  /** ISO 8601 calendar date, e.g. "2026-07-27". */
  toString(): string {
    return `${pad(this.year, 4)}-${pad(this.month + 1)}-${pad(this.day)}`;
  }

  toJSON(): string {
    return this.toString();
  }

  /** ISO 8601 year-month, e.g. "2026-07". The natural value for `mode: 'ym'`. */
  toISOMonth(): string {
    return `${pad(this.year, 4)}-${pad(this.month + 1)}`;
  }

  with(parts: Partial<PlainDateParts>): PlainDate {
    return new PlainDate(
      parts.year ?? this.year,
      parts.month ?? this.month,
      parts.day ?? this.day,
    );
  }

  addDays(count: number): PlainDate {
    if (count === 0) return this;
    const shifted = new Date(this.year, this.month, this.day + count);
    return new PlainDate(shifted.getFullYear(), shifted.getMonth(), shifted.getDate());
  }

  /**
   * Add months, clamping the day to the target month's length so 31 Jan + 1
   * month is 28/29 Feb rather than rolling into March.
   */
  addMonths(count: number): PlainDate {
    if (count === 0) return this;
    const total = this.month + count;
    const yearShift = Math.floor(total / 12);
    const year = this.year + yearShift;
    const month = total - yearShift * 12;
    return new PlainDate(year, month, Math.min(this.day, daysInMonth(year, month)));
  }

  addYears(count: number): PlainDate {
    return this.addMonths(count * 12);
  }

  /** First day of this date's month. */
  startOfMonth(): PlainDate {
    return new PlainDate(this.year, this.month, 1);
  }

  /** Last day of this date's month. */
  endOfMonth(): PlainDate {
    return new PlainDate(this.year, this.month, daysInMonth(this.year, this.month));
  }

  /** Negative if this is earlier, 0 if equal, positive if later. */
  compare(other: PlainDate): number {
    return this.ordinal - other.ordinal;
  }

  equals(other: PlainDate | null | undefined): boolean {
    return other != null && this.ordinal === other.ordinal;
  }

  isBefore(other: PlainDate): boolean {
    return this.ordinal < other.ordinal;
  }

  isAfter(other: PlainDate): boolean {
    return this.ordinal > other.ordinal;
  }

  /** Inclusive of both bounds. Order of the bounds does not matter. */
  isBetween(start: PlainDate, end: PlainDate): boolean {
    const low = Math.min(start.ordinal, end.ordinal);
    const high = Math.max(start.ordinal, end.ordinal);
    return this.ordinal >= low && this.ordinal <= high;
  }

  isSameMonth(other: PlainDate): boolean {
    return this.year === other.year && this.month === other.month;
  }

  /** 1-based day of the year. 1 Jan = 1. */
  get dayOfYear(): number {
    let total = this.day;
    for (let m = 0; m < this.month; m++) total += daysInMonth(this.year, m);
    return total;
  }
}

/** Whole days from `start` to `end`. Negative if `end` precedes `start`. */
export function daysBetween(start: PlainDate, end: PlainDate): number {
  const MS_PER_DAY = 86_400_000;
  const from = Date.UTC(start.year, start.month, start.day);
  const to = Date.UTC(end.year, end.month, end.day);
  return Math.round((to - from) / MS_PER_DAY);
}

/**
 * Whole calendar months from `start` to `end`.
 * With `whole: false` this counts month boundaries crossed; with `whole: true`
 * it counts only months fully contained in the range.
 */
export function monthsBetween(start: PlainDate, end: PlainDate, whole = false): number {
  if (!whole) return (end.year - start.year) * 12 + (end.month - start.month);

  // Work in absolute month indices and find the first and last months that the
  // range covers end to end, then count inclusively.
  const firstWhole = start.year * 12 + start.month + (start.day === 1 ? 0 : 1);
  const lastWhole = end.year * 12 + end.month - (end.day === end.daysInMonth ? 0 : 1);
  return Math.max(lastWhole - firstWhole + 1, 0);
}

/** Clamp `date` into the inclusive range `[min, max]`. */
export function clamp(date: PlainDate, min: PlainDate | null, max: PlainDate | null): PlainDate {
  if (min && date.isBefore(min)) return min;
  if (max && date.isAfter(max)) return max;
  return date;
}

function pad(value: number, length = 2): string {
  const negative = value < 0;
  const digits = Math.abs(value).toString().padStart(length, '0');
  return negative ? `-${digits}` : digits;
}
