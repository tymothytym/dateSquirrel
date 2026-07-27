import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineDateSquirrel, getDateSquirrelElementClass } from '../src/custom-element.js';
import type { DateSquirrelElement } from '../src/custom-element.js';

defineDateSquirrel();

/** Append markup and wait for upgrade (synchronous for an already-defined tag). */
function mount(markup: string): DateSquirrelElement {
  document.body.innerHTML = markup;
  return document.querySelector('date-squirrel')!;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('registration', () => {
  it('registers the tag', () => {
    expect(customElements.get('date-squirrel')).toBe(getDateSquirrelElementClass());
  });

  it('is safe to call the definer more than once', () => {
    expect(() => {
      defineDateSquirrel();
      defineDateSquirrel();
    }).not.toThrow();
  });

  it('memoises the class rather than rebuilding it', () => {
    expect(getDateSquirrelElementClass()).toBe(getDateSquirrelElementClass());
  });
});

describe('enhancing an existing input', () => {
  it('keeps the author-supplied input, so label[for] and name survive', () => {
    const element = mount(`
      <label for="start">Start</label>
      <date-squirrel mode="ym"><input id="start" name="start"></date-squirrel>
    `);
    const input = element.querySelector('input')!;
    expect(element.input).toBe(input);
    expect(input.id).toBe('start');
    expect(input.name).toBe('start');
    // No shadow root, so the label association is a plain document-level one.
    expect(element.shadowRoot).toBeNull();
    expect(document.querySelector('label')?.getAttribute('for')).toBe('start');
  });

  it('leaves an author-supplied input in place on disconnect', () => {
    const element = mount('<date-squirrel><input id="keep"></date-squirrel>');
    element.remove();
    // The element owned no input, so it must not have removed one.
    expect(element.querySelector('input')?.id).toBe('keep');
  });
});

describe('creating its own input', () => {
  it('generates an input and forwards name and placeholder', () => {
    const element = mount('<date-squirrel name="birth" placeholder="Pick a year" mode="y"></date-squirrel>');
    const input = element.querySelector('input')!;
    expect(input.name).toBe('birth');
    expect(input.placeholder).toBe('Pick a year');
  });

  it('removes the input it created on disconnect', () => {
    const element = mount('<date-squirrel name="gone"></date-squirrel>');
    expect(element.querySelector('input')).not.toBeNull();
    element.remove();
    expect(element.querySelector('input')).toBeNull();
  });
});

describe('attributes to options', () => {
  it('maps mode, min and max', () => {
    const element = mount('<date-squirrel mode="ym" min="2020-01" max="2022-12"></date-squirrel>');
    expect(element.picker?.mode).toBe('ym');
    const years = element.querySelectorAll('.dsq-list-years li');
    expect(Array.from(years, (item) => (item as HTMLElement).dataset.year))
      .toEqual(['2022', '2021', '2020']);
  });

  it('maps the boolean attributes', () => {
    const element = mount('<date-squirrel overlay hide-scrollbars></date-squirrel>');
    expect(element.querySelector('.dsq-lists')?.getAttribute('data-overlay')).toBe('true');
    expect(element.querySelector('.dsq')?.getAttribute('data-hide-scrollbars')).toBe('true');
  });

  it('maps pattern and pattern-save', () => {
    const element = mount('<date-squirrel pattern="yyyy/mm" pattern-save="yyyy-mm" mode="ym"></date-squirrel>');
    element.value = '2026-07';
    expect(element.querySelector('input')?.value).toBe('2026/07');
    expect(element.value).toBe('2026-07');
  });

  it('maps locale', () => {
    const element = mount('<date-squirrel locale="fr-FR" mode="ym" pattern="mmmm yyyy"></date-squirrel>');
    element.value = '2026-07';
    expect(element.querySelector('input')?.value).toBe('juillet 2026');
  });

  it('reacts to an attribute change after connection', () => {
    const element = mount('<date-squirrel min="2026-01-01" max="2026-12-31"></date-squirrel>');
    element.setAttribute('min', '2020-01-01');
    element.setAttribute('max', '2021-12-31');
    const years = element.querySelectorAll('.dsq-list-years li');
    expect(Array.from(years, (item) => (item as HTMLElement).dataset.year)).toEqual(['2021', '2020']);
  });
});

describe('the value property', () => {
  it('round-trips through the storage format', () => {
    const element = mount('<date-squirrel mode="ym"></date-squirrel>');
    element.value = '2026-07';
    expect(element.value).toBe('2026-07');
    expect(element.valueAsPlainDate?.toString()).toBe('2026-07-01');
    expect(element.valueAsDate?.getFullYear()).toBe(2026);
  });

  it('applies a value attribute present at connection', () => {
    const element = mount('<date-squirrel mode="ym" value="2026-07"></date-squirrel>');
    expect(element.value).toBe('2026-07');
  });

  it('reflects a value attribute set later', () => {
    const element = mount('<date-squirrel mode="ym"></date-squirrel>');
    element.setAttribute('value', '2027-03');
    expect(element.value).toBe('2027-03');
  });
});

describe('disabledDates as a property', () => {
  it('accepts complex values that cannot go in an attribute', () => {
    const element = mount('<date-squirrel min="2024-01-01" max="2028-12-31"></date-squirrel>');
    element.disabledDates = [2026, (date) => date.year === 2027];
    const years = Array.from(element.querySelectorAll<HTMLElement>('.dsq-list-years li'));
    const disabled = years
      .filter((item) => item.getAttribute('aria-disabled') === 'true')
      .map((item) => item.dataset.year);
    expect(disabled).toEqual(expect.arrayContaining(['2026', '2027']));
  });
});

describe('events', () => {
  it('lets dsq:change bubble out of the element', () => {
    const element = mount('<date-squirrel mode="ym"></date-squirrel>');
    const onChange = vi.fn();
    element.addEventListener('dsq:change', onChange);
    element.value = '2026-07';
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('fires a native change event on the inner input', () => {
    const element = mount('<date-squirrel mode="ym"><input name="m"></date-squirrel>');
    const onChange = vi.fn();
    document.addEventListener('change', onChange);
    element.value = '2026-07';
    expect(onChange).toHaveBeenCalledTimes(1);
    document.removeEventListener('change', onChange);
  });
});

describe('form participation', () => {
  it('serialises through the real input', () => {
    document.body.innerHTML = `
      <form>
        <date-squirrel mode="ym" name="month"><input name="month"></date-squirrel>
      </form>
    `;
    const element = document.querySelector('date-squirrel')!;
    element.value = '2026-07';
    const data = new FormData(document.querySelector('form')!);
    // The visible, human-formatted value is what a plain form post carries;
    // data-dsq-date carries the machine format alongside it.
    expect(data.get('month')).toBe('Jul 2026');
    expect(element.querySelector('input')?.getAttribute('data-dsq-date')).toBe('2026-07');
  });
});

describe('teardown', () => {
  it('destroys the picker on disconnect and leaves no wrapper behind', () => {
    const element = mount('<date-squirrel></date-squirrel>');
    expect(document.querySelector('.dsq')).not.toBeNull();
    element.remove();
    expect(element.picker).toBeNull();
    expect(document.querySelector('.dsq')).toBeNull();
  });

  it('survives disconnect and reconnect', () => {
    const element = mount('<date-squirrel mode="ym"></date-squirrel>');
    element.remove();
    document.body.append(element);
    expect(element.picker).not.toBeNull();
    expect(document.querySelectorAll('.dsq')).toHaveLength(1);
  });
});
