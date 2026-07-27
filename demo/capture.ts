/**
 * Capture-stage wiring for `npm run gif`.
 *
 * Configured entirely by query string so the encoder script can drive variants
 * without editing anything:
 *
 *   /demo/capture.html?mode=ymd&min=2024-01-01&max=2028-12-31&theme=pink
 */

import { DateSquirrel } from '../src/index.js';
import type { PickerMode } from '../src/index.js';

const params = new URLSearchParams(location.search);
const mode = (params.get('mode') as PickerMode | null) ?? 'ymd';

const stage = document.getElementById('stage');
if (stage && params.get('theme')) stage.classList.add(`theme-${params.get('theme')}`);

const placeholder =
  params.get('placeholder') ??
  { ymd: 'Pick a date', ym: 'Pick a month', y: 'Pick a year' }[mode];

const field = document.getElementById('field') as HTMLInputElement;
field.placeholder = placeholder;

const picker = new DateSquirrel(field, {
  mode,
  min: params.get('min') ?? '2015-01-01',
  max: params.get('max') ?? '2030-12-31',
  locale: params.get('locale') ?? 'en-GB',
  // A fixed "today" would be nicer for reproducibility, but markToday reads the
  // real clock; turning it off keeps frames stable across days instead.
  markToday: params.get('today') === 'true',
  // The capture usually wants the panel to stay open after the final pick, so
  // the chosen cell is visible before the driver closes it deliberately.
  closeOnSelect: params.get('close') === 'true',
});

// Expose for the driver script, so it can assert state between frames.
Object.assign(window as unknown as Record<string, unknown>, { picker });
