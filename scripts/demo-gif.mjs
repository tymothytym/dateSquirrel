/**
 * Build the readme demo GIFs.
 *
 *   npm run gif
 *
 * No ffmpeg, no ImageMagick, no video editor: Playwright drives the picker,
 * screenshots are bursted through each transition, and gifenc encodes them.
 * Both encoder and PNG decoder are pure JS, so there is nothing to install
 * beyond npm packages.
 *
 * Output: static/demo-<name>.gif, transparent background so the same file sits
 * on a light or dark readme.
 */

import { createServer } from 'vite';
import { chromium } from 'playwright';
// gifenc ships CommonJS, so its exports come off the default binding.
import gifenc from 'gifenc';
import { PNG } from 'pngjs';

const { GIFEncoder, quantize, applyPalette } = gifenc;
import { mkdir, writeFile } from 'node:fs/promises';
import { statSync } from 'node:fs';
import { join } from 'node:path';

const PORT = 5233;
const OUT_DIR = 'static';
/** Playback delay per frame, ms. 70ms ≈ 14fps, which GIF quantises cleanly. */
const FRAME_DELAY = 70;
/** How long the final state is held, in frames. */
const HOLD = 10;
/**
 * Palette size. The UI is flat colour, so 64 entries covers it with no visible
 * banding and encodes far smaller than the 255 maximum.
 */
const PALETTE_SIZE = 64;
/** GitHub renders light and dark readmes, so ship one GIF for each. */
const SCHEMES = ['light', 'dark'];

/**
 * Each variant is a list of steps. `burst` frames are captured back to back to
 * sample a transition; `hold` frames repeat the current state to create a pause.
 */
/**
 * Years sit under the month panel, inset by --dsq-month-inset, so only that
 * left sliver of a row is visible. Click inside it, as a user would.
 */
const YEAR_HIT = { x: 30, y: 10 };

const VARIANTS = [
  {
    name: 'ymd',
    query: { mode: 'ymd', min: '2015-01-01', max: '2030-12-31' },
    steps: [
      { hold: 4 },
      { click: '#field', burst: 7 },
      { hold: 7 },
      { click: '.dsq-list-years li[data-year="2026"]', position: YEAR_HIT, burst: 7 },
      { hold: 7 },
      { click: '.dsq-list-months li[data-month="6"]', burst: 7 },
      { hold: 7 },
      { click: '.dsq-day[data-day="17"]', burst: 4 },
      // Linger on the highlighted day before closing, then show the value
      // landing in the field.
      { hold: 10 },
      { press: 'Escape', burst: 5 },
      { hold: HOLD },
    ],
  },
  {
    name: 'ym',
    query: { mode: 'ym', min: '2015-01', max: '2030-12' },
    steps: [
      { hold: 4 },
      { click: '#field', burst: 7 },
      { hold: 7 },
      { click: '.dsq-list-years li[data-year="2026"]', position: YEAR_HIT, burst: 7 },
      { hold: 7 },
      { click: '.dsq-list-months li[data-month="6"]', burst: 4 },
      { hold: 10 },
      { press: 'Escape', burst: 5 },
      { hold: HOLD },
    ],
  },
];

/** Decode a PNG buffer to the flat RGBA array gifenc wants. */
function toRgba(buffer) {
  const png = PNG.sync.read(buffer);
  return { data: new Uint8ClampedArray(png.data), width: png.width, height: png.height };
}

/** Re-encode a captured frame to PNG, for eyeballing the animation. */
function toPng(frame) {
  const png = new PNG({ width: frame.width, height: frame.height });
  png.data = Buffer.from(frame.data.buffer, frame.data.byteOffset, frame.data.length);
  return PNG.sync.write(png);
}

/**
 * With --frames, dump every captured frame as a PNG. A GIF cannot be inspected
 * frame by frame otherwise, and the burst timing is worth checking when tuning.
 */
async function dumpFrames(name, frames) {
  const dir = join('screenshots', 'gif-frames');
  await mkdir(dir, { recursive: true });
  let index = 0;
  for (const frame of frames) {
    const label = String(index).padStart(3, '0');
    await writeFile(join(dir, `${name}-${label}.png`), toPng(frame));
    index++;
  }
  process.stdout.write(`\n  dumped ${frames.length} frames to ${dir}/${name}-*.png`);
}

