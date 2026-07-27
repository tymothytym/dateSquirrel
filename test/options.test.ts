import { describe, expect, it } from 'vitest';
import { defaultOptions, modePrecision, resolveOptions, resolveRange } from '../src/core/options.js';
import { PlainDate } from '../src/core/plain-date.js';

describe('defaults', () => {
  it('returns a fresh object every call, never a shared one', () => {
    // 0.x kept a single module-level `defaults` object and wrote an input's
    // min/max straight onto it, so a second picker inherited the first's range.
    const first = defaultOptions();
    const second = defaultOptions();
    expect(first).not.toBe(second);
    expect(first.parse).not.toBe(second.parse);

    first.min = new PlainDate(1999, 0, 1);
    first.parse.rule = 'mdy';
    expect(second.min).toBeNull();
    expect(second.parse.rule).toBe('dmy');
  });

  it('picks patterns to match the mode', () => {
    expect(defaultOptions('ymd')).toMatchObject({ pattern: 'dx mmm yyyy', patternSave: 'yyyy-mm-dd' });
    expect(defaultOptions('ym')).toMatchObject({ pattern: 'mmm yyyy', patternSave: 'yyyy-mm' });
    expect(defaultOptions('y')).toMatchObject({ pattern: 'yyyy', patternSave: 'yyyy' });
  });
});

describe('nested option merging', () => {
  it('keeps sibling defaults when a nested group is partially supplied', () => {
    // 0.x called its `extend` without the deep flag, so `{ parse: { rule } }`
    // discarded active/delay/event entirely.
    const options = resolveOptions({ parse: { rule: 'mdy' } });
    expect(options.parse).toEqual({ active: true, delay: 150, event: 'change', rule: 'mdy' });
  });

  it('accepts a boolean shorthand for the parse group', () => {
    expect(resolveOptions({ parse: false }).parse).toMatchObject({ active: false, rule: 'dmy' });
    expect(resolveOptions({ parse: true }).parse).toMatchObject({ active: true });
  });

  it('ignores explicitly undefined values rather than blanking defaults', () => {
    const options = resolveOptions({ pattern: undefined, markToday: undefined });
    expect(options.pattern).toBe('dx mmm yyyy');
    expect(options.markToday).toBe(true);
  });
});

describe('mode inference', () => {
  it('honours an explicit mode', () => {
    expect(resolveOptions({ mode: 'ym' }).mode).toBe('ym');
  });

  it('maps the 0.x day/month booleans onto a mode', () => {
    expect(resolveOptions({ day: false }).mode).toBe('ym');
    expect(resolveOptions({ day: false, month: false }).mode).toBe('y');
    expect(resolveOptions({ month: false }).mode).toBe('y');
    expect(resolveOptions({}).mode).toBe('ymd');
  });

  it('derives the pattern defaults from an inferred mode', () => {
    expect(resolveOptions({ day: false }).patternSave).toBe('yyyy-mm');
    expect(resolveOptions({ day: false, month: false }).patternSave).toBe('yyyy');
  });

  it('lets an explicit pattern beat the mode default', () => {
    expect(resolveOptions({ mode: 'ym', pattern: "mmm 'yy" }).pattern).toBe("mmm 'yy");
  });
});

describe('aliases', () => {
  it('accepts start/end for min/max', () => {
    const options = resolveOptions({ start: '2020-01-01', end: '2030-12-31' });
    expect(options.min).toBe('2020-01-01');
    expect(options.max).toBe('2030-12-31');
  });

  it('accepts the 0.x disableDates misspelling', () => {
    // settings.js declared `disableDates`; core.js read `disabledDates`.
    expect(resolveOptions({ disableDates: ['wed'] }).disabledDates).toEqual(['wed']);
    expect(resolveOptions({ disabledDates: ['mon'] }).disabledDates).toEqual(['mon']);
  });

  it('prefers the modern name when both are supplied', () => {
    const options = resolveOptions({ disabledDates: ['mon'], disableDates: ['wed'] });
    expect(options.disabledDates).toEqual(['mon']);
  });

  it('accepts monthList for monthNamesShort', () => {
    expect(resolveOptions({ monthList: ['A'] }).monthNamesShort).toEqual(['A']);
  });
});

describe('resolveRange', () => {
  const input = (attributes: Record<string, string> = {}) => {
    const element = document.createElement('input');
    for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
    return element;
  };

  it('reads min/max from the input attributes', () => {
    const range = resolveRange(resolveOptions({}), input({ min: '2020-01-01', max: '2020-12-31' }));
    expect(range.min?.toString()).toBe('2020-01-01');
    expect(range.max?.toString()).toBe('2020-12-31');
  });

  it('lets explicit options beat the attributes', () => {
    const options = resolveOptions({ min: '2000-01-01' });
    const range = resolveRange(options, input({ min: '2020-01-01' }));
    expect(range.min?.toString()).toBe('2000-01-01');
  });

  it('evaluates a function bound', () => {
    const options = resolveOptions({ min: () => new PlainDate(2026, 0, 1) });
    expect(resolveRange(options, input()).min?.toString()).toBe('2026-01-01');
  });

  it('defaults max to ten years past min, as 0.x did', () => {
    const options = resolveOptions({ min: '2026-01-01' });
    expect(resolveRange(options, input()).max?.toString()).toBe('2036-01-01');
  });

  it('swaps a reversed range instead of rendering nothing', () => {
    const options = resolveOptions({ min: '2030-01-01', max: '2020-01-01' });
    const range = resolveRange(options, input());
    expect(range.min?.toString()).toBe('2020-01-01');
    expect(range.max?.toString()).toBe('2030-01-01');
  });

  it('accepts the legacy {d,m,y} bound shape, including d: 32', () => {
    const options = resolveOptions({ start: { d: 1, m: 10, y: 2029 }, end: { d: 32, m: 3, y: 2030 } });
    const range = resolveRange(options, input());
    expect(range.min?.toString()).toBe('2029-11-01');
    // d: 32 clamps to the last day of April.
    expect(range.max?.toString()).toBe('2030-04-30');
  });
});

describe('modePrecision', () => {
  it('maps each mode to the precision it selects', () => {
    expect(modePrecision('y')).toBe('year');
    expect(modePrecision('ym')).toBe('month');
    expect(modePrecision('ymd')).toBe('day');
  });
});
