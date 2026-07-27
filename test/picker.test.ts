import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DateSquirrel } from '../src/picker.js';
import type { DateSquirrelUserOptions } from '../src/core/options.js';

function mountInput(attributes: Record<string, string> = {}): HTMLInputElement {
  const before = document.createElement('p');
  before.textContent = 'before';
  const input = document.createElement('input');
  input.id = attributes.id ?? 'field';
  input.type = 'date';
  for (const [name, value] of Object.entries(attributes)) input.setAttribute(name, value);
  const after = document.createElement('p');
  after.textContent = 'after';
  document.body.append(before, input, after);
  return input;
}

const wrapperOf = (picker: DateSquirrel) => picker.wrapper as HTMLElement;
const years = (picker: DateSquirrel) =>
  Array.from(wrapperOf(picker).querySelectorAll<HTMLElement>('.dsq-list-years li'));
const months = (picker: DateSquirrel) =>
  Array.from(wrapperOf(picker).querySelectorAll<HTMLElement>('.dsq-list-months li'));
const days = (picker: DateSquirrel) =>
  Array.from(wrapperOf(picker).querySelectorAll<HTMLElement>('.dsq-day'));

const click = (element: Element) =>
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

let pickers: DateSquirrel[] = [];
const create = (input: HTMLInputElement, options?: DateSquirrelUserOptions) => {
  const picker = new DateSquirrel(input, options);
  pickers.push(picker);
  return picker;
};

beforeEach(() => {
  document.body.innerHTML = '';
  pickers = [];
});

afterEach(() => {
  for (const picker of pickers) picker.destroy();
  document.body.innerHTML = '';
});

describe('construction', () => {
  it('accepts a selector or an element', () => {
    mountInput({ id: 'via-selector' });
    expect(() => create(document.querySelector('#via-selector')!)).not.toThrow();
    expect(new DateSquirrel('#via-selector').input.id).toBe('via-selector');
  });

  it('throws a clear error when nothing matches', () => {
    expect(() => new DateSquirrel('#missing')).toThrow(/no element matched/);
  });

  it('throws when the target is not an input', () => {
    const div = document.createElement('div');
    div.id = 'not-an-input';
    document.body.append(div);
    expect(() => new DateSquirrel('#not-an-input')).toThrow(/expected an <input>/);
  });

  it('wraps the input and switches it to a text field', () => {
    const input = mountInput();
    const picker = create(input);
    expect(wrapperOf(picker).classList.contains('dsq')).toBe(true);
    expect(wrapperOf(picker).contains(input)).toBe(true);
    expect(input.getAttribute('type')).toBe('text');
  });

  it('respects an activation function that declines', () => {
    const input = mountInput();
    const picker = create(input, { activation: () => false });
    expect(picker.active).toBe(false);
    expect(picker.wrapper).toBeNull();
    // The input is left exactly as it was.
    expect(input.getAttribute('type')).toBe('date');
    expect(document.querySelector('.dsq')).toBeNull();
  });
});

