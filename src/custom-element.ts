/**
 * `<date-squirrel>` — the custom-element wrapper.
 *
 * Deliberately light DOM, no shadow root: a shadow boundary would break
 * `<label for>` association, stop page CSS from reaching the picker, and hide
 * the underlying `<input>` from form serialisation and from form libraries.
 * Everything here is a thin translation of attributes into picker options.
 *
 * The class is built lazily rather than declared at module scope. `class X
 * extends HTMLElement` evaluates `HTMLElement` the moment the module loads, so
 * a top-level declaration makes the package unimportable in Node — which means
 * any SSR framework (Next.js, Astro, Remix) crashes on the server even when the
 * component only ever renders on the client. Deferring the class body keeps
 * every entry point safe to import anywhere.
 *
 * @example
 * ```html
 * <!-- enhance an existing input -->
 * <label for="start">Start month</label>
 * <date-squirrel mode="ym" min="2020-01" max="2030-12">
 *   <input id="start" name="start">
 * </date-squirrel>
 *
 * <!-- or let the element create its own input -->
 * <date-squirrel mode="y" name="birth-year" min="1920" max="2010"></date-squirrel>
 * ```
 */

import { DateSquirrel } from './picker.js';
import type { DisabledDateSpec } from './core/disabled.js';
import type { DateSquirrelUserOptions, PickerMode } from './core/options.js';
import type { PlainDate } from './core/plain-date.js';

const OBSERVED = [
  'mode',
  'min',
  'max',
  'value',
  'pattern',
  'pattern-save',
  'locale',
  'first-day-of-week',
  'overlay',
  'hide-scrollbars',
  'mark-today',
  'placeholder',
  'name',
  'disabled',
  'required',
] as const;

export const DATE_SQUIRREL_TAG = 'date-squirrel';

/** The public shape of a `<date-squirrel>` element. */
export interface DateSquirrelElement extends HTMLElement {
  /** The picker instance, or null before connection / after disconnection. */
  picker: DateSquirrel | null;
  /** The underlying `<input>`, whether author-supplied or generated. */
  readonly input: HTMLInputElement | null;
  /** The value formatted with `patternSave` (e.g. "2026-07" in `ym` mode). */
  value: string;
  readonly valueAsDate: Date | null;
  readonly valueAsPlainDate: PlainDate | null;
  mode: PickerMode;
  /** Complex option, so a property rather than an attribute. */
  disabledDates: readonly DisabledDateSpec[] | false;
}

export interface DateSquirrelElementConstructor {
  new (): DateSquirrelElement;
  readonly observedAttributes: readonly string[];
  readonly prototype: DateSquirrelElement;
}

let cached: DateSquirrelElementConstructor | undefined;

/**
 * Build (and memoise) the element class. Throws if there is no DOM, since a
 * custom element cannot exist without one.
 */
