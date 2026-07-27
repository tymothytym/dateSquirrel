/**
 * dateSquirrel — a year → month → day drill-down date picker.
 *
 * Structural changes from 0.x worth knowing about:
 *
 *  - Listeners are registered through a single `AbortController`, so `destroy()`
 *    genuinely removes every one of them. The 0.x `destroy()` guarded its
 *    cleanup with `if (!nodeList)`, which is never true for a NodeList, so it
 *    silently removed nothing and leaked on every teardown.
 *  - Clicks and keys are handled by delegation on the wrapper instead of a
 *    listener per `<li>`, so switching month no longer churns ~40 listeners.
 *  - Keyboard handling uses `event.key`, not the deprecated `event.which`.
 *  - Panels are built with `createElement`, not `insertAdjacentHTML` with the
 *    input's id interpolated into a markup string.
 *  - Roles are set with `setAttribute`. 0.x assigned `element.role = 'listbox'`,
 *    a property that no browser of that era reflected, so the lists shipped
 *    with `role="option"` children and no owning listbox.
 *  - No IE11 polyfills, no `attachEvent`, no BlackBerry OS 6 workarounds.
 */

import { PlainDate, clamp } from './core/plain-date.js';
import type { PlainDateInput } from './core/plain-date.js';
import { Selectability, parseDisabledDates } from './core/disabled.js';
import { format, monthNames, weekdayNames, firstDayOfWeek } from './core/format.js';
import { parseDate } from './core/parse.js';
import {
  resolveOptions,
  resolveRange,
  modePrecision,
} from './core/options.js';
import type {
  CallbackContext,
  DateSquirrelOptions,
  DateSquirrelUserOptions,
  PickerMode,
} from './core/options.js';

export type Stage = 'year' | 'month' | 'day';

export interface DateSquirrelChangeDetail {
  date: PlainDate | null;
  human: string;
  save: string;
  mode: PickerMode;
}

export interface SetValueOptions {
  /** Suppress the change event and callback. */
  silent?: boolean;
  /** Parse order when `value` is free text. Defaults to `options.parse.rule`. */
  rule?: DateSquirrelOptions['parse']['rule'];
}

interface Draft {
  year: number | null;
  month: number | null;
  day: number | null;
}

const CUSTOM_EVENTS = {
  change: 'dsq:change',
  open: 'dsq:open',
  close: 'dsq:close',
} as const;

export class DateSquirrel {
  readonly input: HTMLInputElement;
  readonly options: DateSquirrelOptions;

  /** False when `options.activation` declined; the input is left untouched. */
  readonly active: boolean;

  private wrapperEl: HTMLDivElement | null = null;
  private panelEl!: HTMLDivElement;
  private yearListEl!: HTMLUListElement;
  private monthListEl!: HTMLUListElement;
  private dayWrapEl!: HTMLDivElement;
  private dayGridEl!: HTMLDivElement;
  private backButtonEl!: HTMLButtonElement;

  private controller = new AbortController();
  private readonly uid: string;
  private readonly originalType: string;
  private readonly originalReadOnly: boolean;

  private min: PlainDate | null = null;
  private max: PlainDate | null = null;
  private selectability!: Selectability;

  private stage: Stage = 'year';
  private draft: Draft = { year: null, month: null, day: null };
  private committed: PlainDate | null = null;

  private hasYearChoice = true;
  private hasMonthChoice = true;

  private open = false;
  private destroyed = false;
  /**
   * Set while we move focus back to the input on purpose. Without it, the
   * focus listener reopens the panel that Escape just closed.
   */
  private suppressOpen = false;
  /** Guards against our own dispatched `change` re-entering the parse handler. */
  private emitting = false;
  private parseTimer: ReturnType<typeof setTimeout> | undefined;

  private monthLabels: string[] = [];
  private weekStart = 1;