describe('accessibility wiring', () => {
  it('sets roles as attributes, not as properties', () => {
    // 0.x assigned `element.role = 'listbox'`, which no browser of that era
    // reflected to an attribute, so the lists shipped with `role="option"`
    // children and no owning listbox.
    const picker = create(mountInput());
    const wrapper = wrapperOf(picker);
    expect(wrapper.querySelector('.dsq-list-years')?.getAttribute('role')).toBe('listbox');
    expect(wrapper.querySelector('.dsq-list-months')?.getAttribute('role')).toBe('listbox');
    expect(wrapper.querySelector('.dsq-list-days')?.getAttribute('role')).toBe('grid');
    expect(years(picker)[0]?.getAttribute('role')).toBe('option');
  });

  it('describes the popup relationship on the input', () => {
    const picker = create(mountInput());
    expect(picker.input.getAttribute('aria-expanded')).toBe('false');
    expect(picker.input.getAttribute('aria-haspopup')).toBe('dialog');
    expect(picker.input.getAttribute('aria-controls')).toBe(
      wrapperOf(picker).querySelector('.dsq-lists')?.id,
    );
  });

  it('uses a real button for the back control', () => {
    // 0.x used `<a>` with no href, which is neither focusable nor operable.
    const picker = create(mountInput());
    const back = wrapperOf(picker).querySelector('.dsq-reminder');
    expect(back?.tagName).toBe('BUTTON');
    expect(back?.getAttribute('type')).toBe('button');
  });

  it('builds the day grid as rows of gridcells', () => {
    const picker = create(mountInput({ min: '2026-07-01', max: '2026-07-31' }));
    const grid = wrapperOf(picker).querySelector('.dsq-list-days')!;
    expect(grid.querySelectorAll('[role="row"]').length).toBeGreaterThan(1);
    expect(grid.querySelector('[role="columnheader"]')).not.toBeNull();
    expect(days(picker)[0]?.getAttribute('role')).toBe('gridcell');
  });

  it('keeps disabled days focusable via aria-disabled', () => {
    const picker = create(mountInput({ min: '2026-07-10', max: '2026-07-20' }));
    const first = days(picker)[0]!;
    expect(first.getAttribute('aria-disabled')).toBe('true');
    // Using the `disabled` attribute would drop it out of the keyboard walk.
    expect(first.hasAttribute('disabled')).toBe(false);
  });

  it('exposes exactly one tab stop per list', () => {
    const picker = create(mountInput());
    const stops = years(picker).filter((item) => item.getAttribute('tabindex') === '0');
    expect(stops).toHaveLength(1);
  });
});

describe('per-instance isolation', () => {
  it('does not leak one input min/max onto the next picker', () => {
    // The 0.x constructor wrote input attributes onto the shared defaults
    // object, so a second picker silently inherited the first one's range.
    const bounded = mountInput({ id: 'bounded', min: '1990-01-01', max: '1995-12-31' });
    const free = mountInput({ id: 'free' });

    const first = create(bounded);
    const second = create(free);

    expect(years(first).map((item) => item.dataset.year)).toEqual(
      ['1995', '1994', '1993', '1992', '1991', '1990'],
    );

    const secondYears = years(second).map((item) => Number(item.dataset.year));
    expect(secondYears).not.toContain(1990);
    expect(Math.min(...secondYears)).toBeGreaterThanOrEqual(new Date().getFullYear());
  });

  it('keeps two pickers on the same page independent', () => {
    const a = create(mountInput({ id: 'a' }), { mode: 'ym' });
    const b = create(mountInput({ id: 'b' }), { mode: 'y' });
    a.setValue('2026-07');
    expect(a.valueAsString).toBe('2026-07');
    expect(b.valueAsString).toBe('');
  });
});

describe('ymd mode', () => {
  it('walks year to month to day and commits', () => {
    const input = mountInput({ min: '2025-01-01', max: '2027-12-31' });
    const picker = create(input, { locale: 'en-GB' });

    click(years(picker).find((item) => item.dataset.year === '2026')!);
    expect(wrapperOf(picker).getAttribute('data-stage')).toBe('month');

    click(months(picker)[6]!); // July
    expect(wrapperOf(picker).getAttribute('data-stage')).toBe('day');

    click(days(picker).find((day) => day.dataset.day === '27')!);

    expect(picker.value?.toString()).toBe('2026-07-27');
    expect(input.value).toBe('27th Jul 2026');
    expect(input.getAttribute('data-dsq-date')).toBe('2026-07-27');
  });

  it('ignores clicks on disabled days', () => {
    const picker = create(mountInput({ min: '2026-07-10', max: '2026-07-20' }));
    picker.setValue('2026-07-15', { silent: true });
    click(days(picker).find((day) => day.dataset.day === '1')!);
    expect(picker.value?.toString()).toBe('2026-07-15');
  });

  it('clears a stale month and day when the year changes', () => {
    const picker = create(mountInput({ min: '2025-01-01', max: '2027-12-31' }));
    picker.setValue('2026-07-27', { silent: true });
    click(years(picker).find((item) => item.dataset.year === '2027')!);
    // Nothing is committed until the drill-down finishes again.
    expect(picker.value).toBeNull();
    expect(wrapperOf(picker).getAttribute('data-stage')).toBe('month');
  });
});

