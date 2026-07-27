/**
 * Visual check: drive the demo in a real browser and capture every mode, stage,
 * theme and locale.
 *
 * `npm run shots` — starts a Vite dev server, writes PNGs to screenshots/, stops.
 *
 * jsdom has no layout, so the unit tests cannot see the sliding panels, the
 * overlay positioning or the vertical back strip. This is how those get checked.
 * It caught a real bug: focusing a cell made the clipping panel scroll sideways.
 */

import { createServer } from 'vite';
import { chromium } from 'playwright';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const OUT = 'screenshots';
const PORT = 5199;
const YEAR = new Date().getFullYear();
const MONTH = new Date().getMonth();

let page;
const errors = [];

const write = async (target, name, clip) => {
  await target.screenshot({ path: join(OUT, `${name}.png`), ...(clip ? { clip } : {}) });
  process.stdout.write(`  · ${name}.png\n`);
};

/** The .dsq wrapper that owns a given input. */
const wrapperOf = (id) =>
  page.locator(`#${id}`).locator('xpath=ancestor::*[contains(concat(" ",@class," ")," dsq ")][1]');

/**
 * Years sit under the month panel, which is inset by --dsq-month-inset. Only that
 * left sliver of a year row is visible, so click inside it rather than at the
 * element's centre, which the month panel would intercept.
 */
const pickYear = (id, year) => () =>
  wrapperOf(id).locator(`.dsq-list-years li[data-year="${year}"]`).click({ position: { x: 30, y: 10 } });

const pickMonth = (id, month) => () =>
  wrapperOf(id).locator(`.dsq-list-months li[data-month="${month}"]`).click();

/**
 * Clip the union of the wrapper and its panel: with `overlay: true` the panel is
 * absolutely positioned at `top: 100%`, outside the wrapper's own box.
 */
async function capture(id, name) {
  const wrapper = wrapperOf(id);
  const box = await wrapper.boundingBox();
  if (!box) return process.stdout.write(`  !! no bounding box for #${id}\n`);
  const panel = await wrapper.locator('.dsq-lists').boundingBox();

  const top = panel ? Math.min(box.y, panel.y) : box.y;
  const bottom = panel ? Math.max(box.y + box.height, panel.y + panel.height) : box.y + box.height;
  const left = panel ? Math.min(box.x, panel.x) : box.x;
  const right = panel ? Math.max(box.x + box.width, panel.x + panel.width) : box.x + box.width;

  await write(page, name, {
    x: Math.max(0, left - 14),
    y: Math.max(0, top - 14),
    width: Math.min(right - left + 28, 1280),
    height: bottom - top + 28,
  });
}

/**
 * Reload, open one picker, run the steps, capture it.
 * `scheme` captures the same state under prefers-color-scheme: dark.
 */
async function stage(base, id, name, steps = [], scheme = 'light') {
  await page.emulateMedia({ colorScheme: scheme });
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);

  const input = page.locator(`#${id}`);
  await input.scrollIntoViewIfNeeded();
  await input.click();
  await page.waitForTimeout(320);

  for (const step of steps) {
    await step();
    await page.waitForTimeout(320);
  }
  await capture(id, name);
}

const server = await createServer({ server: { port: PORT, open: false } });
await server.listen();
const base = `http://localhost:${PORT}/demo/`;

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
page = await browser.newPage({
  viewport: { width: 1280, height: 1000 },
  deviceScaleFactor: 2,
  colorScheme: 'light',
});
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));