  constructor(target: string | HTMLInputElement, userOptions: DateSquirrelUserOptions = {}) {
    const element = typeof target === 'string' ? document.querySelector(target) : target;
    if (!element) {
      throw new Error(`dateSquirrel: no element matched ${JSON.stringify(target)}`);
    }
    if (!(element instanceof HTMLInputElement)) {
      throw new TypeError(`dateSquirrel: expected an <input>, received <${element.nodeName.toLowerCase()}>`);
    }

    this.input = element;
    this.options = resolveOptions(userOptions);
    this.originalType = element.getAttribute('type') ?? 'text';
    this.originalReadOnly = element.readOnly;
    this.uid = `dsq-${element.id || Math.random().toString(36).slice(2, 8)}`;

    this.active = this.options.activation.call(undefined, element) !== false;
    if (!this.active) return;

    this.applyRange();
    this.buildDom();
    this.bindEvents();
    this.renderYears();
    this.renderMonths();
    this.stage = this.initialStage();
    this.syncStage();
    // Establishes the roving tabindex, so a fresh picker with no value still
    // has exactly one keyboard entry point per list.
    this.markSelection();

    const initial = this.options.initial ?? this.readInputValue();
    if (initial != null) this.setValue(initial, { silent: true });
  }

  // ---------------------------------------------------------------- public API

  /** The committed value, or null. In `ym`/`y` mode the unused parts are 1/January. */
  get value(): PlainDate | null {
    return this.committed;
  }

  /** The committed value as a native `Date` at local midnight, or null. */
  get valueAsDate(): Date | null {
    return this.committed ? this.committed.toDate() : null;
  }

  /** The committed value formatted with `patternSave` — what you persist. */
  get valueAsString(): string {
    return this.committed ? format(this.committed, this.options.patternSave, this.formatContext()) : '';
  }

  get wrapper(): HTMLElement | null {
    return this.wrapperEl;
  }

  get mode(): PickerMode {
    return this.options.mode;
  }

  get isOpen(): boolean {
    return this.open;
  }

  /**
   * Read the value. With no argument returns the `PlainDate`; with a pattern
   * returns formatted text. Mirrors the 0.x signature.
   */
  getValue(): PlainDate | null;
  getValue(pattern: string): string;
  getValue(pattern?: string): PlainDate | string | null {
    if (pattern === undefined) return this.committed;
    return this.committed ? format(this.committed, pattern, this.formatContext()) : '';
  }

  /**
   * Set the value from a date, a `{ y, m, d }` object, or free text.
   * Returns false if the input could not be understood or is not selectable.
   */
  setValue(value: PlainDateInput | null, options: SetValueOptions = {}): boolean {
    if (!this.active || this.destroyed) return false;

    if (value === null || value === '') {
      this.clear({ silent: options.silent ?? false });
      return true;
    }

    const parsed = this.coerce(value, options.rule);
    if (!parsed) return false;

    const snapped = this.snapToPrecision(parsed);
    if (!this.isSelectable(snapped)) return false;

    this.committed = snapped;
    this.draft = { year: snapped.year, month: snapped.month, day: snapped.day };
    this.writeValue();
    this.renderDays();
    this.refreshMonthStates();
    this.markSelection();
    if (!options.silent) this.emitChange();
    return true;
  }

  /** Clear the value and reset the drill-down to the first stage. */
  clear(options: { silent?: boolean } = {}): void {
    if (!this.active || this.destroyed) return;
    this.committed = null;
    this.draft = { year: null, month: null, day: null };
    this.input.value = '';
    this.input.removeAttribute('data-dsq-date');
    this.stage = this.initialStage();
    this.syncStage();
    this.markSelection();
    if (!options.silent) this.emitChange();
  }

  openPanel(): void {
    if (!this.active || this.destroyed || this.open || this.suppressOpen) return;
    this.open = true;
    this.wrapperEl?.setAttribute('data-open', 'true');
    this.input.setAttribute('aria-expanded', 'true');
    if (this.isCoarsePointer()) this.input.readOnly = true;
    this.refreshMonthStates();
    this.syncScroll();
    this.dispatch(CUSTOM_EVENTS.open);
  }

  closePanel(): void {
    if (!this.active || this.destroyed || !this.open) return;
    this.open = false;
    this.wrapperEl?.setAttribute('data-open', 'false');
    this.input.setAttribute('aria-expanded', 'false');
    this.input.readOnly = this.originalReadOnly;
    this.dispatch(CUSTOM_EVENTS.close);
  }

  /** Re-read `min`/`max`/`disabledDates` and rebuild the panels. */
  refresh(): void {
    if (!this.active || this.destroyed) return;
    this.applyRange();
    this.renderYears();
    this.renderMonths();
    this.renderDays();
    this.markSelection();
  }

