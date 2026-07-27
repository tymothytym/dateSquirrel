import { describe, expect, it } from 'vitest';
import { Selectability, parseDisabledDates } from '../src/core/disabled.js';
import { PlainDate } from '../src/core/plain-date.js';

const at = (year: number, month: number, day: number) => new PlainDate(year, month, day);

function build(specs: Parameters<typeof parseDisabledDates>[0], min?: PlainDate, max?: PlainDate) {
  const { rules } = parseDisabledDates(specs);
  return new Selectability({ min: min ?? null, max: max ?? null, rules });
}

describe('rule parsing', () => {
  it('recognises every 0.x spec form', () => {
    const { rules, invalid } = parseDisabledDates([
      'wed',
      '11/25',
      new Date(2019, 0, 31),
      [new Date(2008, 3, 15), new Date(2008, 4, 14)],
      2006,
      5,
    ]);
    expect(invalid).toEqual([]);
    expect(rules.map((rule) => rule.kind)).toEqual([
      'weekday', 'monthDay', 'date', 'range', 'year', 'month',
    ]);
  });

  it('collects unrecognised specs instead of logging per cell', () => {
    const { rules, invalid } = parseDisabledDates(['nonsense', 999.5 as never, 'wed']);
    expect(rules).toHaveLength(1);
    expect(invalid).toHaveLength(2);
  });

  it('accepts the newer spec forms too', () => {
    const { rules, invalid } = parseDisabledDates([
      '--12-25',
      '2026-07-27',
      { from: '2026-01-01', to: '2026-01-31' },
      (date) => date.year === 2030,
    ]);
    expect(invalid).toEqual([]);
    expect(rules.map((rule) => rule.kind)).toEqual(['monthDay', 'date', 'range', 'predicate']);
  });

  it('normalises a reversed range rather than matching nothing', () => {
    const { rules } = parseDisabledDates([[new Date(2026, 5, 1), new Date(2026, 0, 1)]]);
    expect(rules[0]).toMatchObject({ kind: 'range' });
    const selectability = build([[new Date(2026, 5, 1), new Date(2026, 0, 1)]]);
    expect(selectability.isDaySelectable(at(2026, 2, 15))).toBe(false);
  });

  it('treats false and null as no rules', () => {
    expect(parseDisabledDates(false).rules).toEqual([]);
    expect(parseDisabledDates(null).rules).toEqual([]);
    expect(parseDisabledDates(undefined).rules).toEqual([]);
  });
});

describe('range bounds', () => {
  it('excludes dates outside min/max inclusively', () => {
    const selectability = build(false, at(2026, 0, 10), at(2026, 0, 20));
    expect(selectability.isDaySelectable(at(2026, 0, 9))).toBe(false);
    expect(selectability.isDaySelectable(at(2026, 0, 10))).toBe(true);
    expect(selectability.isDaySelectable(at(2026, 0, 20))).toBe(true);
    expect(selectability.isDaySelectable(at(2026, 0, 21))).toBe(false);
  });

  it('reports a month partly inside the range as selectable', () => {
    const selectability = build(false, at(2026, 0, 25), at(2026, 2, 5));
    expect(selectability.isMonthSelectable(2026, 0)).toBe(true); // last week only
    expect(selectability.isMonthSelectable(2026, 1)).toBe(true); // fully inside
    expect(selectability.isMonthSelectable(2026, 2)).toBe(true); // first week only
    expect(selectability.isMonthSelectable(2026, 3)).toBe(false);
    expect(selectability.isMonthSelectable(2025, 11)).toBe(false);
  });

  it('reports a year partly inside the range as selectable', () => {
    const selectability = build(false, at(2026, 11, 20), at(2027, 0, 5));
    expect(selectability.isYearSelectable(2026)).toBe(true);
    expect(selectability.isYearSelectable(2027)).toBe(true);
    expect(selectability.isYearSelectable(2025)).toBe(false);
    expect(selectability.isYearSelectable(2028)).toBe(false);
  });
});

