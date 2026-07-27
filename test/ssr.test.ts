/**
 * Server-side safety.
 *
 * Runs in the `node` environment — no `window`, no `document`, no `HTMLElement`.
 * A React app rendered by Next.js, Astro or Remix imports the package on the
 * server even when the picker only ever mounts on the client, so merely
 * importing it must not throw.
 *
 * @vitest-environment node
 */

import { describe, expect, it } from 'vitest';

describe('the node environment really has no DOM', () => {
  it('has no HTMLElement or document', () => {
    expect(typeof HTMLElement).toBe('undefined');
    expect(typeof document).toBe('undefined');
  });
});

describe('importing the package on a server', () => {
  it('does not throw', async () => {
    await expect(import('../src/index.js')).resolves.toBeDefined();
  });

  it('exposes the date logic, which needs no DOM', async () => {
    const { PlainDate, format, parseDate, monthsBetween } = await import('../src/index.js');

    const date = new PlainDate(2026, 6, 27);
    expect(format(date, 'dx mmm yyyy', { locale: 'en-GB' })).toBe('27th Jul 2026');
    expect(parseDate('2026-07', { locale: 'en-GB' })?.toISOMonth()).toBe('2026-07');
    expect(monthsBetween(new PlainDate(2026, 0, 1), new PlainDate(2026, 11, 31), true)).toBe(12);
  });

  it('can validate a submitted value server-side with the same rules', async () => {
    const { Selectability, parseDisabledDates, PlainDate, parseDate } = await import('../src/index.js');
    const { rules } = parseDisabledDates(['sat', 'sun']);
    const selectability = new Selectability({
      min: new PlainDate(2026, 0, 1),
      max: new PlainDate(2026, 11, 31),
      rules,
    });

    const submitted = parseDate('2026-07-27', { locale: 'en-GB' })!; // a Monday
    expect(selectability.isDaySelectable(submitted)).toBe(true);
    expect(selectability.isDaySelectable(new PlainDate(2026, 6, 26))).toBe(false); // Sunday
  });

  it('lets the element entry point be imported without registering anything', async () => {
    await expect(import('../src/custom-element.js')).resolves.toBeDefined();
  });

  it('makes defineDateSquirrel a no-op instead of a crash', async () => {
    const { defineDateSquirrel } = await import('../src/custom-element.js');
    expect(() => defineDateSquirrel()).not.toThrow();
  });

  it('explains itself if the element class is demanded without a DOM', async () => {
    const { getDateSquirrelElementClass } = await import('../src/custom-element.js');
    expect(() => getDateSquirrelElementClass()).toThrow(/needs a DOM/);
  });
});