  /** Apply option changes in place, then refresh. */
  setOptions(patch: DateSquirrelUserOptions): void {
    if (!this.active || this.destroyed) return;
    Object.assign(this.options, resolveOptions({ ...this.options, ...patch }));
    this.monthLabels = [];
    this.refresh();
    this.writeValue();
  }

  /** Remove every listener and every generated node, restoring the input. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.controller.abort();
    clearTimeout(this.parseTimer);

    if (!this.active || !this.wrapperEl) return;

    this.input.removeAttribute('data-dsq-date');
    this.input.removeAttribute('aria-expanded');
    this.input.removeAttribute('aria-haspopup');
    this.input.removeAttribute('aria-controls');
    this.input.removeAttribute('autocomplete');
    this.input.setAttribute('type', this.originalType);
    this.input.readOnly = this.originalReadOnly;

    // Put the input back where it was, then drop everything we added.
    this.wrapperEl.replaceWith(this.input);
    this.wrapperEl = null;
  }

  // ------------------------------------------------------------------ internals

  private applyRange(): void {
    const { min, max } = resolveRange(this.options, this.input);
    this.min = min;
    this.max = max;
    const { rules, invalid } = parseDisabledDates(this.options.disabledDates);
    if (invalid.length > 0) {
      console.warn('dateSquirrel: unrecognised disabledDates entries', invalid);
    }
    this.selectability = new Selectability({ min, max, rules });
    this.hasYearChoice = !min || !max || min.year !== max.year;
    this.hasMonthChoice = !min || !max || !min.isSameMonth(max);
    this.weekStart =
      this.options.firstDayOfWeek === 'auto'
        ? firstDayOfWeek(this.options.locale)
        : ((this.options.firstDayOfWeek % 7) + 7) % 7;
  }

  private cls(name: string): string {
    return `${this.options.classPrefix}${name}`;
  }

  private formatContext() {
    return {
      locale: this.options.locale,
      monthNames: this.options.monthNames,
      monthNamesShort: this.options.monthNamesShort,
    };
  }

  private shortMonthLabels(): string[] {
    if (this.monthLabels.length === 0) {
      this.monthLabels =
        this.options.monthNamesShort?.slice() ?? monthNames(this.options.locale, 'short');
    }
    return this.monthLabels;
  }

  // ---- DOM construction ----

  private buildDom(): void {
    const prefix = this.options.classPrefix;

    const wrapper = document.createElement('div');
    wrapper.className = 'dsq';
    wrapper.id = this.uid;
    wrapper.setAttribute('data-mode', this.options.mode);
    wrapper.setAttribute('data-open', 'false');
    if (this.options.hideScrollbars) wrapper.setAttribute('data-hide-scrollbars', 'true');
    if (this.isCoarsePointer()) wrapper.setAttribute('data-touch', 'true');

    const panel = document.createElement('div');
    panel.className = `${prefix}lists`;
    panel.id = `${this.uid}-panel`;
    if (this.options.overlay) panel.setAttribute('data-overlay', 'true');

    const years = document.createElement('ul');
    years.className = `${prefix}list-years`;
    years.setAttribute('role', 'listbox');
    years.setAttribute('aria-label', 'Year');
    years.id = `${this.uid}-years`;

    const months = document.createElement('ul');
    months.className = `${prefix}list-months`;
    months.setAttribute('role', 'listbox');
    months.setAttribute('aria-label', 'Month');
    months.id = `${this.uid}-months`;

    const dayWrap = document.createElement('div');
    dayWrap.className = `${prefix}days`;

    const side = document.createElement('span');
    side.className = `${prefix}side`;

    // 0.x used an <a> with no href here, which is not focusable or operable
    // by keyboard. A real button is.
    const back = document.createElement('button');
    back.type = 'button';
    back.className = `${prefix}reminder`;
    back.setAttribute('data-action', 'back');

    const dayGrid = document.createElement('div');
    dayGrid.className = `${prefix}list-days`;
    dayGrid.setAttribute('role', 'grid');
    dayGrid.setAttribute('aria-labelledby', back.id || `${this.uid}-back`);
    back.id = `${this.uid}-back`;
    dayGrid.id = `${this.uid}-days`;

    side.append(back);
    dayWrap.append(side, dayGrid);
    panel.append(years, months, dayWrap);

    this.input.replaceWith(wrapper);
    wrapper.append(this.input, panel);

    // A text input, because a native date input renders its own picker.
    this.input.setAttribute('type', 'text');
    this.input.setAttribute('autocomplete', 'off');
    this.input.setAttribute('aria-haspopup', 'dialog');
    this.input.setAttribute('aria-expanded', 'false');
    this.input.setAttribute('aria-controls', panel.id);

    this.wrapperEl = wrapper;
    this.panelEl = panel;
    this.yearListEl = years;
    this.monthListEl = months;
    this.dayWrapEl = dayWrap;
    this.dayGridEl = dayGrid;
    this.backButtonEl = back;
  }

  private renderYears(): void {
    const from = (this.min ?? PlainDate.today()).year;
    const to = (this.max ?? PlainDate.today().addYears(10)).year;
    const fragment = document.createDocumentFragment();

    // Descending, so the nearest years are reachable first — 0.x behaviour.
    for (let year = to; year >= from; year--) {
      const item = document.createElement('li');
      item.id = `${this.uid}-y-${year}`;
      item.className = this.cls('option');
      item.dataset.year = String(year);
      item.setAttribute('role', 'option');
      item.setAttribute('tabindex', '-1');
      item.textContent = String(year);
      if (!this.selectability.isYearSelectable(year)) {
        item.classList.add(this.cls('disabled'));
        item.setAttribute('aria-disabled', 'true');
      }
      fragment.append(item);
    }

    this.yearListEl.replaceChildren(fragment);
    this.wrapperEl?.setAttribute('data-single-year', String(!this.hasYearChoice));
  }

  private renderMonths(): void {
    const labels = this.shortMonthLabels();
    const fragment = document.createDocumentFragment();

    for (let month = 0; month < 12; month++) {
      const item = document.createElement('li');
      item.id = `${this.uid}-m-${month}`;
      item.className = this.cls('option');
      item.dataset.month = String(month);
      item.setAttribute('role', 'option');
      item.setAttribute('tabindex', '-1');
      item.textContent = labels[month] ?? String(month + 1);
      fragment.append(item);
    }

    this.monthListEl.replaceChildren(fragment);
    this.wrapperEl?.setAttribute('data-single-month', String(!this.hasMonthChoice));
    this.refreshMonthStates();
  }

  /** Enable/disable months for the currently drafted year. */
  private refreshMonthStates(): void {
    const year = this.draft.year ?? this.min?.year;
    if (year == null) return;

    for (const item of this.monthListEl.children) {
      if (!(item instanceof HTMLElement)) continue;
      const month = Number(item.dataset.month);
      const selectable = this.selectability.isMonthSelectable(year, month);
      item.classList.toggle(this.cls('disabled'), !selectable);
      if (selectable) item.removeAttribute('aria-disabled');
      else item.setAttribute('aria-disabled', 'true');
    }
  }

