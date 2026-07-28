/**
 * Demo wiring — a port of the 0.x examples page (src/pages/index.html), which
 * covered 21 cases. Imports source directly, so `npm run dev` hot-reloads the
 * library itself.
 */

import { DateSquirrel, PlainDate } from '../src/index.js';
import type { DateSquirrelUserOptions } from '../src/index.js';

// Both of these are deliberately *used* rather than imported for side effects.
//
// package.json's `sideEffects` describes the published layout (./dist/*), so
// nothing under src/ matches it and src/*.ts counts as side-effect-free. That
// lets a production build discard a bare `import '../src/element.js'` whole —
// taking `defineDateSquirrel()` with it, so `<date-squirrel>` never upgrades —
// and likewise drop index.ts's bare CSS import, leaving the page unstyled.
// Calling the function and importing the stylesheet directly can't be shaken
// out. Neither trap fires in the lib build (entries are always kept) or in
// `npm run dev` (no tree-shaking) — only in a build from source, i.e.
// `npm run build:demo`.
//
// This is also exactly what the readme tells a consumer to write.
import { defineDateSquirrel } from '../src/element.js';
import '../src/styles/date-squirrel.css';

defineDateSquirrel();

const show = (id: string, human?: string, save?: string) => {
  const output = document.getElementById(id);
  if (output) output.textContent = save ? `${human}  →  stored "${save}"` : '—';
};

/** Create a picker that reports into `<output id="{inputId}-out">`. */
function demo(inputId: string, options: DateSquirrelUserOptions = {}): DateSquirrel {
  return new DateSquirrel(`#${inputId}`, {
    ...options,
    callback(context) {
      show(`${inputId}-out`, context.human, context.save);
    },
  });
}

/** Report for declarative `<date-squirrel>` instances, via the DOM event. */
function watch(inputId: string) {
  const input = document.getElementById(inputId);
  input?.closest('date-squirrel')?.addEventListener('dsq:change', (event) => {
    const { human, save } = (event as CustomEvent).detail;
    show(`${inputId}-out`, human, save);
  });
}

const today = PlainDate.today();

// ---------------------------------------------------------------- modes
demo('mode-ymd', { min: today, max: today.addYears(3) });
watch('mode-ym');
watch('mode-y');

// ---------------------------------------------------------------- formats
demo('fmt-1', { pattern: 'dx mmm yyyy', min: today, max: today.addYears(2) });
demo('fmt-2', { pattern: 'wwww, dx mmmm yyyy', min: today, max: today.addYears(2) });
demo('fmt-3', { mode: 'ym', pattern: "mmm 'yy", min: '2024-01', max: '2028-12' });
demo('fmt-initial', {
  // Set before any user input; deliberately fires no change event.
  initial: '2026-12-04',
  pattern: 'wwww, dx mmmm yyyy',
  min: '2020-01-01',
  max: '2030-12-31',
});
watch('fmt-locale');
watch('fmt-de');

// ---------------------------------------------------------------- ranges
demo('rng-obj', {
  // The 0.x short-key bound shape, including `d: 32` meaning end of month.
  start: { d: 1, m: 10, y: 2029 },
  end: { d: 32, m: 3, y: 2030 },
});

demo('rng-fn', {
  // Bounds may be functions, evaluated once per instance.
  min: () => {
    let date = today;
    let added = 0;
    while (added < 3) {
      date = date.addDays(1);
      if (date.weekday !== 0 && date.weekday !== 6) added++;
    }
    return date;
  },
  max: () => today.addMonths(2).endOfMonth(),
});

demo('rng-attr'); // min / max come from the HTML attributes
demo('rng-year'); // one year  -> opens on the month list
demo('rng-month', {
  min: today.startOfMonth(),
  max: today.endOfMonth(), // one month -> opens on the day grid
});
demo('rng-past', {
  min: today.addYears(-10),
  max: today.addYears(1),
});