describe('recurring weekdays', () => {
  it('excludes every occurrence of a weekday', () => {
    const selectability = build(['wed']);
    // 1 July 2026 is a Wednesday.
    expect(selectability.isDaySelectable(at(2026, 6, 1))).toBe(false);
    expect(selectability.isDaySelectable(at(2026, 6, 8))).toBe(false);
    expect(selectability.isDaySelectable(at(2026, 6, 2))).toBe(true);
  });

  it('accepts full weekday names as well as the 3-letter form', () => {
    const selectability = build(['wednesday']);
    expect(selectability.isDaySelectable(at(2026, 6, 1))).toBe(false);
  });

  it('leaves the month selectable when only some days are excluded', () => {
    const selectability = build(['wed']);
    expect(selectability.isMonthSelectable(2026, 6)).toBe(true);
  });

  it('makes a month unselectable when every weekday in it is excluded', () => {
    const all = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const selectability = build(all);
    expect(selectability.isMonthSelectable(2026, 6)).toBe(false);
    expect(selectability.isYearSelectable(2026)).toBe(false);
  });
});

describe('recurring dates', () => {
  it('excludes the same month/day every year, with 0-indexed months', () => {
    // Documented 0.x convention: "00/01" is 1 January, so "11/25" is 25 December.
    const selectability = build(['11/25']);
    expect(selectability.isDaySelectable(at(2026, 11, 25))).toBe(false);
    expect(selectability.isDaySelectable(at(2027, 11, 25))).toBe(false);
    expect(selectability.isDaySelectable(at(2026, 11, 24))).toBe(true);
  });

  it('supports the 1-indexed ISO recurring form', () => {
    const selectability = build(['--12-25']);
    expect(selectability.isDaySelectable(at(2026, 11, 25))).toBe(false);
    expect(selectability.isDaySelectable(at(2026, 10, 25))).toBe(true);
  });
});

describe('whole years and recurring months', () => {
  it('excludes a whole year', () => {
    const selectability = build([2006]);
    expect(selectability.isYearSelectable(2006)).toBe(false);
    expect(selectability.isMonthSelectable(2006, 5)).toBe(false);
    expect(selectability.isDaySelectable(at(2006, 5, 15))).toBe(false);
    expect(selectability.isYearSelectable(2007)).toBe(true);
  });

  it('excludes a recurring month in every year', () => {
    const selectability = build([5]);
    expect(selectability.isMonthSelectable(2026, 5)).toBe(false);
    expect(selectability.isMonthSelectable(2030, 5)).toBe(false);
    expect(selectability.isMonthSelectable(2026, 4)).toBe(true);
    // The year still has eleven other months.
    expect(selectability.isYearSelectable(2026)).toBe(true);
  });
});