  private renderDays(): void {
    if (this.options.mode !== 'ymd') return;
    const year = this.draft.year;
    const month = this.draft.month;
    if (year == null || month == null) return;

    const labels = this.shortMonthLabels();
    this.backButtonEl.replaceChildren();
    const monthSpan = document.createElement('span');
    monthSpan.className = this.cls('reminder-month');
    monthSpan.textContent = labels[month] ?? String(month + 1);
    const yearSpan = document.createElement('span');
    yearSpan.className = this.cls('reminder-year');
    yearSpan.textContent = String(year);
    this.backButtonEl.append(monthSpan, document.createTextNode(' '), yearSpan);
    this.backButtonEl.setAttribute(
      'aria-label',
      `${monthSpan.textContent} ${year} — change month or year`,
    );

    const fragment = document.createDocumentFragment();
    const dayLabels = weekdayNames(this.options.locale, 'short');
    const longLabels = weekdayNames(this.options.locale, 'long');

    const headerRow = document.createElement('div');
    headerRow.className = this.cls('dow');
    headerRow.setAttribute('role', 'row');
    for (let offset = 0; offset < 7; offset++) {
      const weekday = (this.weekStart + offset) % 7;
      const cell = document.createElement('span');
      cell.className = this.cls('dow-header');
      cell.setAttribute('role', 'columnheader');
      cell.setAttribute('aria-label', longLabels[weekday] ?? '');
      cell.textContent = dayLabels[weekday] ?? '';
      headerRow.append(cell);
    }
    fragment.append(headerRow);

    const first = new PlainDate(year, month, 1);
    const total = first.daysInMonth;
    const lead = (first.weekday - this.weekStart + 7) % 7;
    const today = PlainDate.today();

    let row = this.newWeekRow();
    for (let blank = 0; blank < lead; blank++) row.append(this.newPaddingCell());

    for (let day = 1; day <= total; day++) {
      if (row.children.length === 7) {
        fragment.append(row);
        row = this.newWeekRow();
      }
      const date = new PlainDate(year, month, day);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.id = `${this.uid}-d-${day}`;
      cell.className = this.cls('day');
      cell.dataset.day = String(day);
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('tabindex', '-1');
      cell.textContent = String(day);
      cell.setAttribute(
        'aria-label',
        format(date, 'wwww dx mmmm yyyy', this.formatContext()),
      );

      // Disabled days stay focusable and are marked with aria-disabled, per the
      // ARIA grid pattern — using the `disabled` attribute would drop them out
      // of the keyboard walk entirely.
      if (!this.selectability.isDaySelectable(date)) {
        cell.classList.add(this.cls('disabled'));
        cell.setAttribute('aria-disabled', 'true');
      }
      if (this.options.markToday && date.equals(today)) {
        cell.classList.add(this.cls('today'));
      }
      row.append(cell);
    }

    while (row.children.length < 7) row.append(this.newPaddingCell());
    fragment.append(row);

    this.dayGridEl.replaceChildren(fragment);
    this.markSelection();
  }