// ---------------------------------------------------------------- disabled
demo('dis-all', {
  min: new Date(2000, 0, 1),
  max: new Date(2020, 6, 10),
  disabledDates: [
    'wed', // every Wednesday
    '11/25', // 25 December, every year (0.x form: 0-indexed month)
    new Date(2019, 0, 31), // one specific day
    [new Date(2008, 3, 15), new Date(2008, 4, 14)], // a part-month range
    [new Date(2000, 7, 2), new Date(2003, 9, 22)], // a multi-year range
    [new Date(2010, 0, 1), new Date(2013, 0, 14)], // another
    [new Date(2014, 6, 1), new Date(2016, 2, 14)], // and another
    2006, // a whole year
    5, // June, every year
  ],
});

demo('dis-week', {
  min: today,
  max: today.addYears(1),
  disabledDates: ['sat', 'sun', '--12-25', '--12-26'],
});

demo('dis-fn', {
  min: today,
  max: today.addYears(2),
  disabledDates: [(date) => date.day === 13 && date.weekday === 5],
});

// ---------------------------------------------------------------- behaviour
demo('beh-overlay', { overlay: true, min: today, max: today.addYears(2) });
demo('beh-scroll', { hideScrollbars: true, min: today.addYears(-20), max: today });

const wideOnly = demo('beh-activate', {
  activation: () => window.innerWidth > 1024,
  min: today,
  max: today.addYears(1),
});
if (!wideOnly.active) {
  show('beh-activate-out');
  const output = document.getElementById('beh-activate-out');
  if (output) output.textContent = 'Not activated — native date input in use.';
}

demo('beh-callback', {
  min: today,
  max: today.addYears(1),
  callback(context) {
    show('beh-callback-out', context.human, context.save);
    // eslint-disable-next-line no-console
    console.log('dateSquirrel callback:', {
      date: context.date,
      human: context.human,
      save: context.save,
      input: context.input,
    });
  },
});

demo('beh-parse', {
  min: '1990-01-01',
  max: '2040-12-31',
  pattern: 'wwww, dx mmmm yyyy',
  parse: { rule: 'dmy', delay: 250 },
});

demo('beh-open', { closeOnSelect: false, min: today, max: today.addYears(2) });

// ---------------------------------------------------------------- linked range
const from = new DateSquirrel('#link-from', {
  min: today,
  max: today.addYears(3),
});

const to = new DateSquirrel('#link-to', {
  min: today,
  max: today.addYears(5),
});

from.wrapper?.addEventListener('dsq:change', () => {
  const start = from.value;
  if (!start) return;

  // setOptions re-resolves the range and rebuilds in place. 0.x had to destroy
  // the second picker and construct a replacement to do this.
  const earliest = start.addDays(1);
  to.setOptions({ min: earliest, max: start.addYears(2) });
  if (to.value?.isBefore(earliest)) to.clear({ silent: true });

  to.input.disabled = false;
  report();
});

to.wrapper?.addEventListener('dsq:change', report);

function report() {
  const output = document.getElementById('link-out');
  if (!output) return;
  const start = from.value;
  const end = to.value;
  if (!start || !end) {
    output.textContent = start ? 'Now pick an end date.' : '—';
    return;
  }
  const days = Math.round(
    (Date.UTC(end.year, end.month, end.day) - Date.UTC(start.year, start.month, start.day)) / 86_400_000,
  );
  output.textContent = `${start} → ${end} · ${days} day${days === 1 ? '' : 's'}`;
}

// ---------------------------------------------------------------- theming
demo('thm-1', { mode: 'ym', min: '2024-01', max: '2028-12' });
demo('thm-2', { min: today, max: today.addYears(2) });
demo('thm-3', { min: today, max: today.addYears(2) });

// ---------------------------------------------------------------- lifecycle
let instance: DateSquirrel | null = demo('life', { min: today, max: today.addYears(2) });

const status = (text: string) => {
  const output = document.getElementById('life-out');
  if (output) output.textContent = text;
};

document.getElementById('life-destroy')?.addEventListener('click', () => {
  instance?.destroy();
  instance = null;
  status(`destroyed · .dsq wrappers on page: ${document.querySelectorAll('.dsq').length}`);
});

document.getElementById('life-create')?.addEventListener('click', () => {
  if (instance) return;
  instance = demo('life', { min: today, max: today.addYears(2) });
  status(`re-created · .dsq wrappers on page: ${document.querySelectorAll('.dsq').length}`);
});

document.getElementById('life-clear')?.addEventListener('click', () => {
  instance?.clear();
  status('cleared');
});
