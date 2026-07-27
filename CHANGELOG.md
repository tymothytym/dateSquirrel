# Changelog

## Version 1.0.0-alpha.1 (Grey squirrel) ***July 27, 2026***

Full rebuild. The picker's interaction model is unchanged; everything under it is
new. See the [migration notes](readme.md#migrating-from-0x) — most 0.x option
names still work.

### Toolchain

* Replace Gulp 4 / Webpack 4 / Babel 6 / node-sass / Panini / UnCSS with Vite.
  The 0.x build could no longer install at all: `node-sass@4.9.2` needs
  `node-gyp@3.7.0`, which needs Python 2.7 and a 2018-era Node ABI.
  `npm install` went from 897 packages (failing) to ~165 (28 seconds, no native
  compilation), and a build from 0.x's never to ~60 ms.
* Port the source to TypeScript with `strict` and `noUncheckedIndexedAccess`;
  ship generated `.d.ts`.
* Add a Vitest suite — 196 tests where 0.x had none.
* Replace `.eslintrc.json` with flat-config ESLint 10 + typescript-eslint.
* Drop Bower, `.babelrc`, `config.yml`, `gulpfile.babel.js` and a stray
  Chromium crash log.

### Added

* `mode: 'y' | 'ym' | 'ymd'` as a first-class option. `ym` and `y` snap the value
  to the start of the period and default `patternSave` to `yyyy-mm` / `yyyy`.
* `<date-squirrel>` custom element, light DOM so `label[for]`, `name` and form
  serialisation keep working.
* ESM + CJS builds with a proper `exports` map, `types` and `sideEffects`.
* SSR safety: importing either entry point in Node no longer throws, and the
  date logic can validate submissions server-side.
* Native bubbling `input`/`change` events written through the prototype value
  setter, so React's change tracker fires `onChange`.
* `dsq:change`, `dsq:open` and `dsq:close` DOM events.
* `locale`, `firstDayOfWeek`, `monthNames`, `monthNamesShort` and `closeOnSelect`
  options; `min`/`max` as preferred names for `start`/`end`.
* Predicate functions, ISO recurring dates (`--12-25`), ISO strings and
  `{ from, to }` ranges as `disabledDates` entries. 0.x logged an error for
  functions.
* `refresh()`, `setOptions()`, `clear()`, `openPanel()`, `closePanel()`,
  `value`, `valueAsDate`, `valueAsString`.
* Immutable `PlainDate` value type, plus `format`, `parseDate`, `Selectability`
  and the date helpers as standalone exports.
* Runtime theming via CSS custom properties; all styles in a `@layer` so
  consumer CSS wins without specificity games.
* Dark mode via `prefers-color-scheme`, and `prefers-reduced-motion` support.
* A readable default palette: every text pair clears WCAG AA (4.5:1) against its
  own background in both schemes, and non-text indicators clear 3:1.
  `test/contrast.test.ts` parses the stylesheet and enforces it.

### Fixed

* `destroy()` removed nothing. Its cleanup was guarded by `if (!nodeList)`,
  which is never true for a NodeList, so every teardown leaked its listeners.
  Listeners now hang off one `AbortController`.
* Two pickers on a page shared `min`/`max`. The constructor wrote input
  attributes onto a module-level defaults object.
* `{ parse: { rule: 'mdy' } }` discarded the sibling `parse` defaults, because
  `extend` was called without its deep flag. The deep branch would also have
  thrown, calling `this.extend` from a plain function under `"use strict"`.
* `settings.js` declared `disableDates` while `core.js` read `disabledDates`, so
  the default was unreachable. Both spellings now work.
* Year-only mode set `selectedMonth = 1`, producing dates in February.
* Multi-year `disabledDates` ranges were wrong; the source carried a
  `// range is years && months [bug]` comment. The 140-line `tagDisabled`
  pre-expansion is replaced by lazily evaluated rules, and month/year
  availability is derived from day availability so the levels cannot disagree.
* Month names were matched on a 3-character prefix, so every French July parsed
  as June (`juin` / `juillet`).
* Free-text parsing required a delimiter, so a year-only picker could not accept
  `"2026"` and a month picker could not accept `"March"`.
* `element.role = 'listbox'` set a property no browser of that era reflected, so
  the lists shipped with `role="option"` children and no owning listbox.
* The back control was an `<a>` with no `href` — not focusable, not keyboard
  operable. It is a `<button>` now.
* `addMonths` used `Date.setMonth`, turning 31 Jan + 1 month into 3 March.
* Documented `primaryColour` / `primaryTextColour` / `textOnPrimaryColour`
  options did not exist anywhere in the source. Theming is now real.
* `main` pointed at `dist/dsq.js`, which was never built.
* Disabled dates were effectively invisible at 1.94:1. They are now 5.16:1
  (light) / 6.44:1 (dark) and marked with a strikethrough, so raising the
  contrast does not cost the distinction. Also lifted: the focus ring (1.89:1 →
  uses `currentColor`), the field border (1.61:1 → 3.13:1) and the selected
  month (3.71:1 → 7.89:1, now inverted rather than a lightened primary).

### Changed

* Keyboard handling uses `event.key`, not the deprecated `event.which`; adds
  `Home`, `End`, `PageUp`, `PageDown`.
* The day grid is a real ARIA grid of rows and gridcells with a roving tabindex;
  disabled days stay focusable and are marked `aria-disabled`.
* State moved from cumulative classes to `data-open` / `data-stage` /
  `data-mode` attributes.
* Panels are built with `createElement` instead of `insertAdjacentHTML` with the
  input's id interpolated into markup.
* `parse.etype` renamed to `parse.event`; `monthList` to `monthNamesShort`.
* Default locale is the browser's rather than a hardcoded `en-gb`.
* Formatting supports `\` escapes; 0.x had no way to express a literal.

### Removed

* All IE11 support: ~110 lines of constructor polyfills (`Element.closest`,
  `matches`, `ChildNode.remove`, `Array.from`), `attachEvent`/`detachEvent`
  branches, a BlackBerry OS 6 `handleEvent` workaround, and the IE11 flex hacks.
* UMD and AMD builds. Use `<script type="module">` for a tag drop-in.
* The Panini/Handlebars documentation site, replaced by `demo/`.

## Version 0.1.0 (Bangs's mountain - alpha) ***January 12, 2017***

Initial release.

## Version 0.1.1 ***January 26, 2017***

* Fix format so 'w' returns number of day of week rather than first letter

## Version 0.2.0 ***August 01, 2018***

* Make more accessible
* Embed lists rather than overlay
* Fix getValue for undefined
* Add setValue function
* Add string-date parse static function
* Remove formating from JS
* Add formatting to SCSS
* Create variable SCSS sheet for theming
* Remove colours
* Add indicator to active state
* Replace animations
* Update readme
* add parse date function

## Version 0.3.0 (Prevost's beta) ***August 03, 2018***

* Revert to Webpack & Gulp
* Add overlay option
* Add parse options
* Add additional SCSS styling options
* Add ES2015, AMD, CommonJS & script tag initialisation support
* Add basic scrollbar formatting

## Version 0.3.1 ***August 06, 2018***

* Remove all Label manipulation
* Change parse options structure to accommodate standard callback
* Make parsing default

## Version 0.3.2 ***August 07, 2018***

* Fix tab and return press actions

## Version 0.3.3 ***August 11, 2018***

* Link changelog to readme
* Fix that / this bug in keyboard tasks
* Extend keyboard integration

## Version 0.3.4 ***August 21, 2018***

* clearStored changed from dataset to attribute
* Fix callback firing unneccessarily when using mouse
* Add logo to test page
* Tidy up test page scss

## Version 0.4.0 ***August xx, 2018***

* IE11 "fixes"
* Change SCSS open, close & stack methods (for IE11)
* Change reminder to be narrower and make clickable
* Extend SCSS variables to cover backgrounds & hover / focus