  private newWeekRow(): HTMLDivElement {
    const row = document.createElement('div');
    row.className = this.cls('week');
    row.setAttribute('role', 'row');
    return row;
  }

  private newPaddingCell(): HTMLSpanElement {
    const cell = document.createElement('span');
    cell.className = this.cls('padding');
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-hidden', 'true');
    return cell;
  }

  // ---- selection state in the DOM ----

  private markSelection(): void {
    const mark = (list: Element, matches: (el: HTMLElement) => boolean) => {
      let active: HTMLElement | null = null;
      for (const child of list.querySelectorAll<HTMLElement>('[role="option"], [role="gridcell"]')) {
        const selected = matches(child);
        child.classList.toggle(this.cls('active'), selected);
        if (child.getAttribute('role') === 'option') {
          child.setAttribute('aria-selected', String(selected));
        } else if (selected) {
          child.setAttribute('aria-selected', 'true');
        } else {
          child.removeAttribute('aria-selected');
        }
        if (selected) active = child;
      }
      // Roving tabindex: exactly one reachable stop per list.
      const stops = list.querySelectorAll<HTMLElement>('[role="option"], button[role="gridcell"]');
      for (const stop of stops) stop.setAttribute('tabindex', '-1');
      (active ?? stops[0])?.setAttribute('tabindex', '0');
    };

    mark(this.yearListEl, (el) => Number(el.dataset.year) === this.draft.year);
    mark(this.monthListEl, (el) => Number(el.dataset.month) === this.draft.month);
    mark(this.dayGridEl, (el) => Number(el.dataset.day) === this.draft.day);
  }

  /**
   * Bring the relevant option into view inside its own scroll container.
   *
   * Deliberately arithmetic on `scrollTop` rather than `Element.scrollIntoView`,
   * which also scrolls every scrollable ancestor and would yank the page around
   * whenever the panel opens.
   */
  private scrollActiveIntoView(list: HTMLElement): void {
    const active =
      list.querySelector<HTMLElement>(`.${this.cls('active')}`) ??
      list.querySelector<HTMLElement>('[role="option"]:not([aria-disabled="true"])');
    if (!active) return;
    const centred = active.offsetTop - list.clientHeight / 2 + active.offsetHeight / 2;
    list.scrollTop = Math.max(0, centred);
  }

  /** Centre both lists on whatever is currently relevant. */
  private syncScroll(): void {
    this.scrollActiveIntoView(this.yearListEl);
    this.scrollActiveIntoView(this.monthListEl);
  }

  private initialStage(): Stage {
    if (this.hasYearChoice) return 'year';
    // A single-year range starts the user at the month list, and a single-month
    // range starts them on the days.
    this.draft.year = this.min?.year ?? PlainDate.today().year;
    if (this.options.mode === 'y') return 'year';
    if (this.hasMonthChoice) return 'month';
    this.draft.month = this.min?.month ?? 0;
    return this.options.mode === 'ym' ? 'month' : 'day';
  }

