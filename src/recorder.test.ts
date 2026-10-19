import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordCommand } from './recorder';

test('recordCommand captures real output from a spawned command', async () => {
  const result = await recordCommand('echo hello-ttyreel', {
    cols: 40,
    rows: 5,
    fps: 20,
    maxDurationMs: 5000
  });

  assert.ok(result.frames.length >= 1, 'expected at least one frame');
  const lastFrame = result.frames[result.frames.length - 1];
  const lineText = lastFrame.grid.map(row => row.map(c => c.char).join('')).join('\n');
  assert.match(lineText, /hello-ttyreel/, 'expected the echoed text to appear in the captured grid');
  assert.match(result.rawText, /hello-ttyreel/, 'expected the raw text accumulator to contain the echoed text');
});

test('recordCommand always captures a t=0 frame even for a fast command', async () => {
  const result = await recordCommand('true', { cols: 20, rows: 3, fps: 10, maxDurationMs: 2000 });
  assert.ok(result.frames.length >= 1);
  assert.equal(result.frames[0].timestampMs, 0);
});
