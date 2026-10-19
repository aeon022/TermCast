import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCast, castToFrames } from './cast';

const v2 = [
  '{"version": 2, "width": 30, "height": 5}',
  '[0.1, "o", "hello "]',
  '[0.5, "i", "ignored input"]',
  '[0.6, "o", "world\\r\\n"]',
  '[30.0, "o", "later"]'
].join('\n');

test('asciinema v2: size, output events, and long idle gaps are shortened', () => {
  const cast = parseCast(v2, 2);
  assert.equal(cast.cols, 30);
  assert.equal(cast.rows, 5);
  assert.deepEqual(cast.events.map((e) => e.data), ['hello ', 'world\r\n', 'later']);
  const times = cast.events.map((e) => Math.round(e.time * 10) / 10);
  assert.deepEqual(times, [0.1, 0.6, 2.6], 'the 29.4 s pause became the 2 s idle limit');
  assert.equal(parseCast(v2, 0).events[2].time, 30, 'idleLimit 0 keeps real timing');
});

test('asciinema v3: relative timestamps and the term size', () => {
  const cast = parseCast(['{"version": 3, "term": {"cols": 40, "rows": 8}}', '[0.2, "o", "a"]', '[0.3, "o", "b"]'].join('\n'));
  assert.equal(cast.cols, 40);
  assert.deepEqual(cast.events.map((e) => Math.round(e.time * 10) / 10), [0.2, 0.5]);
});

test('bad files are explained', () => {
  assert.throws(() => parseCast(''), /Empty cast/);
  assert.throws(() => parseCast('not json'), /Not an asciinema cast/);
  assert.throws(() => parseCast('{"version": 1}'), /Unsupported asciinema cast version 1/);
});

test('playing a cast produces frames that show the text appearing over time', async () => {
  const frames = await castToFrames(parseCast(v2, 1), { fps: 20 });
  const screen = (i: number) => frames[i].grid.map((r) => r.map((c) => c.char).join('').trimEnd()).join('\n');
  assert.equal(screen(0).trim(), '');
  assert.ok(frames.some((_, i) => screen(i).startsWith('hello') && !screen(i).includes('world')));
  assert.match(screen(frames.length - 1), /hello world\nlater/);
  assert.ok(frames[frames.length - 1].timestampMs >= 1500, 'the timeline reaches the last event');
});
