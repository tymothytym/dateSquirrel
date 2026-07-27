/**
 * Option handling: defaults, normalisation and legacy aliases.
 *
 * Three 0.x bugs are fixed structurally here rather than patched:
 *
 *  1. Defaults were a shared module-level object that the constructor wrote to
 *     when an input carried `min`/`max`, so a second picker on the page silently
 *     inherited the first one's range. Defaults are now produced fresh per call.
 *  2. `extend()` was called without its deep flag, so passing a partial nested
 *     object (`{ parse: { rule: 'mdy' } }`) discarded the sibling defaults.
 *     Nested option groups are now merged key-by-key.
 *  3. `settings.js` defined `disableDates` while `core.js` read `disabledDates`,
 *     making the default unreachable. Both spellings are now accepted.
 */

import { PlainDate } from './plain-date.js';
import type { PlainDateInput } from './plain-date.js';
import type { DisabledDateSpec } from './disabled.js';
import type { ParseRule } from './parse.js';

/**
 * How much of a date the user picks.
 *  - `ymd` — year, then month, then day (the classic behaviour)
 *  - `ym`  — year, then month; the value is a whole month
 *  - `y`   — year only
 */
export type PickerMode = 'y' | 'ym' | 'ymd';

export interface ParseSettings {
  /** Re-format free text the user types. */
  active: boolean;
  /** Debounce in ms before parsing typed text. */
  delay: number;
  /** DOM event that triggers a parse attempt. */
  event: string;
  /** Expected order of ambiguous numeric parts. */
  rule: ParseRule;
}

export interface CallbackContext {
  /** The selected date, or undefined if the value was cleared. */
  date: PlainDate | undefined;
  /** Value formatted with `pattern` — what the user sees. */
  human: string | undefined;
  /** Value formatted with `patternSave` — what you store. */
  save: string | undefined;
  input: HTMLInputElement;
  wrapper: HTMLElement;
}

export interface DateSquirrelOptions {
  mode: PickerMode;

  /** Earliest selectable date. Also settable via the input's `min` attribute. */
  min: PlainDateInput | (() => PlainDateInput) | null;
  /** Latest selectable date. Also settable via the input's `max` attribute. */
  max: PlainDateInput | (() => PlainDateInput) | null;

  /** Value to show before any user input. */
  initial: PlainDateInput | null;

  /** Display format shown in the input. Defaults per mode. */
  pattern: string;
  /** Storage format written to `data-dsq-date`. Defaults per mode. */
  patternSave: string;

  /** BCP 47 tag(s) for month/weekday names and ordinals. Defaults to the browser locale. */
  locale: string | string[] | undefined;
  /** `'auto'` follows the locale; a number is 0 = Sunday .. 6 = Saturday. */
  firstDayOfWeek: number | 'auto';
  /** Overrides locale long month names. */
  monthNames: readonly string[] | undefined;
  /** Overrides locale short month names, which label the month list. */
  monthNamesShort: readonly string[] | undefined;

  /** Dates the user may not pick. See {@link DisabledDateSpec}. */
  disabledDates: readonly DisabledDateSpec[] | false;

  /** Mark the current day in the day grid. */
  markToday: boolean;
  /** Visually hide the year/month list scrollbars. */
  hideScrollbars: boolean;
  /** Float the panel over the page instead of pushing content down. */
  overlay: boolean;
  /** Close the panel once the value is complete. */
  closeOnSelect: boolean;

  /** Prefix for generated class names. Changing it means shipping your own CSS. */
  classPrefix: string;

  /** Return false to leave the native input untouched (e.g. on small screens). */
  activation: (this: void, input: HTMLInputElement) => boolean;
  /** Fired whenever the value changes. Prefer the `dsq:change` DOM event. */
  callback: (this: CallbackContext, context: CallbackContext) => void;

  parse: ParseSettings;
}

/** What callers may pass: everything optional, nested groups partial. */
export type DateSquirrelUserOptions = Partial<Omit<DateSquirrelOptions, 'parse'>> & {
  parse?: Partial<ParseSettings> | boolean;

  // ---- 0.x aliases, still accepted ----
  /** @deprecated Use `min`. */
  start?: DateSquirrelOptions['min'];
  /** @deprecated Use `max`. */
  end?: DateSquirrelOptions['max'];
  /** @deprecated Use `mode: 'ym'` (day: false) or `mode: 'y'`. */
  day?: boolean;
  /** @deprecated Use `mode: 'y'`. */
  month?: boolean;
  /** @deprecated Misspelling of `disabledDates` in 0.x settings. */
  disableDates?: DateSquirrelOptions['disabledDates'];
  /** @deprecated Use `monthNamesShort`. */
  monthList?: readonly string[];
};

