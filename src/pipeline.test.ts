import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parseFormats, parseLineRange, applySpeed, selectLines, writeOutputs } from './pipeline';
import { Frame } from './types';

const mk = (rows: string[], t = 0): Frame => ({
  grid: rows.map((r) => Array.from(r.padEnd(60)).map((c) => ({ char: c, fg: '#f8f8f2', bg: '#282a36' }))),
  cursorX: 0, cursorY: rows.length - 1, cursorVisible: false, timestampMs: t
});

test('formats: single, list, aliases, errors', () => {
  assert.deepEqual(parseFormats('svg'), ['svg']);
  assert.deepEqual(parseFormats('both'), ['svg', 'html']);
  assert.deepEqual(parseFormats('svg, gif,svg'), ['svg', 'gif']);
  assert.deepEqual(parseFormats('all'), ['svg', 'html', 'gif', 'png']);
  assert.throws(() => parseFormats('mp4'), /Unknown format "mp4"/);
  assert.throws(() => parseFormats(''), /No output format/);
});

test('line ranges', () => {
  assert.deepEqual(parseLineRange('3-8'), [3, 8]);
  assert.deepEqual(parseLineRange('5'), [5, 5]);
  assert.throws(() => parseLineRange('0-3'), /at least 1/);
  assert.throws(() => parseLineRange('8-3'), /not after TO/);
  assert.throws(() => parseLineRange('a-b'), /Invalid --lines/);
});

test('speed rescales timestamps; lines keeps a window of rows', () => {
  const sped = applySpeed([mk(['a'], 0), mk(['a'], 1000)], 2);
  assert.deepEqual(sped.map((f) => f.timestampMs), [0, 500]);
  assert.throws(() => applySpeed([mk(['a'])], 0), /--speed must be/);
  const sel = selectLines([mk(['one', 'two', 'three', 'four'])], [2, 3]);
  assert.equal(sel[0].grid.length, 2);
  assert.equal(sel[0].grid[0].map((c) => c.char).join('').trim(), 'two');
  assert.throws(() => selectLines([mk(['one'])], [5, 6]), /outside the recording/);
});

test('writeOutputs writes every requested file, masks secrets and reports how many', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ttyreel-out-'));
  const secret = 'ghp_' + 'd'.repeat(36);
  const frames = [mk(['$ deploy', `token=${secret}`, '', '', ''], 0), mk(['$ deploy', `token=${secret}`, 'done', '', ''], 400)];
  const res = await writeOutputs(frames, `$ deploy\r\ntoken=${secret}\r\ndone\r\n`, {
    output: path.join(dir, 'nested', 'demo.svg'),
    formats: ['svg', 'html', 'gif', 'png'],
    animated: true, scale: 1, loop: true, speed: 1, fps: 10,
    redact: {}, render: { watermark: false }
  });
  assert.equal(res.redacted, 1);
  assert.deepEqual(res.files.map((f) => path.basename(f)), ['demo.svg', 'demo.html', 'demo.gif', 'demo.png']);
  for (const f of res.files) assert.ok(fs.statSync(f).size > 200, f);
  for (const f of res.files.filter((f) => /\.(svg|html)$/.test(f))) {
    const text = fs.readFileSync(f, 'utf8');
    assert.ok(!text.includes(secret), `${path.basename(f)} must not contain the secret`);
  }
  assert.ok(fs.readFileSync(res.files[0], 'utf8').includes('•'), 'the mask is visible');
  assert.ok(fs.readFileSync(res.files[0], 'utf8').includes('done'));
});

test('--no-redact (auto:false) keeps the text, extra patterns still apply', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ttyreel-out-'));
  const secret = 'ghp_' + 'e'.repeat(36);
  const base = { formats: ['svg' as const], animated: false, scale: 1, loop: true, speed: 1, fps: 10, render: { watermark: false } };
  await writeOutputs([mk([`x ${secret} y`, 'host-a'])], undefined, { ...base, output: path.join(dir, 'a'), redact: { auto: false, extra: [/host-a/] } });
  const svg = fs.readFileSync(path.join(dir, 'a.svg'), 'utf8');
  assert.ok(svg.includes(secret));
  assert.ok(!svg.includes('host-a'));
});

test('nothing recorded is an error', async () => {
  await assert.rejects(writeOutputs([], '', { output: 'x', formats: ['svg'], animated: false, scale: 1, loop: true, speed: 1, fps: 10, redact: {}, render: {} }), /Nothing was recorded/);
});
