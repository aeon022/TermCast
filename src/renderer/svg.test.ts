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

// Simulates CSS `animation-timing-function: steps(1, end)` for one loop of
// durationMs, sampled at atMs (wrapped modulo durationMs) — lets tests
// verify actual rendered-opacity-over-time from parsed keyframe stops,
// without needing a real browser.
function sampledOpacity(stops: { pct: number; opacity: number }[], durationMs: number, atMs: number): number {
  const t = ((atMs % durationMs) + durationMs) % durationMs;
  const pct = (t / durationMs) * 100;
  let current = stops[0].opacity;
  for (const stop of stops) {
    if (pct >= stop.pct) {
      current = stop.opacity;
    }
  }
  return current;
}

function parseKeyframeStops(svg: string, frameIndex: number): { pct: number; opacity: number }[] {
  // Extract the entire keyframe declaration by finding it between @keyframes frame-N and the next </style>
  const re = new RegExp(`@keyframes frame-${frameIndex}[^<]*`);
  const match = svg.match(re);
  assert.ok(match, `expected to find @keyframes frame-${frameIndex} in the SVG`);
  const fullRule = match[0]; // the entire '@keyframes frame-N { ... }'
  // Extract all percentage/opacity pairs: "20.000% { opacity: 1; }" -> (20.000, 1)
  const stopRe = /([\d.]+)%\s*\{\s*opacity:\s*([\d.]+)\s*;/g;
  const stops: { pct: number; opacity: number }[] = [];
  let m;
  while ((m = stopRe.exec(fullRule)) !== null) {
    stops.push({ pct: parseFloat(m[1]), opacity: parseFloat(m[2]) });
  }
  return stops;
}

test('renderAnimatedGridFrames: the last frame is actually visible before the loop wraps, not just present in the CSS text', () => {
  const frames = [makeFrame('a', 0), makeFrame('b', 100), makeFrame('c', 200)];
  const svg = renderAnimatedGridFrames(frames, { watermark: false });

  // Extract animation-duration from the shared .rec-frame rule.
  const durationMatch = svg.match(/animation-duration:\s*([\d.]+)ms/);
  assert.ok(durationMatch, 'expected to find animation-duration in the generated CSS');
  const durationMs = parseFloat(durationMatch![1]);

  const lastFrameStops = parseKeyframeStops(svg, frames.length - 1);

  // Sample well inside the last frame's window (its own timestamp + a bit,
  // and again just before the loop wraps) — both must show opacity 1.
  assert.equal(sampledOpacity(lastFrameStops, durationMs, 200 + 50), 1, 'last frame should be visible shortly after its own timestamp');
  assert.equal(sampledOpacity(lastFrameStops, durationMs, durationMs - 1), 1, 'last frame should still be visible just before the loop wraps');

  // Sample right at the wrap point (t=0 of the next iteration) — must be
  // back to invisible so frame-0 can take over cleanly.
  assert.equal(sampledOpacity(lastFrameStops, durationMs, 0), 0, 'last frame must reset to invisible at the start of the next loop');
});
