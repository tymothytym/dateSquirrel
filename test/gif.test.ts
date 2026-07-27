/**
 * Structural checks on the committed readme GIFs.
 *
 * These exist because an earlier encoder shipped visibly flickering files, from
 * two defects that are both detectable straight from the GIF blocks:
 *
 *  1. held frames were written as `new Uint8Array(w * h)` — every pixel palette
 *     index 0 rather than the transparent index — so each pause painted a solid
 *     block of whatever colour occupied slot 0;
 *  2. frames were tagged disposal method 2 ("restore to background"), which
 *     clears the canvas between frames and flashes blank.
 *
 * Every frame must therefore be opaque and tagged disposal 1 ("do not dispose").
 * Regenerate with `npm run gif`.
 */

import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface GifFrame {
  disposal: number | null;
  transparent: boolean | null;
  delay: number;
}

/** Walk a GIF's blocks and report each frame's graphic control settings. */
function readFrames(path: string): GifFrame[] {
  const bytes = readFileSync(path);
  let at = 13; // 6-byte header + 7-byte logical screen descriptor

  const screenPacked = bytes[10]!;
  if (screenPacked & 0x80) at += 3 * (1 << ((screenPacked & 0x07) + 1)); // global table

  const skipSubBlocks = () => {
    while (bytes[at] !== 0) at += bytes[at]! + 1;
    at += 1;
  };

  const frames: GifFrame[] = [];
  let pending: GifFrame | null = null;

  while (at < bytes.length) {
    const marker = bytes[at];
    if (marker === 0x3b) break; // trailer

    if (marker === 0x21) {
      // Extension. Fields are read relative to `at`, but skipping has to restart
      // at the block-size byte (at + 2), not at the payload.
      if (bytes[at + 1] === 0xf9) {
        const flags = bytes[at + 3]!;
        pending = {
          disposal: (flags >> 2) & 0x07,
          transparent: (flags & 0x01) === 1,
          delay: bytes.readUInt16LE(at + 4) * 10,
        };
      }
      at += 2;
      skipSubBlocks();
      continue;
    }

    if (marker === 0x2c) {
      // Image descriptor: marker + 8 bytes of geometry + 1 packed byte.
      const localPacked = bytes[at + 9]!;
      at += 10;
      if (localPacked & 0x80) at += 3 * (1 << ((localPacked & 0x07) + 1));
      at += 1; // LZW minimum code size
      skipSubBlocks();
      frames.push(pending ?? { disposal: null, transparent: null, delay: 0 });
      pending = null;
      continue;
    }

    at += 1;
  }

  return frames;
}

const GIFS = ['demo-ymd', 'demo-ymd-dark', 'demo-ym', 'demo-ym-dark'];
const present = GIFS.filter((name) => existsSync(`static/${name}.gif`));

describe.runIf(present.length > 0).each(present)('static/%s.gif', (name) => {
  const frames = readFrames(`static/${name}.gif`);

  it('parses as a multi-frame animation', () => {
    /*
     * Guards against the parser desyncing, which reports one or two frames.
     * The encoded count is well below the captured count on purpose: runs of
     * identical frames are coalesced into a single frame with a longer delay,
     * so a ~70-frame capture becomes ~20 encoded frames.
     */
    expect(frames.length).toBeGreaterThan(10);
  });

  it('tags every frame "do not dispose"', () => {
    const disposals = [...new Set(frames.map((frame) => frame.disposal))];
    expect(disposals, 'disposal 2 clears the canvas and flashes blank').toEqual([1]);
  });

  it('has no transparent frames', () => {
    // 1-bit GIF alpha plus disposal is what caused the original flicker; every
    // frame is opaque and full-canvas instead.
    expect(frames.filter((frame) => frame.transparent)).toHaveLength(0);
  });

  it('gives every frame a visible, non-zero delay', () => {
    // A zero delay makes viewers race or clamp unpredictably.
    const delays = frames.map((frame) => frame.delay);
    expect(Math.min(...delays)).toBeGreaterThanOrEqual(20);
  });

  it('runs for a sensible length of time', () => {
    const total = frames.reduce((sum, frame) => sum + frame.delay, 0);
    expect(total).toBeGreaterThan(3000);
    expect(total).toBeLessThan(20000);
  });
});

it('has all four readme GIFs committed', () => {
  expect(present).toEqual(GIFS);
});