  private syncStage(): void {
    this.wrapperEl?.setAttribute('data-stage', this.stage);
    if (this.stage === 'day' && this.draft.year != null && this.draft.month != null) {
      this.renderDays();
    }
    if (this.open) this.syncScroll();
  }

  private advanceStage(): void {
    const precision = modePrecision(this.options.mode);
    if (this.stage === 'year') {
      if (precision === 'year') return this.commit();
      this.stage = 'month';
      this.refreshMonthStates();
      this.syncStage();
      this.focusStage();
      return;
    }
    if (this.stage === 'month') {
      if (precision === 'month') return this.commit();
      this.stage = 'day';
      this.syncStage();
      this.focusStage();
      return;
    }
    this.commit();
  }

  private goBack(): void {
    if (this.stage === 'day') {
      this.stage = this.hasMonthChoice ? 'month' : 'year';
    } else if (this.stage === 'month') {
      if (!this.hasYearChoice) return;
      this.stage = 'year';
    } else {
      return;
    }
    this.syncStage();
    this.focusStage();
  }

  private currentList(): HTMLElement {
    if (this.stage === 'year') return this.yearListEl;
    if (this.stage === 'month') return this.monthListEl;
    return this.dayGridEl;
  }

  private stageCells(): HTMLElement[] {
    const selector = this.stage === 'day' ? 'button[role="gridcell"]' : '[role="option"]';
    return Array.from(this.currentList().querySelectorAll<HTMLElement>(selector));
  }

  private focusStage(): void {
    const cells = this.stageCells();
    const active = cells.find((cell) => cell.getAttribute('tabindex') === '0');
    const enabled = cells.find((cell) => cell.getAttribute('aria-disabled') !== 'true');
    const target = active ?? enabled;
    if (target) this.focusCell(target);
  }