describe('date ranges', () => {
  /*
   * The 0.x implementation carried an explicit `// range is years && months [bug]`
   * comment for multi-year ranges and derived year/month exclusion from separate
   * precomputed sets that could disagree with the day-level answer. These cases
   * are the ones that went wrong.
   */
  it('excludes a range spanning part of two months', () => {
    const selectability = build([[new Date(2008, 3, 15), new Date(2008, 4, 14)]]);
    expect(selectability.isDaySelectable(at(2008, 3, 14))).toBe(true);
    expect(selectability.isDaySelectable(at(2008, 3, 15))).toBe(false);
    expect(selectability.isDaySelectable(at(2008, 4, 14))).toBe(false);
    expect(selectability.isDaySelectable(at(2008, 4, 15))).toBe(true);
    // Both months keep selectable days, so neither is fully excluded.
    expect(selectability.isMonthSelectable(2008, 3)).toBe(true);
    expect(selectability.isMonthSelectable(2008, 4)).toBe(true);
  });

  it('excludes a multi-year range and agrees at every granularity', () => {
    const selectability = build([[new Date(2000, 7, 2), new Date(2003, 9, 22)]]);
    expect(selectability.isDaySelectable(at(2000, 7, 1))).toBe(true);
    expect(selectability.isDaySelectable(at(2000, 7, 2))).toBe(false);
    expect(selectability.isDaySelectable(at(2002, 5, 15))).toBe(false);
    expect(selectability.isDaySelectable(at(2003, 9, 22))).toBe(false);
    expect(selectability.isDaySelectable(at(2003, 9, 23))).toBe(true);

    // The fully-covered interior years must be unselectable.
    expect(selectability.isYearSelectable(2001)).toBe(false);
    expect(selectability.isYearSelectable(2002)).toBe(false);
    // The partly-covered edge years must not be.
    expect(selectability.isYearSelectable(2000)).toBe(true);
    expect(selectability.isYearSelectable(2003)).toBe(true);

    // Month answers must agree with the day answers inside the edge years.
    expect(selectability.isMonthSelectable(2000, 6)).toBe(true); // before the range
    expect(selectability.isMonthSelectable(2000, 8)).toBe(false); // fully inside
    expect(selectability.isMonthSelectable(2003, 10)).toBe(true); // after the range
  });

  it('excludes a range covering exactly whole calendar years', () => {
    const selectability = build([[new Date(2010, 0, 1), new Date(2012, 11, 31)]]);
    expect(selectability.isYearSelectable(2010)).toBe(false);
    expect(selectability.isYearSelectable(2011)).toBe(false);
    expect(selectability.isYearSelectable(2012)).toBe(false);
    expect(selectability.isYearSelectable(2009)).toBe(true);
    expect(selectability.isYearSelectable(2013)).toBe(true);
  });

  it('handles a single-day range', () => {
    const selectability = build([[new Date(2026, 6, 27), new Date(2026, 6, 27)]]);
    expect(selectability.isDaySelectable(at(2026, 6, 27))).toBe(false);
    expect(selectability.isDaySelectable(at(2026, 6, 26))).toBe(true);
  });
});

describe('predicates', () => {
  it('supports an arbitrary test function, which 0.x logged an error for', () => {
    const selectability = build([(date: PlainDate) => date.day > 28]);
    expect(selectability.isDaySelectable(at(2026, 0, 28))).toBe(true);
    expect(selectability.isDaySelectable(at(2026, 0, 29))).toBe(false);
  });

  it('treats a non-boolean return as not disabled', () => {
    const selectability = build([(() => undefined) as never]);
    expect(selectability.isDaySelectable(at(2026, 0, 1))).toBe(true);
  });
});

describe('combined rules', () => {
  it('applies bounds and every rule together', () => {
    const selectability = build(
      ['sun', [new Date(2026, 1, 1), new Date(2026, 1, 28)], '--12-25'],
      at(2026, 0, 1),
      at(2026, 11, 31),
    );
    expect(selectability.isDaySelectable(at(2025, 11, 31))).toBe(false); // out of range
    expect(selectability.isDaySelectable(at(2026, 1, 10))).toBe(false); // inside the range rule
    expect(selectability.isDaySelectable(at(2026, 11, 25))).toBe(false); // recurring date
    expect(selectability.isMonthSelectable(2026, 1)).toBe(false); // whole month covered
    expect(selectability.isDaySelectable(at(2026, 6, 6))).toBe(true); // an ordinary Monday
  });
});

describe('first-selectable helpers', () => {
  it('finds the first selectable day and month, or null', () => {
    const selectability = build([[new Date(2026, 0, 1), new Date(2026, 0, 20)]]);
    expect(selectability.firstSelectableDayIn(2026, 0)?.day).toBe(21);
    expect(selectability.firstSelectableMonthIn(2026)).toBe(0);

    const blocked = build([2026]);
    expect(blocked.firstSelectableDayIn(2026, 0)).toBeNull();
    expect(blocked.firstSelectableMonthIn(2026)).toBeNull();
  });
});