export function getDateSquirrelElementClass(): DateSquirrelElementConstructor {
  if (cached) return cached;
  if (typeof HTMLElement === 'undefined') {
    throw new Error(
      'date-squirrel: <date-squirrel> needs a DOM. Call defineDateSquirrel() in the browser.',
    );
  }

  cached = class DateSquirrelElementImpl extends HTMLElement {
    static get observedAttributes(): readonly string[] {
      return OBSERVED;
    }

    picker: DateSquirrel | null = null;

    #input: HTMLInputElement | null = null;
    #ownsInput = false;
    #upgrading = false;
    #disabledDates: readonly DisabledDateSpec[] | false = false;

    // ---- properties ----

    get value(): string {
      return this.picker?.valueAsString ?? this.getAttribute('value') ?? '';
    }
    set value(next: string) {
      if (this.picker) this.picker.setValue(next || null);
      else this.setAttribute('value', next);
    }

    get valueAsDate(): Date | null {
      return this.picker?.valueAsDate ?? null;
    }

    get valueAsPlainDate(): PlainDate | null {
      return this.picker?.value ?? null;
    }

    get mode(): PickerMode {
      return (this.getAttribute('mode') as PickerMode | null) ?? 'ymd';
    }
    set mode(next: PickerMode) {
      this.setAttribute('mode', next);
    }

    get disabledDates(): readonly DisabledDateSpec[] | false {
      return this.#disabledDates;
    }
    set disabledDates(next: readonly DisabledDateSpec[] | false) {
      this.#disabledDates = next;
      this.picker?.setOptions({ disabledDates: next });
    }

    get input(): HTMLInputElement | null {
      return this.#input;
    }

    // ---- lifecycle ----

    connectedCallback(): void {
      if (this.picker) return;
      this.#input = this.#ensureInput();
      this.picker = new DateSquirrel(this.#input, this.#readOptions());

      const initial = this.getAttribute('value');
      if (initial) this.picker.setValue(initial, { silent: true });
    }

    disconnectedCallback(): void {
      this.picker?.destroy();
      this.picker = null;
      if (this.#ownsInput) {
        this.#input?.remove();
        this.#input = null;
        this.#ownsInput = false;
      }
    }

    attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
      if (previous === next || !this.picker || this.#upgrading) return;

      if (name === 'value') {
        this.picker.setValue(next || null);
        return;
      }
      if (name === 'placeholder' && this.#input) {
        if (next === null) this.#input.removeAttribute('placeholder');
        else this.#input.placeholder = next;
        return;
      }
      if ((name === 'disabled' || name === 'required') && this.#input) {
        this.#input.toggleAttribute(name, next !== null);
        return;
      }
      if (name === 'name' && this.#input) {
        this.#input.name = next ?? '';
        return;
      }

      // Anything else is a picker option; re-resolve and refresh in place.
      this.picker.setOptions(this.#readOptions());
    }

    // ---- internals ----

    #ensureInput(): HTMLInputElement {
      const existing = this.querySelector('input');
      if (existing) return existing;

      this.#upgrading = true;
      const input = document.createElement('input');
      input.type = 'text';
      const name = this.getAttribute('name');
      if (name !== null) input.name = name;
      const placeholder = this.getAttribute('placeholder');
      if (placeholder !== null) input.placeholder = placeholder;
      if (this.hasAttribute('disabled')) input.disabled = true;
      if (this.hasAttribute('required')) input.required = true;
      if (this.id) input.id = `${this.id}-input`;
      this.append(input);
      this.#ownsInput = true;
      this.#upgrading = false;
      return input;
    }

    #readOptions(): DateSquirrelUserOptions {
      const options: DateSquirrelUserOptions = {
        mode: this.mode,
        overlay: this.hasAttribute('overlay'),
        hideScrollbars: this.hasAttribute('hide-scrollbars'),
        disabledDates: this.#disabledDates,
      };

      const min = this.getAttribute('min');
      if (min) options.min = min;
      const max = this.getAttribute('max');
      if (max) options.max = max;
      const pattern = this.getAttribute('pattern');
      if (pattern) options.pattern = pattern;
      const patternSave = this.getAttribute('pattern-save');
      if (patternSave) options.patternSave = patternSave;
      const locale = this.getAttribute('locale');
      if (locale) options.locale = locale;

      const firstDay = this.getAttribute('first-day-of-week');
      if (firstDay !== null) {
        options.firstDayOfWeek = firstDay === 'auto' ? 'auto' : Number(firstDay);
      }
      // `mark-today` defaults on, so only an explicit "false" turns it off.
      if (this.hasAttribute('mark-today')) {
        options.markToday = this.getAttribute('mark-today') !== 'false';
      }

      return options;
    }
  } as unknown as DateSquirrelElementConstructor;

  return cached;
}

/**
 * Register `<date-squirrel>`. Safe to call more than once, and a no-op when
 * there is no DOM, so it can sit in a module that also runs on the server.
 */
export function defineDateSquirrel(tag: string = DATE_SQUIRREL_TAG): void {
  if (typeof customElements === 'undefined') return;
  if (customElements.get(tag)) return;
  customElements.define(tag, getDateSquirrelElementClass());
}

declare global {
  interface HTMLElementTagNameMap {
    'date-squirrel': DateSquirrelElement;
  }
}
