import { describe, expect, it } from 'vitest';
import {
  PlainDate,
  clamp,
  daysBetween,
  daysInMonth,
  isLeapYear,
  monthsBetween,
} from '../src/core/plain-date.js';

describe('isLeapYear', () => {
  it('follows the Gregorian rule, including the century exceptions', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2023)).toBe(false);
    expect(isLeapYear(1900)).toBe(false); // divisible by 100, not 400
    expect(isLeapYear(2000)).toBe(true); // divisible by 400
  });
});

describe('daysInMonth', () => {
  it('handles February in both leap and common years', () => {
    expect(daysInMonth(2024, 1)).toBe(29);
    expect(daysInMonth(2023, 1)).toBe(28);
  });

  it('returns the right length for every month', () => {
    const lengths = Array.from({ length: 12 }, (_, m) => daysInMonth(2023, m));
    expect(lengths).toEqual([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
  });
});

describe('PlainDate construction', () => {
  it('is immutable', () => {
    const date = new PlainDate(2026, 6, 27);
    expect(() => {
      (date as { day: number }).day = 1;
    }).toThrow();
  });

  it('clamps an overflowing day to the end of the month', () => {
    // The documented 0.x idiom `{ d: 32 }` means "last day of the month".
    expect(new PlainDate(2026, 1, 32).day).toBe(28);
    expect(new PlainDate(2024, 1, 32).day).toBe(29);
    expect(new PlainDate(2026, 3, 31).day).toBe(30);
  });

  it('rolls an overflowing month into the following year', () => {
    const date = new PlainDate(2026, 12, 1);
    expect(date.year).toBe(2027);
    expect(date.month).toBe(0);
  });

  it('rejects non-finite input rather than producing an Invalid Date', () => {
    expect(() => new PlainDate(Number.NaN, 0, 1)).toThrow(RangeError);
  });
});

describe('PlainDate.from', () => {
  it('accepts ISO dates, months and years', () => {
    expect(PlainDate.from('2026-07-27')?.toString()).toBe('2026-07-27');
    expect(PlainDate.from('2026-07')?.toString()).toBe('2026-07-01');
    expect(PlainDate.from('2026')?.toString()).toBe('2026-01-01');
  });

  it('accepts a native Date without timezone drift', () => {
    const parsed = PlainDate.from(new Date(2026, 6, 27));
    expect(parsed?.toString()).toBe('2026-07-27');
  });

  it('accepts both the legacy {y,m,d} and the explicit {year,month,day} shapes', () => {
    expect(PlainDate.from({ y: 2026, m: 6, d: 27 })?.toString()).toBe('2026-07-27');
    expect(PlainDate.from({ year: 2026, month: 6, day: 27 })?.toString()).toBe('2026-07-27');
  });

  it('treats a bare number as a year, matching disabledDates: [2006]', () => {
    expect(PlainDate.from(2006)?.year).toBe(2006);
  });

  it('returns null for unusable input instead of throwing', () => {
    expect(PlainDate.from('not a date')).toBeNull();
    expect(PlainDate.from(new Date('nonsense'))).toBeNull();
    expect(PlainDate.from(null)).toBeNull();
    expect(PlainDate.from({})).toBeNull();
  });
});

describe('PlainDate arithmetic', () => {
  it('clamps the day when adding months, rather than rolling over', () => {
    // 0.x used Date.setMonth here, which turns 31 Jan + 1 month into 3 March.
    expect(new PlainDate(2026, 0, 31).addMonths(1).toString()).toBe('2026-02-28');
    expect(new PlainDate(2024, 0, 31).addMonths(1).toString()).toBe('2024-02-29');
  });

  it('crosses year boundaries in both directions', () => {
    expect(new PlainDate(2026, 11, 15).addMonths(1).toString()).toBe('2027-01-15');
    expect(new PlainDate(2026, 0, 15).addMonths(-1).toString()).toBe('2025-12-15');
    expect(new PlainDate(2026, 5, 15).addMonths(-18).toString()).toBe('2024-12-15');
  });

  it('adds days across months and leap days', () => {
    expect(new PlainDate(2026, 0, 31).addDays(1).toString()).toBe('2026-02-01');
    expect(new PlainDate(2024, 1, 28).addDays(1).toString()).toBe('2024-02-29');
    expect(new PlainDate(2026, 0, 1).addDays(-1).toString()).toBe('2025-12-31');
  });

  it('never mutates the receiver', () => {
    const original = new PlainDate(2026, 6, 27);
    original.addMonths(3);
    original.addDays(10);
    expect(original.toString()).toBe('2026-07-27');
  });

  it('reports month boundaries', () => {
    const date = new PlainDate(2026, 1, 14);
    expect(date.startOfMonth().toString()).toBe('2026-02-01');
    expect(date.endOfMonth().toString()).toBe('2026-02-28');
  });
});

describe('PlainDate comparison', () => {
  it('orders and compares by calendar date only', () => {
    const early = new PlainDate(2026, 0, 1);
    const late = new PlainDate(2026, 11, 31);
    expect(early.isBefore(late)).toBe(true);
    expect(late.isAfter(early)).toBe(true);
    expect(early.compare(late)).toBeLessThan(0);
    expect(early.equals(new PlainDate(2026, 0, 1))).toBe(true);
  });

  it('treats isBetween as inclusive and bound-order agnostic', () => {
    const target = new PlainDate(2026, 5, 15);
    const start = new PlainDate(2026, 0, 1);
    const end = new PlainDate(2026, 11, 31);
    expect(target.isBetween(start, end)).toBe(true);
    expect(target.isBetween(end, start)).toBe(true);
    expect(start.isBetween(start, end)).toBe(true);
    expect(end.isBetween(start, end)).toBe(true);
    expect(new PlainDate(2027, 0, 1).isBetween(start, end)).toBe(false);
  });
});

describe('serialisation', () => {
  it('produces ISO strings', () => {
    const date = new PlainDate(2026, 6, 27);
    expect(date.toString()).toBe('2026-07-27');
    expect(date.toISOMonth()).toBe('2026-07');
    expect(JSON.stringify({ date })).toBe('{"date":"2026-07-27"}');
  });

  it('computes the day of the year across a leap boundary', () => {
    expect(new PlainDate(2026, 0, 1).dayOfYear).toBe(1);
    expect(new PlainDate(2026, 11, 31).dayOfYear).toBe(365);
    expect(new PlainDate(2024, 11, 31).dayOfYear).toBe(366);
  });
});

describe('daysBetween', () => {
  it('is exact across a DST transition', () => {
    // A naive millisecond division gets 30.958… here and rounds inconsistently.
    expect(daysBetween(new PlainDate(2026, 2, 1), new PlainDate(2026, 3, 1))).toBe(31);
    expect(daysBetween(new PlainDate(2026, 9, 1), new PlainDate(2026, 10, 1))).toBe(31);
  });

  it('is signed', () => {
    expect(daysBetween(new PlainDate(2026, 0, 10), new PlainDate(2026, 0, 1))).toBe(-9);
  });
});

describe('monthsBetween', () => {
  it('counts gross month boundaries by default', () => {
    expect(monthsBetween(new PlainDate(2026, 0, 15), new PlainDate(2026, 5, 15))).toBe(5);
    expect(monthsBetween(new PlainDate(2026, 0, 1), new PlainDate(2027, 0, 1))).toBe(12);
  });

  it('counts only fully contained months when asked', () => {
    // 15 Jan – 20 Mar fully contains February only.
    expect(monthsBetween(new PlainDate(2026, 0, 15), new PlainDate(2026, 2, 20), true)).toBe(1);
    // A whole calendar year contains all twelve.
    expect(monthsBetween(new PlainDate(2026, 0, 1), new PlainDate(2026, 11, 31), true)).toBe(12);
    // A range narrower than a single month contains none.
    expect(monthsBetween(new PlainDate(2026, 0, 10), new PlainDate(2026, 0, 20), true)).toBe(0);
    // Exact month boundaries count that month.
    expect(monthsBetween(new PlainDate(2026, 1, 1), new PlainDate(2026, 1, 28), true)).toBe(1);
  });
});

describe('clamp', () => {
  it('pulls a date into range and leaves in-range dates alone', () => {
    const min = new PlainDate(2026, 0, 1);
    const max = new PlainDate(2026, 11, 31);
    expect(clamp(new PlainDate(2020, 0, 1), min, max).toString()).toBe('2026-01-01');
    expect(clamp(new PlainDate(2030, 0, 1), min, max).toString()).toBe('2026-12-31');
    expect(clamp(new PlainDate(2026, 5, 5), min, max).toString()).toBe('2026-06-05');
    expect(clamp(new PlainDate(2020, 0, 1), null, null).toString()).toBe('2020-01-01');
  });
});
