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
 * Output: static/demo-<name>.gif plus a -dark variant. Frames are fully opaque —
 * GIF alpha is 1-bit and its disposal rules make partially transparent
 * animations flicker, so each scheme gets its own opaque file and the readme
 * picks between them with <picture>.
 */

import { statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import gifenc from 'gifenc';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { createServer } from 'vite';

// gifenc ships CommonJS, so its exports come off the default binding.
const { GIFEncoder, quantize, applyPalette } = gifenc;

const PORT = 5233;
const OUT_DIR = 'static';
/** Playback delay per frame, ms. 60ms ≈ 17fps; GIF stores this in 10ms units. */
const FRAME_DELAY = 60;
/** How long the final state is held, in frames. */
const HOLD = 10;
/**
 * Palette size. The maximum GIF allows — antialiased text needs the greys, and
 * file size is not the binding constraint here.
 */
const PALETTE_SIZE = 256;
/** GitHub renders light and dark readmes, so ship one GIF for each. */
const SCHEMES = ['light', 'dark'];

/**
 * Years sit under the month panel, inset by --dsq-month-inset, so only that
 * left sliver of a row is visible. Click inside it, as a user would.
 */
const YEAR_HIT = { x: 30, y: 10 };

/**
 * Each variant is a list of steps. `burst` captures frames back to back to
 * sample a transition in flight; `hold` repeats the settled state as a pause.
 */

const VARIANTS = [
  {
    name: 'ymd',
    query: { mode: 'ymd', min: '2015-01-01', max: '2030-12-31' },
    steps: [
      { hold: 4 },
      { click: '#field', burst: 10 },
      { hold: 7 },
      { click: '.dsq-list-years li[data-year="2026"]', position: YEAR_HIT, burst: 10 },
      { hold: 7 },
      { click: '.dsq-list-months li[data-month="6"]', burst: 10 },
      { hold: 7 },
      { click: '.dsq-day[data-day="17"]', burst: 6 },
      // Linger on the highlighted day before closing, then show the value
      // landing in the field.
      { hold: 10 },
      { press: 'Escape', burst: 8 },
      { hold: HOLD },
    ],
  },
  {
    name: 'ym',
    query: { mode: 'ym', min: '2015-01', max: '2030-12' },
    steps: [
      { hold: 4 },
      { click: '#field', burst: 10 },
      { hold: 7 },
      { click: '.dsq-list-years li[data-year="2026"]', position: YEAR_HIT, burst: 10 },
      { hold: 7 },
      { click: '.dsq-list-months li[data-month="6"]', burst: 6 },
      { hold: 10 },
      { press: 'Escape', burst: 8 },
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
    frames.push(toRgba(await page.screenshot({ clip })));
  };

  for (const step of variant.steps) {
    if (step.click) {
      const target = page.locator(step.click);
      await target.click(step.position ? { position: step.position } : {});
      /*
       * Park the cursor off the picker. Selecting a year scrolls the list to
       * centre it, which slides a different row under the stationary cursor and
       * leaves a stray hover highlight next to the real selection.
       */
      await page.mouse.move(660, 660);
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

/**
 * Collapse runs of identical frames into one frame with a longer delay.
 *
 * This replaces an earlier attempt that wrote a synthetic "blank" frame per held
 * frame. That frame was `new Uint8Array(w * h)` — every pixel palette index 0,
 * not the transparent index — so every pause painted a solid block of whichever
 * colour landed in slot 0, which is what made the GIFs flicker.
 */
function coalesce(frames) {
  const runs = [];
  for (const frame of frames) {
    const last = runs.at(-1);
    if (last && Buffer.compare(Buffer.from(last.frame.data), Buffer.from(frame.data)) === 0) {
      last.delay += FRAME_DELAY;
    } else {
      runs.push({ frame, delay: FRAME_DELAY });
    }
  }
  return runs;
}

function encodeGif(frames) {
  const encoder = GIFEncoder();
  const { width, height } = frames[0];

  /*
   * One palette for the whole animation, quantised from frames sampled evenly
   * across it. A mid-animation frame alone misses colours that only appear in
   * another stage (the navy month panel, say), and a per-frame palette shifts
   * hues between frames.
   */
  const sampleCount = Math.min(10, frames.length);
  const stride = Math.max(1, Math.floor(frames.length / sampleCount));
  const samples = [];
  for (let i = 0; i < frames.length; i += stride) samples.push(frames[i].data);
  const histogram = new Uint8ClampedArray(samples.length * samples[0].length);
  samples.forEach((data, index) => {
    histogram.set(data, index * data.length);
  });

  const palette = quantize(histogram, PALETTE_SIZE, { format: 'rgb565' });

  for (const { frame, delay } of coalesce(frames)) {
    /*
     * Fully opaque, full-canvas frames with `dispose: 1` ("do not dispose").
     * Every frame overwrites the whole canvas, so there is no compositing to get
     * wrong — no transparency, and nothing cleared between frames.
     */
    const indexed = applyPalette(frame.data, palette, 'rgb565');
    encoder.writeFrame(indexed, width, height, { palette, delay, dispose: 1 });
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
  // 2x: the readme shows these at 464px, so this is pixel-perfect on HiDPI.
  deviceScaleFactor: 2,
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