  /**
   * Focus a cell without letting the browser scroll anything on our behalf, then
   * scroll it into view inside its own list.
   *
   * Native focus scrolling walks every scrollable ancestor, which both yanks the
   * page around and — because the panels are translated into place — could shift
   * the panel itself sideways. Doing it by hand keeps the movement local.
   */
  private focusCell(cell: HTMLElement): void {
    cell.focus({ preventScroll: true });

    const list = cell.parentElement;
    if (!list || list.scrollHeight <= list.clientHeight) return;

    const top = cell.offsetTop;
    const bottom = top + cell.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight;
    }
  }

  /**
   * Move focus to the input without the focus listener treating it as a request
   * to open. `focus()` dispatches synchronously, so the flag only needs to
   * cover this call.
   */
  private returnFocusToInput(): void {
    this.suppressOpen = true;
    try {
      this.input.focus();
    } finally {
      this.suppressOpen = false;
    }
  }

  // ---- committing a value ----

  private commit(): void {
    const year = this.draft.year;
    if (year == null) return;
    // Unused precision defaults to the start of the period.
    const month = this.options.mode === 'y' ? 0 : this.draft.month ?? 0;
    const day = this.options.mode === 'ymd' ? this.draft.day ?? 1 : 1;

    const candidate = clamp(new PlainDate(year, month, day), this.min, this.max);
    this.committed = candidate;
    this.draft = { year: candidate.year, month: candidate.month, day: candidate.day };
    this.writeValue();
    this.markSelection();
    this.emitChange();

    if (this.options.closeOnSelect) {
      this.wrapperEl?.setAttribute('data-done', 'true');
      this.closePanel();
      setTimeout(() => this.wrapperEl?.removeAttribute('data-done'), 300);
      this.stage = this.initialStage();
      this.syncStage();
    }
  }

  private writeValue(): void {
    if (!this.committed) return;
    const context = this.formatContext();
    const human = format(this.committed, this.options.pattern, context);
    const save = format(this.committed, this.options.patternSave, context);
    this.setInputValue(human);
    this.input.setAttribute('data-dsq-date', save);
  }

  /**
   * Write to the input through the prototype's value setter.
   *
   * React installs its own `value` descriptor on the element instance to track
   * changes; assigning `input.value` directly updates that tracker too, so
   * React concludes nothing changed and never fires `onChange`. Going through
   * the prototype setter leaves the tracker stale, which is exactly what makes
   * React notice. This is what lets the picker work inside a controlled input.
   */
  private setInputValue(text: string): void {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (descriptor?.set) descriptor.set.call(this.input, text);
    else this.input.value = text;
  }

  private emitChange(): void {
    const context = this.formatContext();
    const human = this.committed ? format(this.committed, this.options.pattern, context) : '';
    const save = this.committed ? format(this.committed, this.options.patternSave, context) : '';

    // Native events first, so forms and React see a normal input change.
    this.emitting = true;
    try {
      this.input.dispatchEvent(new Event('input', { bubbles: true }));
      this.input.dispatchEvent(new Event('change', { bubbles: true }));
    } finally {
      this.emitting = false;
    }

    this.dispatch(CUSTOM_EVENTS.change, {
      date: this.committed,
      human,
      save,
      mode: this.options.mode,
    });

    const callbackContext: CallbackContext = {
      date: this.committed ?? undefined,
      human: this.committed ? human : undefined,
      save: this.committed ? save : undefined,
      input: this.input,
      wrapper: this.wrapperEl as HTMLElement,
    };
    if (typeof this.options.callback === 'function') {
      // 0.x invoked the callback with the context as `this`; both are supported.
      this.options.callback.call(callbackContext, callbackContext);
    }
  }

  private dispatch(type: string, detail?: DateSquirrelChangeDetail): void {
    this.wrapperEl?.dispatchEvent(
      new CustomEvent(type, { bubbles: true, composed: true, detail }),
    );
  }

  // ---- helpers ----

  private coerce(value: PlainDateInput, rule?: DateSquirrelOptions['parse']['rule']): PlainDate | null {
    if (typeof value === 'string') {
      return parseDate(value, {
        rule: rule ?? this.options.parse.rule,
        locale: this.options.locale,
        monthNames: this.options.monthNames,
      });
    }
    return PlainDate.from(value);
  }

  /** Drop precision the mode does not select, so `ym` values are month-aligned. */
  private snapToPrecision(date: PlainDate): PlainDate {
    const precision = modePrecision(this.options.mode);
    if (precision === 'year') return new PlainDate(date.year, 0, 1);
    if (precision === 'month') return new PlainDate(date.year, date.month, 1);
    return date;
  }

  private isSelectable(date: PlainDate): boolean {
    const precision = modePrecision(this.options.mode);
    if (precision === 'year') return this.selectability.isYearSelectable(date.year);
    if (precision === 'month') return this.selectability.isMonthSelectable(date.year, date.month);
    return this.selectability.isDaySelectable(date);
  }

  private readInputValue(): string | null {
    const stored = this.input.getAttribute('data-dsq-date') ?? this.input.value;
    return stored ? stored : null;
  }

  private isCoarsePointer(): boolean {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(any-pointer: coarse)').matches;
  }

  // ---- events ----

  private bindEvents(): void {
    const { signal } = this.controller;
    const wrapper = this.wrapperEl!;

    this.input.addEventListener('focus', () => this.openPanel(), { signal });
    this.input.addEventListener('mousedown', () => this.openPanel(), { signal });

    // Delegation: one click handler for every year, month and day.
    wrapper.addEventListener('click', (event) => this.onClick(event), { signal });
    wrapper.addEventListener('keydown', (event) => this.onKeyDown(event), { signal });

    // Close when focus or a click leaves the component.
    document.addEventListener(
      'pointerdown',
      (event) => {
        const target = event.target;
        if (target instanceof Node && !wrapper.contains(target)) this.closePanel();
      },
      { signal },
    );
    wrapper.addEventListener(
      'focusout',
      (event) => {
        const next = event.relatedTarget;
        if (next instanceof Node && wrapper.contains(next)) return;
        this.closePanel();
      },
      { signal },
    );

    if (this.options.parse.active) {
      this.input.addEventListener(
        this.options.parse.event,
        () => {
          if (this.emitting) return; // our own dispatch, not the user typing
          clearTimeout(this.parseTimer);
          this.parseTimer = setTimeout(() => this.parseTypedValue(), this.options.parse.delay);
        },
        { signal },
      );
    }
  }

  private parseTypedValue(): void {
    const text = this.input.value.trim();
    if (!text) {
      if (this.committed) this.clear();
      return;
    }
    const parsed = this.coerce(text);
    if (parsed && this.isSelectable(this.snapToPrecision(parsed))) {
      this.setValue(parsed);
    } else {
      this.wrapperEl?.setAttribute('data-invalid', 'true');
      setTimeout(() => this.wrapperEl?.removeAttribute('data-invalid'), 600);
    }
  }

  private onClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.closest(`[data-action="back"]`)) {
      event.preventDefault();
      this.goBack();
      return;
    }

    // Deliberately not gated on the current stage. The year list stays visible
    // alongside the months, so clicking a year while on the month stage has to
    // re-select the year rather than be swallowed.
    const cell = target.closest<HTMLElement>('[role="option"], button[role="gridcell"]');
    if (!cell || !this.panelEl.contains(cell)) return;
    if (cell.getAttribute('aria-disabled') === 'true') return;

    event.preventDefault();
    this.select(cell);
  }

  /**
   * Apply a selection and move on.
   *
   * The stage is set from the level that was just chosen, not left at whatever
   * it happened to be. Both lists stay on screen together, so a user can go
   * back and re-pick a year while the month list is showing — that has to
   * rewind the drill-down, not advance it two steps.
   */
  private select(cell: HTMLElement): void {
    if (cell.dataset.year !== undefined) {
      const year = Number(cell.dataset.year);
      if (year !== this.draft.year) {
        // Changing year invalidates a month/day chosen under the old one.
        this.draft = { year, month: null, day: null };
        this.committed = null;
      }
      this.stage = 'year';
      this.markSelection();
      this.advanceStage();
      return;
    }

    if (cell.dataset.month !== undefined) {
      if (this.draft.year == null) return; // no year drafted yet
      const month = Number(cell.dataset.month);
      if (month !== this.draft.month) {
        this.draft = { year: this.draft.year, month, day: null };
        this.committed = null;
      }
      this.stage = 'month';
      this.markSelection();
      this.advanceStage();
      return;
    }

    if (cell.dataset.day !== undefined) {
      if (this.draft.year == null || this.draft.month == null) return;
      this.draft.day = Number(cell.dataset.day);
      this.stage = 'day';
      this.markSelection();
      this.advanceStage();
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      if (this.open) {
        event.preventDefault();
        this.closePanel();
        this.returnFocusToInput();
      }
      return;
    }

    if (event.key === 'Tab') {
      this.closePanel();
      return;
    }

    const typing = event.target === this.input;

    if (typing) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.openPanel();
        this.focusStage();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        this.parseTypedValue();
        this.closePanel();
      }
      return;
    }

    const cells = this.stageCells();
    if (cells.length === 0) return;
    const currentIndex = Math.max(
      cells.findIndex((cell) => cell === document.activeElement),
      0,
    );

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const cell = cells[currentIndex];
      if (cell && cell.getAttribute('aria-disabled') !== 'true') this.select(cell);
      return;
    }

    if (event.key === 'Backspace') {
      event.preventDefault();
      this.goBack();
      return;
    }

    const step = this.stage === 'day' ? 7 : 1;
    let nextIndex: number | null = null;

    switch (event.key) {
      case 'ArrowDown':
        nextIndex = currentIndex + step;
        break;
      case 'ArrowUp':
        nextIndex = currentIndex - step;
        break;
      case 'ArrowRight':
        if (this.stage === 'day') nextIndex = currentIndex + 1;
        break;
      case 'ArrowLeft':
        if (this.stage === 'day') nextIndex = currentIndex - 1;
        // Left from the month list steps back to the years, as in 0.x.
        else if (this.stage === 'month' && this.hasYearChoice) {
          event.preventDefault();
          this.goBack();
          return;
        }
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = cells.length - 1;
        break;
      case 'PageDown':
        nextIndex = currentIndex + (this.stage === 'year' ? 10 : cells.length - 1);
        break;
      case 'PageUp':
        nextIndex = currentIndex - (this.stage === 'year' ? 10 : cells.length - 1);
        break;
      default:
        return;
    }

    if (nextIndex === null) return;
    event.preventDefault();

    // ArrowUp from the first cell hands focus back to the input.
    if (nextIndex < 0 && (event.key === 'ArrowUp' || event.key === 'ArrowLeft')) {
      this.input.focus();
      this.input.select();
      return;
    }

    const bounded = Math.min(Math.max(nextIndex, 0), cells.length - 1);
    const target = cells[bounded];
    if (!target) return;
    for (const cell of cells) cell.setAttribute('tabindex', '-1');
    target.setAttribute('tabindex', '0');
    this.focusCell(target);
  }
}
