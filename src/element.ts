/**
 * Side-effect entry point: importing this registers `<date-squirrel>`.
 *
 * ```ts
 * import 'date-squirrel/element';
 * import 'date-squirrel/styles.css';
 * ```
 *
 * Safe to import from a module that also runs on the server — registration
 * no-ops when there is no `customElements` registry.
 *
 * Import from `date-squirrel` instead if you want the registration function
 * without calling it (e.g. to register the element under a different tag name).
 */

import './styles/date-squirrel.css';
import { defineDateSquirrel } from './custom-element.js';

export {
  defineDateSquirrel,
  getDateSquirrelElementClass,
  DATE_SQUIRREL_TAG,
} from './custom-element.js';
export type {
  DateSquirrelElement,
  DateSquirrelElementConstructor,
} from './custom-element.js';

defineDateSquirrel();