async function captureVariant(page, base, variant, scheme) {
  await page.emulateMedia({ colorScheme: scheme });
  const query = new URLSearchParams(variant.query).toString();
  await page.goto(`${base}/demo/capture.html?${query}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  /*
   * One fixed clip for every frame, measured with the panel OPEN. The stage
   * grows as the picker opens, so measuring it closed crops the panel away
   * entirely — and a clip that changes between frames cannot be encoded as a
   * single GIF anyway.
   */
  const stage = page.locator('#stage');
  await page.locator('#field').click();
  await page.waitForTimeout(600);
  const open = await stage.boundingBox();
  const clip = {
    x: Math.round(open.x),
    y: Math.round(open.y),
    width: Math.round(open.width),
    height: Math.round(open.height),
  };

  // Back to a closed picker so the animation starts from the beginning.
  await page.goto(`${base}/demo/capture.html?${query}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const frames = [];
  const shoot = async () => {
    frames.push(toRgba(await page.screenshot({ clip, omitBackground: true })));
  };

  for (const step of variant.steps) {
    if (step.click) {
      const target = page.locator(step.click);
      await target.click(step.position ? { position: step.position } : {});
    }
    if (step.press) {
      await page.keyboard.press(step.press);
    }
    if (step.burst) {
      // No waits: capture as fast as Playwright allows, which samples the
      // in-flight CSS transition. The stage slows --dsq-duration to suit.
      for (let i = 0; i < step.burst; i++) await shoot();
    }
    if (step.hold) {
      // Settle first, so the held frame is the transition's resting state.
      await page.waitForTimeout(120);
      await shoot();
      // Then repeat it rather than re-screenshotting: identical frames collapse
      // to a delay in the GIF stream and cost almost nothing.
      const frame = frames.at(-1);
      for (let i = 1; i < step.hold; i++) frames.push(frame);
    }
  }

  return frames;
}

function encodeGif(frames) {
  const encoder = GIFEncoder();
  const { width, height } = frames[0];

  // One palette for the whole animation, built from a mid-animation frame so it
  // covers every panel colour. A per-frame palette would flicker.
  const sample = frames[Math.floor(frames.length / 2)];
  const palette = quantize(sample.data, PALETTE_SIZE, { format: 'rgba4444' });
  // Reserve the last slot for full transparency.
  const transparentIndex = palette.length;
  palette.push([0, 0, 0, 0]);

  let previous = null;
  for (const frame of frames) {
    // Identical consecutive frames become a longer delay on the previous one.
    if (previous && Buffer.compare(Buffer.from(frame.data), Buffer.from(previous.data)) === 0) {
      encoder.writeFrame(new Uint8Array(width * height), width, height, {
        palette,
        delay: FRAME_DELAY,
        transparent: true,
        transparentIndex,
        dispose: 1,
      });
      continue;
    }
    const indexed = applyPalette(frame.data, palette, 'rgba4444');
    // Anything essentially transparent maps to the reserved index.
    for (let i = 0; i < indexed.length; i++) {
      if (frame.data[i * 4 + 3] < 128) indexed[i] = transparentIndex;
    }
    encoder.writeFrame(indexed, width, height, {
      palette,
      delay: FRAME_DELAY,
      transparent: true,
      transparentIndex,
      dispose: 2,
    });
    previous = frame;
  }

  encoder.finish();
  return Buffer.from(encoder.bytes());
}

const server = await createServer({ server: { port: PORT, open: false } });
await server.listen();
const base = `http://localhost:${PORT}`;

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 700, height: 700 },
  /*
   * 1.5x, not 2x. The readme displays these around 464px wide, so 1.5x still
   * looks sharp on a HiDPI screen while cutting the pixel count — and therefore
   * the file — by roughly half against 2x.
   */
  deviceScaleFactor: 1.5,
});

const problems = [];
page.on('pageerror', (error) => problems.push(error.message));

try {
  for (const variant of VARIANTS) {
    for (const scheme of SCHEMES) {
      const name = scheme === 'light' ? variant.name : `${variant.name}-dark`;
      process.stdout.write(`${name}: capturing…`);
      const frames = await captureVariant(page, base, variant, scheme);
      process.stdout.write(` ${frames.length} frames, encoding…`);
      if (process.argv.includes('--frames')) await dumpFrames(name, frames);
      const gif = encodeGif(frames);
      const path = join(OUT_DIR, `demo-${name}.gif`);
      await writeFile(path, gif);
      const kb = Math.round(statSync(path).size / 1024);
      process.stdout.write(` ${path} (${kb} kB, ${frames[0].width}×${frames[0].height})\n`);
    }
  }
} finally {
  await browser.close();
  await server.close();
}

if (problems.length) {
  process.stdout.write(`\npage errors: ${JSON.stringify(problems, null, 2)}\n`);
  process.exitCode = 1;
}