const DEFAULT_PATTERNS: Record<PickerMode, { pattern: string; patternSave: string }> = {
  ymd: { pattern: 'dx mmm yyyy', patternSave: 'yyyy-mm-dd' },
  ym: { pattern: 'mmm yyyy', patternSave: 'yyyy-mm' },
  y: { pattern: 'yyyy', patternSave: 'yyyy' },
};

/** Fresh defaults on every call — never a shared mutable object. */
export function defaultOptions(mode: PickerMode = 'ymd'): DateSquirrelOptions {
  const patterns = DEFAULT_PATTERNS[mode];
  return {
    mode,
    min: null,
    max: null,
    initial: null,
    pattern: patterns.pattern,
    patternSave: patterns.patternSave,
    locale: undefined,
    firstDayOfWeek: 'auto',
    monthNames: undefined,
    monthNamesShort: undefined,
    disabledDates: false,
    markToday: true,
    hideScrollbars: false,
    overlay: false,
    closeOnSelect: true,
    classPrefix: 'dsq-',
    activation: () => true,
    callback: () => {},
    parse: { active: true, delay: 150, event: 'change', rule: 'dmy' },
  };
}

export interface ResolvedRange {
  min: PlainDate | null;
  max: PlainDate | null;
}

/** Merge user options over the defaults, resolving aliases and mode inference. */
export function resolveOptions(user: DateSquirrelUserOptions = {}): DateSquirrelOptions {
  const mode = inferMode(user);
  const base = defaultOptions(mode);

  // Only override the mode-derived pattern defaults if the caller asked.
  const merged: DateSquirrelOptions = {
    ...base,
    ...stripUndefined(user as Partial<DateSquirrelOptions>),
    mode,
    parse: resolveParse(base.parse, user.parse),
  };

  // ---- aliases ----
  if (user.min === undefined && user.start !== undefined) merged.min = user.start;
  if (user.max === undefined && user.end !== undefined) merged.max = user.end;
  if (user.disabledDates === undefined && user.disableDates !== undefined) {
    merged.disabledDates = user.disableDates;
  }
  if (user.monthNamesShort === undefined && user.monthList !== undefined) {
    merged.monthNamesShort = user.monthList;
  }

  return merged;
}

function inferMode(user: DateSquirrelUserOptions): PickerMode {
  if (user.mode) return user.mode;
  // 0.x expressed the same thing with two booleans.
  if (user.month === false) return 'y';
  if (user.day === false) return 'ym';
  return 'ymd';
}

function resolveParse(base: ParseSettings, user: Partial<ParseSettings> | boolean | undefined): ParseSettings {
  if (user === undefined) return { ...base };
  if (typeof user === 'boolean') return { ...base, active: user };
  return { ...base, ...stripUndefined(user) };
}

function stripUndefined<T extends object>(source: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(source) as (keyof T)[]) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
}

/** Resolve `min`/`max` — each may be a value or a function evaluated per instance. */
export function resolveRange(options: DateSquirrelOptions, input: HTMLInputElement): ResolvedRange {
  // Attributes lose to explicit options but beat the defaults.
  const fromAttribute = (name: 'min' | 'max'): PlainDate | null => {
    const raw = input.getAttribute(name);
    return raw ? PlainDate.from(raw) : null;
  };

  const min = resolveBound(options.min) ?? fromAttribute('min');
  const max = resolveBound(options.max) ?? fromAttribute('max') ?? defaultMax(min);

  // A reversed range would render an empty picker; swap rather than fail.
  if (min && max && min.isAfter(max)) return { min: max, max: min };
  return { min, max };
}

function resolveBound(bound: DateSquirrelOptions['min']): PlainDate | null {
  if (bound == null) return null;
  const value = typeof bound === 'function' ? (bound as () => PlainDateInput)() : bound;
  return PlainDate.from(value);
}

/** Without an explicit max, offer ten years forward — the 0.x default. */
function defaultMax(min: PlainDate | null): PlainDate {
  const from = min ?? PlainDate.today();
  return from.addYears(10);
}

/** The precision a mode selects down to. */
export function modePrecision(mode: PickerMode): 'year' | 'month' | 'day' {
  return mode === 'y' ? 'year' : mode === 'ym' ? 'month' : 'day';
}
