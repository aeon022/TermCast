import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodePng } from './png';
import { encodeGif } from './gif';
import { Frame } from './types';

const frame = (text: string): Frame => ({
  grid: [Array.from(text).map((c) => ({ char: c, fg: '#f8f8f2', bg: '#282a36' }))],
  cursorX: 0, cursorY: 0, cursorVisible: false, timestampMs: 0
});

const size = (png: Buffer) => ({ w: png.readUInt32BE(16), h: png.readUInt32BE(20) });

test('PNG export: valid image, and scale 2 doubles both dimensions', () => {
  const one = encodePng(frame('hi'), { watermark: false }, 1);
  const two = encodePng(frame('hi'), { watermark: false }, 2);
  assert.equal(one.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(size(two).w, size(one).w * 2);
  assert.equal(size(two).h, size(one).h * 2);
  assert.throws(() => encodePng(frame('x'), {}, 0), /scale must be between/);
});

test('GIF export: loops by default, plays once with loop:false, scale applies', async () => {
  const frames = [frame('a'), { ...frame('b'), timestampMs: 100 }];
  const looping = await encodeGif(frames, { watermark: false }, 10);
  const once = await encodeGif(frames, { watermark: false }, 10, { loop: false });
  const big = await encodeGif(frames, { watermark: false }, 10, { scale: 2 });
  const hasLoopExtension = (b: Buffer) => b.includes(Buffer.from('NETSCAPE2.0'));
  assert.ok(hasLoopExtension(looping), 'a looping GIF carries the NETSCAPE loop extension');
  assert.ok(!hasLoopExtension(once), 'a play-once GIF does not');
  assert.equal(big.readUInt16LE(6), looping.readUInt16LE(6) * 2, 'logical screen width doubles');
});
