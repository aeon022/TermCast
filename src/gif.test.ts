import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeGif } from './gif';
import { Frame } from './types';

function makeFrame(text: string, timestampMs: number): Frame {
  const grid = [
    text.split('').map(ch => ({ char: ch, fg: '#f8f8f2', bg: '#282a36' }))
  ];
  return { grid, cursorX: text.length, cursorY: 0, cursorVisible: true, timestampMs };
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