describe('ym mode', () => {
  it('commits as soon as a month is chosen', () => {
    const input = mountInput({ min: '2020-01-01', max: '2030-12-31' });
    const picker = create(input, { mode: 'ym', locale: 'en-GB' });

    click(years(picker).find((item) => item.dataset.year === '2026')!);
    expect(wrapperOf(picker).getAttribute('data-stage')).toBe('month');
    click(months(picker)[6]!);

    expect(picker.value?.toString()).toBe('2026-07-01');
    expect(picker.valueAsString).toBe('2026-07');
    expect(input.value).toBe('Jul 2026');
  });

  it('normalises any input to the first of the month', () => {
    const picker = create(mountInput(), { mode: 'ym' });
    picker.setValue('2026-07-27');
    expect(picker.value?.toString()).toBe('2026-07-01');
    expect(picker.valueAsString).toBe('2026-07');
  });

  it('reads back its own stored format', () => {
    const picker = create(mountInput(), { mode: 'ym' });
    expect(picker.setValue('2026-07')).toBe(true);
    expect(picker.valueAsString).toBe('2026-07');
  });

  it('reads back its own display format', () => {
    const picker = create(mountInput(), { mode: 'ym', locale: 'en-GB' });
    expect(picker.setValue('Jul 2026')).toBe(true);
    expect(picker.valueAsString).toBe('2026-07');
  });

  it('never reveals the day panel', () => {
    const picker = create(mountInput(), { mode: 'ym' });
    expect(wrapperOf(picker).getAttribute('data-mode')).toBe('ym');
    click(years(picker)[0]!);
    click(months(picker)[0]!);
    expect(wrapperOf(picker).getAttribute('data-stage')).not.toBe('day');
  });

  it('accepts the 0.x day:false spelling', () => {
    const picker = create(mountInput(), { day: false });
    expect(picker.mode).toBe('ym');
    expect(picker.options.patternSave).toBe('yyyy-mm');
  });
});

describe('y mode', () => {
  it('commits on the year and resolves to January', () => {
    // 0.x set `this.selectedMonth = 1` for the year-only path, so a year-only
    // picker produced a date in February.
    const input = mountInput({ min: '2020-01-01', max: '2030-12-31' });
    const picker = create(input, { mode: 'y' });

    click(years(picker).find((item) => item.dataset.year === '2026')!);

    expect(picker.value?.month).toBe(0);
    expect(picker.value?.toString()).toBe('2026-01-01');
    expect(picker.valueAsString).toBe('2026');
    expect(input.value).toBe('2026');
  });

  it('parses a bare year typed into the field', () => {
    const picker = create(mountInput(), { mode: 'y' });
    expect(picker.setValue('2026')).toBe(true);
    expect(picker.valueAsString).toBe('2026');
  });
});

describe('single-year and single-month ranges', () => {
  it('starts on the month list when only one year is selectable', () => {
    const picker = create(mountInput({ min: '2026-01-01', max: '2026-12-31' }));
    expect(wrapperOf(picker).getAttribute('data-stage')).toBe('month');
    expect(wrapperOf(picker).getAttribute('data-single-year')).toBe('true');
  });

  it('starts on the day grid when only one month is selectable', () => {
    const picker = create(mountInput({ min: '2026-07-01', max: '2026-07-31' }));
    expect(wrapperOf(picker).getAttribute('data-stage')).toBe('day');
    expect(days(picker)).toHaveLength(31);
  });
});

