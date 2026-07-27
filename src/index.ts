/**
 * dateSquirrel — a year → month → day drill-down date picker with a nutty tang.
 *
 * Zero runtime dependencies. Framework-agnostic.
 *
 * @example Imperative (works in any framework, including React)
 * ```ts
 * import { DateSquirrel } from 'date-squirrel';
 * import 'date-squirrel/styles.css';
 *
 * const picker = new DateSquirrel('#month', { mode: 'ym' });
 * picker.setValue('2026-07');
 * picker.valueAsString; // "2026-07"
 * ```
 *
 * @example Declarative (custom element)
 * ```ts
 * import 'date-squirrel/element';
 * ```
 * ```html
 * <date-squirrel mode="ym"><input name="from"></date-squirrel>
 * ```
 *
 * This entry point has no side effects — it does not register the custom
 * element. Import `date-squirrel/element` for that.
 */

import './styles/date-squirrel.css';

// ---- the picker ----
export { DateSquirrel } from './picker.js';
/** @deprecated 0.x name for {@link DateSquirrel}. Kept to ease migration. */
export { DateSquirrel as dsq } from './picker.js';
export type {
  Stage,
  DateSquirrelChangeDetail,
  SetValueOptions,
} from './picker.js';

// ---- options ----
export { defaultOptions, resolveOptions, modePrecision } from './core/options.js';
export type {
  DateSquirrelOptions,
  DateSquirrelUserOptions,
  PickerMode,
  ParseSettings,
  CallbackContext,
} from './core/options.js';

// ---- the date value type ----
export { PlainDate, daysInMonth, isLeapYear, daysBetween, monthsBetween, clamp } from './core/plain-date.js';
export type { PlainDateParts, PlainDateInput, LegacyDateParts } from './core/plain-date.js';

// ---- formatting & parsing, usable standalone ----
export { format, patternTokens, monthNames, weekdayNames, firstDayOfWeek } from './core/format.js';
export type { FormatContext, FormatToken } from './core/format.js';
export { parseDate, parseDateParts } from './core/parse.js';
export type { ParseRule, ParseOptions, ParsedDate } from './core/parse.js';

// ---- disabled-date rules ----
export { parseDisabledDates, Selectability } from './core/disabled.js';
export type { DisabledRule, DisabledDateSpec, DisabledRangeObject } from './core/disabled.js';

// ---- the custom element ----
// The class itself is intentionally NOT constructed here. `defineDateSquirrel`
// is a no-op without a DOM, so this entry point stays safe to import on a
// server; `date-squirrel/element` is the browser-side registration entry.
export {
  defineDateSquirrel,
  getDateSquirrelElementClass,
  DATE_SQUIRREL_TAG,
} from './custom-element.js';
export type {
  DateSquirrelElement,
  DateSquirrelElementConstructor,
} from './custom-element.js';
