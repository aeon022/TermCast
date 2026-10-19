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

import { recordSession, promptString } from './recorder';

const screen = (f: { grid: { char: string }[][] }) => f.grid.map((r) => r.map((c) => c.char).join('').trimEnd()).join('\n');

test('recordSession types the command after a prompt and then shows its output', async () => {
  const { frames, rawText } = await recordSession([{ cmd: 'echo typed-output' }], { cols: 50, rows: 6, fps: 40, typing: true, typeSpeedMs: 5, prompt: '$ ', maxDurationMs: 8000 });
  const all = frames.map(screen);
  const typedFirst = all.findIndex((s) => s.includes('$ echo typed-output'));
  const outputAt = all.findIndex((s) => /\n?typed-output$/m.test(s) && s.split('\n').filter((l) => l.trim() === 'typed-output').length > 0);
  assert.ok(typedFirst >= 0, 'the typed command line appears');
  assert.ok(outputAt > typedFirst, 'the output comes after the typed line');
  assert.ok(all.some((s) => s.startsWith('$ ec') && !s.includes('echo typed')), 'the command is typed character by character');
  assert.match(rawText, /\$ echo typed-output/);
});

test('recordSession runs several steps in one screen, honouring per-step typing', async () => {
  const { frames } = await recordSession(
    [{ cmd: 'echo first', type: true }, { cmd: 'echo second', type: false, pause: 20 }],
    { cols: 40, rows: 8, fps: 40, typeSpeedMs: 1, prompt: '> ', maxDurationMs: 8000 }
  );
  const last = screen(frames[frames.length - 1]);
  assert.match(last, /> echo first\nfirst\nsecond/);
  assert.ok(!last.includes('> echo second'), 'a step with type:false shows no prompt');
});

test('recordSession stops at the time limit', async () => {
  const t0 = Date.now();
  const { frames } = await recordSession([{ cmd: 'sleep 5' }], { cols: 20, rows: 3, fps: 10, maxDurationMs: 300 });
  assert.ok(Date.now() - t0 < 3000);
  assert.ok(frames.length >= 2);
});

test('prompt styles: known names, none, or a literal string', () => {
  assert.match(promptString('starship'), /❯/);
  assert.equal(promptString('none'), '');
  assert.equal(promptString('>>> '), '>>> ');
  assert.match(promptString(undefined), /➜/);
});