describe('disabled dates in the DOM', () => {
  it('marks disabled years, months and days consistently', () => {
    const picker = create(mountInput({ min: '2024-01-01', max: '2028-12-31' }), {
      disabledDates: [2026, 'sun'],
    });

    const year2026 = years(picker).find((item) => item.dataset.year === '2026')!;
    expect(year2026.classList.contains('dsq-disabled')).toBe(true);
    expect(year2026.getAttribute('aria-disabled')).toBe('true');

    const year2027 = years(picker).find((item) => item.dataset.year === '2027')!;
    expect(year2027.getAttribute('aria-disabled')).toBeNull();
  });

  it('refreshes month availability when the year changes', () => {
    const picker = create(mountInput({ min: '2024-01-01', max: '2028-12-31' }), {
      disabledDates: [[new Date(2026, 0, 1), new Date(2026, 5, 30)]],
    });
    click(years(picker).find((item) => item.dataset.year === '2026')!);
    const list = months(picker);
    expect(list[0]?.getAttribute('aria-disabled')).toBe('true'); // January covered
    expect(list[6]?.getAttribute('aria-disabled')).toBeNull(); // July free

    click(years(picker).find((item) => item.dataset.year === '2027')!);
    expect(months(picker)[0]?.getAttribute('aria-disabled')).toBeNull();
  });

  it('warns once about unrecognised specs rather than per cell', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    create(mountInput(), { disabledDates: ['gibberish'] });
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('refuses a setValue that lands on a disabled date', () => {
    const picker = create(mountInput(), { disabledDates: [[new Date(2026, 6, 1), new Date(2026, 6, 31)]] });
    expect(picker.setValue('2026-07-15')).toBe(false);
    expect(picker.setValue('2026-08-15')).toBe(true);
  });
});

describe('events', () => {
  it('fires a bubbling native change event, so forms and React see it', () => {
    const input = mountInput();
    const picker = create(input);
    const onChange = vi.fn();
    const onInput = vi.fn();
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);

    picker.setValue('2026-07-27');

    expect(onInput).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledTimes(1);
    document.removeEventListener('change', onChange);
    document.removeEventListener('input', onInput);
  });

  it('fires dsq:change with the formatted detail', () => {
    const picker = create(mountInput(), { locale: 'en-GB' });
    const detail = vi.fn();
    wrapperOf(picker).addEventListener('dsq:change', (event) => {
      detail((event as CustomEvent).detail);
    });

    picker.setValue('2026-07-27');

    expect(detail).toHaveBeenCalledWith(
      expect.objectContaining({ human: '27th Jul 2026', save: '2026-07-27', mode: 'ymd' }),
    );
  });

  it('invokes the 0.x callback with the context as both `this` and an argument', () => {
    const seen: { viaThis?: string; viaArg?: string } = {};
    const picker = create(mountInput(), {
      locale: 'en-GB',
      callback(context) {
        seen.viaThis = this.save;
        seen.viaArg = context.save;
      },
    });
    picker.setValue('2026-07-27');
    expect(seen.viaThis).toBe('2026-07-27');
    expect(seen.viaArg).toBe('2026-07-27');
  });

  it('does not re-enter the parser when it dispatches its own change event', () => {
    const picker = create(mountInput(), { parse: { active: true, delay: 0 } });
    const spy = vi.spyOn(picker, 'setValue');
    picker.setValue('2026-07-27');
    // One explicit call, and no recursive call from the change listener.
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('suppresses the change event when asked', () => {
    const picker = create(mountInput());
    const onChange = vi.fn();
    wrapperOf(picker).addEventListener('dsq:change', onChange);
    picker.setValue('2026-07-27', { silent: true });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('keyboard', () => {
  const key = (target: Element, k: string) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

  it('opens the panel on ArrowDown from the input', () => {
    const picker = create(mountInput());
    picker.input.focus();
    key(picker.input, 'ArrowDown');
    expect(picker.isOpen).toBe(true);
  });

  it('closes on Escape', () => {
    const picker = create(mountInput());
    picker.openPanel();
    key(wrapperOf(picker), 'Escape');
    expect(picker.isOpen).toBe(false);
  });

  it('moves through the year list with the arrow keys', () => {
    const picker = create(mountInput({ min: '2020-01-01', max: '2030-12-31' }));
    picker.openPanel();
    const list = years(picker);
    list[0]!.focus();
    key(list[0]!, 'ArrowDown');
    expect(document.activeElement).toBe(list[1]);
    key(list[1]!, 'ArrowUp');
    expect(document.activeElement).toBe(list[0]);
  });

  it('jumps ten years with PageDown', () => {
    const picker = create(mountInput({ min: '2000-01-01', max: '2030-12-31' }));
    picker.openPanel();
    const list = years(picker);
    list[0]!.focus();
    key(list[0]!, 'PageDown');
    expect(document.activeElement).toBe(list[10]);
  });

  it('selects with Enter', () => {
    const picker = create(mountInput({ min: '2020-01-01', max: '2030-12-31' }), { mode: 'y' });
    picker.openPanel();
    const target = years(picker).find((item) => item.dataset.year === '2026')!;
    target.focus();
    key(target, 'Enter');
    expect(picker.valueAsString).toBe('2026');
  });

  it('steps a week at a time in the day grid', () => {
    const picker = create(mountInput({ min: '2026-07-01', max: '2026-07-31' }));
    picker.openPanel();
    const cells = days(picker);
    cells[0]!.focus();
    key(cells[0]!, 'ArrowDown');
    expect(document.activeElement).toBe(cells[7]);
    key(cells[7]!, 'ArrowRight');
    expect(document.activeElement).toBe(cells[8]);
  });

  it('focuses cells with preventScroll, so the panel cannot be scrolled sideways', () => {
    // The panels are positioned outside the panel box and translated into place.
    // A bare focus() lets the browser scroll the clipping container to "reveal"
    // the translated panel, which drags the whole day view out of alignment.
    const picker = create(mountInput({ min: '2020-01-01', max: '2030-12-31' }));
    picker.openPanel();
    const cells = years(picker);
    const spy = vi.spyOn(cells[0]!, 'focus');
    cells[0]!.focus();
    spy.mockClear();

    key(cells[0]!, 'ArrowDown');
    const target = cells[1]!;
    const targetSpy = vi.spyOn(target, 'focus');
    key(cells[0]!, 'ArrowUp');
    key(cells[0]!, 'ArrowDown');

    expect(targetSpy).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('steps back a stage with Backspace', () => {
    const picker = create(mountInput({ min: '2020-01-01', max: '2030-12-31' }));
    click(years(picker)[0]!);
    expect(wrapperOf(picker).getAttribute('data-stage')).toBe('month');
    key(months(picker)[0]!, 'Backspace');
    expect(wrapperOf(picker).getAttribute('data-stage')).toBe('year');
  });
});

describe('the back control', () => {
  it('returns from the day grid to the month list', () => {
    const picker = create(mountInput({ min: '2020-01-01', max: '2030-12-31' }));
    click(years(picker)[0]!);
    click(months(picker)[0]!);
    expect(wrapperOf(picker).getAttribute('data-stage')).toBe('day');

    click(wrapperOf(picker).querySelector('.dsq-reminder')!);
    expect(wrapperOf(picker).getAttribute('data-stage')).toBe('month');
  });

  it('labels itself with the month and year on show', () => {
    const picker = create(mountInput({ min: '2026-07-01', max: '2026-07-31' }), { locale: 'en-GB' });
    const back = wrapperOf(picker).querySelector('.dsq-reminder')!;
    expect(back.querySelector('.dsq-reminder-month')?.textContent).toBe('Jul');
    expect(back.querySelector('.dsq-reminder-year')?.textContent).toBe('2026');
    expect(back.getAttribute('aria-label')).toContain('Jul 2026');
  });
});

describe('clear', () => {
  it('empties the value and resets the drill-down', () => {
    const picker = create(mountInput({ min: '2020-01-01', max: '2030-12-31' }));
    picker.setValue('2026-07-27', { silent: true });
    picker.clear();
    expect(picker.value).toBeNull();
    expect(picker.input.value).toBe('');
    expect(picker.input.hasAttribute('data-dsq-date')).toBe(false);
    expect(wrapperOf(picker).getAttribute('data-stage')).toBe('year');
  });

  it('treats setValue(null) as a clear', () => {
    const picker = create(mountInput());
    picker.setValue('2026-07-27', { silent: true });
    expect(picker.setValue(null)).toBe(true);
    expect(picker.value).toBeNull();
  });
});

describe('destroy', () => {
  it('restores the input to its original position and state', () => {
    const input = mountInput();
    const picker = create(input);
    picker.destroy();

    expect(document.querySelector('.dsq')).toBeNull();
    expect(input.getAttribute('type')).toBe('date');
    expect(input.hasAttribute('data-dsq-date')).toBe(false);
    expect(input.hasAttribute('aria-expanded')).toBe(false);
    // Original document order is preserved.
    expect(input.previousElementSibling?.textContent).toBe('before');
    expect(input.nextElementSibling?.textContent).toBe('after');
  });

  it('actually detaches its listeners', () => {
    // 0.x guarded its cleanup with `if (!nodeList)`, which is never true, so it
    // removed nothing and leaked every listener on every teardown.
    const input = mountInput();
    const picker = create(input);
    const onOpen = vi.fn();
    document.addEventListener('dsq:open', onOpen);

    picker.destroy();

    input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
    input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(onOpen).not.toHaveBeenCalled();
    expect(document.querySelector('.dsq')).toBeNull();
    document.removeEventListener('dsq:open', onOpen);
  });

  it('is idempotent', () => {
    const picker = create(mountInput());
    picker.destroy();
    expect(() => picker.destroy()).not.toThrow();
  });

  it('rejects mutation after teardown', () => {
    const picker = create(mountInput());
    picker.destroy();
    expect(picker.setValue('2026-07-27')).toBe(false);
  });

  it('survives repeated create/destroy cycles without accumulating DOM', () => {
    // React strict mode mounts, unmounts and remounts effects on purpose.
    const input = mountInput();
    for (let i = 0; i < 5; i++) {
      const picker = new DateSquirrel(input, { mode: 'ym' });
      picker.destroy();
    }
    expect(document.querySelectorAll('.dsq')).toHaveLength(0);
    expect(document.querySelectorAll('input')).toHaveLength(1);
  });

  it('leaves a declined instance destroyable', () => {
    const picker = create(mountInput(), { activation: () => false });
    expect(() => picker.destroy()).not.toThrow();
  });
});

describe('setOptions', () => {
  it('applies a new pattern to the existing value', () => {
    const picker = create(mountInput(), { locale: 'en-GB' });
    picker.setValue('2026-07-27', { silent: true });
    expect(picker.input.value).toBe('27th Jul 2026');

    picker.setOptions({ pattern: 'yyyy-mm-dd' });
    expect(picker.input.value).toBe('2026-07-27');
  });

  it('applies a new range', () => {
    const picker = create(mountInput({ min: '2026-01-01', max: '2026-12-31' }));
    picker.setOptions({ min: '2020-01-01', max: '2021-12-31' });
    expect(years(picker).map((item) => item.dataset.year)).toEqual(['2021', '2020']);
  });
});

describe('initial value', () => {
  it('applies the initial option without firing a change', () => {
    const input = mountInput();
    const onChange = vi.fn();
    document.addEventListener('change', onChange);
    const picker = create(input, { initial: '2026-07-27', locale: 'en-GB' });
    expect(picker.value?.toString()).toBe('2026-07-27');
    expect(input.value).toBe('27th Jul 2026');
    expect(onChange).not.toHaveBeenCalled();
    document.removeEventListener('change', onChange);
  });

  it('adopts a value already present in the input', () => {
    const input = mountInput();
    input.value = '2026-07-27';
    const picker = create(input);
    expect(picker.value?.toString()).toBe('2026-07-27');
  });
});
