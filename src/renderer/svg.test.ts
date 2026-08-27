import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderGridFrame, renderAnimatedGridFrames } from './svg';
import { Frame } from '../types';

function makeFrame(text: string, timestampMs = 0): Frame {
  const grid = [
    text.split('').map(ch => ({ char: ch, fg: '#f8f8f2', bg: '#282a36' }))
  ];
  return { grid, cursorX: text.length, cursorY: 0, cursorVisible: true, timestampMs };
}

test('renderGridFrame includes the frame\'s text and resolved color', () => {
  const svg = renderGridFrame(makeFrame('hi'), { watermark: false });
  assert.match(svg, /hi/);
  assert.match(svg, /#f8f8f2/);
  assert.match(svg, /<svg/);
});

test('renderGridFrame escapes XML-unsafe characters', () => {
  const svg = renderGridFrame(makeFrame('<>&'), { watermark: false });
  assert.doesNotMatch(svg, /<>&/);
  assert.match(svg, /&lt;/);
});

test('renderAnimatedGridFrames with one frame falls back to a static render', () => {
  const svg = renderAnimatedGridFrames([makeFrame('only', 0)], { watermark: false });
  assert.match(svg, /only/);
});

test('renderAnimatedGridFrames with multiple frames includes a keyframe per frame', () => {
  const svg = renderAnimatedGridFrames([makeFrame('a', 0), makeFrame('b', 100)], { watermark: false });
  assert.match(svg, /a/);
  assert.match(svg, /b/);
  assert.match(svg, /@keyframes frame-0/);
  assert.match(svg, /@keyframes frame-1/);
});

test('renderAnimatedGridFrames: last frame keyframe keeps opacity: 1 at 100%', () => {
  const svg = renderAnimatedGridFrames([makeFrame('a', 0), makeFrame('b', 100), makeFrame('c', 200)], { watermark: false });
  // Regression: the last frame (frame-2) must keep opacity: 1 all the way to 100%
  // so the final frame stays visible during the full animation duration
  assert.match(svg, /@keyframes frame-2/);
  // Extract the frame-2 keyframe rule and verify it ends with opacity: 1 at 100%
  const frame2Match = svg.match(/@keyframes frame-2[^<]*/);
  assert.ok(frame2Match && frame2Match[0].includes('100% { opacity: 1; }'), 'frame-2 keyframe should have 100% { opacity: 1; }');
});
