import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import { encodeGif, resolveMonospaceFontOptions } from './gif';
import { Frame } from './types';

function makeFrame(text: string, timestampMs: number): Frame {
  const grid = [
    text.split('').map(ch => ({ char: ch, fg: '#f8f8f2', bg: '#282a36' }))
  ];
  return { grid, cursorX: text.length, cursorY: 0, cursorVisible: true, timestampMs };
}

// Minimal GIF89a block walker: returns each frame's delay in centiseconds.
// Only exists so tests can assert on encoded frame count / delays.
function gifFrameDelaysCs(buf: Buffer): number[] {
  let p = 6 + 7; // signature + logical screen descriptor
  if (buf[10] & 0x80) p += 3 * (1 << ((buf[10] & 0x07) + 1)); // global color table
  const skipSubBlocks = () => {
    while (buf[p] !== 0) p += 1 + buf[p];
    p++;
  };
  const delays: number[] = [];
  let pendingDelay = 0;
  while (p < buf.length) {
    const marker = buf[p++];
    if (marker === 0x3b) break; // trailer
    if (marker === 0x21) {
      const label = buf[p++];
      if (label === 0xf9) pendingDelay = buf.readUInt16LE(p + 2);
      skipSubBlocks();
    } else if (marker === 0x2c) {
      const packed = buf[p + 8];
      p += 9;
      if (packed & 0x80) p += 3 * (1 << ((packed & 0x07) + 1)); // local color table
      p++; // LZW min code size
      skipSubBlocks();
      delays.push(pendingDelay);
    } else {
      throw new Error(`unexpected GIF block marker 0x${marker.toString(16)} at ${p - 1}`);
    }
  }
  return delays;
}

test('encodeGif produces a non-empty buffer with a valid GIF header', async () => {
  const frames = [makeFrame('a', 0), makeFrame('b', 100)];
  const buffer = await encodeGif(frames, { watermark: false }, 10);
  assert.ok(buffer.length > 0);
  assert.equal(buffer.subarray(0, 6).toString('ascii'), 'GIF89a');
});

test('encodeGif rejects an empty frame list', async () => {
  await assert.rejects(() => encodeGif([], { watermark: false }, 10));
});

test('encodeGif merges consecutive identical frames into one GIF frame', async () => {
  const frames = [
    makeFrame('a', 0),
    makeFrame('a', 100),
    makeFrame('a', 200),
    makeFrame('b', 300)
  ];
  const delays = gifFrameDelaysCs(await encodeGif(frames, { watermark: false }, 10));
  assert.equal(delays.length, 2, 'four input frames should collapse to two encoded frames');
  // The three identical 'a' frames merge: 100 + 100 + 100 = 300ms = 30cs.
  assert.equal(delays[0], 30);
});

test('encodeGif holds the last frame for FINAL_FRAME_HOLD_MS', async () => {
  const frames = [makeFrame('a', 0), makeFrame('b', 100)];
  const delays = gifFrameDelaysCs(await encodeGif(frames, { watermark: false }, 10));
  assert.deepEqual(delays, [10, 80]); // 100ms real gap, then the 800ms hold
});

test('resolveMonospaceFontOptions points at a real font file when one exists', () => {
  const opts = resolveMonospaceFontOptions();
  if (os.platform() === 'darwin' && fs.existsSync('/System/Library/Fonts/Menlo.ttc')) {
    assert.equal(opts.loadSystemFonts, false);
    assert.ok(opts.fontFiles && opts.fontFiles.length > 0);
    assert.ok(opts.fontFiles!.every(p => fs.existsSync(p)));
  } else {
    // No known candidate on this machine — must degrade to the slow-but-correct path.
    assert.equal(opts.loadSystemFonts, opts.fontFiles ? false : true);
  }
});