try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  process.stdout.write('full page:\n');
  await write(page, 'page-light', null);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForTimeout(250);
  await write(page, 'page-dark', null);
  await page.emulateMedia({ colorScheme: 'light' });

  process.stdout.write('drill-down, ymd:\n');
  await stage(base, 'mode-ymd', 'ymd-1-years');
  await stage(base, 'mode-ymd', 'ymd-2-months', [pickYear('mode-ymd', YEAR + 1)]);
  await stage(base, 'mode-ymd', 'ymd-3-days', [pickYear('mode-ymd', YEAR + 1), pickMonth('mode-ymd', 6)]);

  process.stdout.write('drill-down, ym:\n');
  await stage(base, 'mode-ym', 'ym-1-years');
  await stage(base, 'mode-ym', 'ym-2-months', [pickYear('mode-ym', 2026)]);

  process.stdout.write('year only:\n');
  await stage(base, 'mode-y', 'y-1-years');

  process.stdout.write('collapsed ranges:\n');
  await stage(base, 'rng-year', 'range-single-year-opens-on-months');
  await stage(base, 'rng-month', 'range-single-month-opens-on-days');

  process.stdout.write('disabled dates:\n');
  await stage(base, 'dis-all', 'disabled-years');
  await stage(base, 'dis-all', 'disabled-months', [pickYear('dis-all', 2005)]);
  await stage(base, 'dis-all', 'disabled-days', [pickYear('dis-all', 2005), pickMonth('dis-all', 0)]);
  await stage(base, 'dis-week', 'disabled-weekends', [pickYear('dis-week', YEAR), pickMonth('dis-week', MONTH)]);

  process.stdout.write('themes:\n');
  await stage(base, 'thm-1', 'theme-pink', [pickYear('thm-1', 2026)]);
  await stage(base, 'thm-2', 'theme-forest', [pickYear('thm-2', YEAR), pickMonth('thm-2', MONTH)]);
  await stage(base, 'thm-3', 'theme-mono', [pickYear('thm-3', YEAR), pickMonth('thm-3', MONTH)]);

  process.stdout.write('locales:\n');
  await stage(base, 'fmt-locale', 'locale-fr-days', [pickYear('fmt-locale', 2026), pickMonth('fmt-locale', 6)]);
  await stage(base, 'fmt-de', 'locale-de-days', [pickYear('fmt-de', 2026), pickMonth('fmt-de', 6)]);

  process.stdout.write('behaviour:\n');
  await stage(base, 'beh-overlay', 'overlay');
  await stage(base, 'beh-scroll', 'hidden-scrollbars');

  // Dark mode has its own token set, including a lighter primary and inverted
  // on-primary, so the same states are worth seeing under it.
  process.stdout.write('dark scheme:\n');
  await stage(base, 'mode-ymd', 'dark-ymd-months', [pickYear('mode-ymd', YEAR + 1)], 'dark');
  await stage(base, 'mode-ymd', 'dark-ymd-days',
    [pickYear('mode-ymd', YEAR + 1), pickMonth('mode-ymd', 6)], 'dark');
  await stage(base, 'dis-all', 'dark-disabled-months', [pickYear('dis-all', 2005)], 'dark');
  await stage(base, 'dis-all', 'dark-disabled-days',
    [pickYear('dis-all', 2005), pickMonth('dis-all', 0)], 'dark');
  await page.emulateMedia({ colorScheme: 'light' });

  process.stdout.write('keyboard:\n');
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);
  await page.locator('#mode-ymd').scrollIntoViewIfNeeded();
  await page.locator('#mode-ymd').focus();
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(350);
  await capture('mode-ymd', 'keyboard-focus-ring');

  await page.keyboard.press('Enter'); // year
  await page.waitForTimeout(350);
  await page.keyboard.press('Enter'); // month
  await page.waitForTimeout(350);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(350);
  await capture('mode-ymd', 'keyboard-day-grid');

  process.stdout.write('mobile:\n');
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    hasTouch: true,
    isMobile: true,
  });
  mobile.on('pageerror', (e) => errors.push(`MOBILE PAGEERROR: ${e.message}`));
  await mobile.goto(base, { waitUntil: 'networkidle' });
  await mobile.waitForTimeout(500);
  await mobile.locator('#mode-ym').click();
  await mobile.waitForTimeout(450);
  await write(mobile, 'mobile-ym', null);
} finally {
  await browser.close();
  await server.close();
}

process.stdout.write(`\nconsole errors: ${errors.length ? JSON.stringify(errors, null, 2) : 'none'}\n`);
if (errors.length) process.exitCode = 1;
