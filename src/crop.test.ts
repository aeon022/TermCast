import { test } from 'node:test';
import * as assert from 'node:assert';
import { cropBlankRows } from './crop';
import { Frame, Cell } from './types';

const blank: Cell = { char: ' ', fg: '#fff', bg: '#000' };
const ch = (c: string): Cell => ({ char: c, fg: '#fff', bg: '#000' });

function frame(rows: string[], cursorY = 0, cursorVisible = false): Frame {
  return { grid: rows.map((r) => Array.from(r.padEnd(5)).map((c) => (c === ' ' ? blank : ch(c)))), cursorX: 0, cursorY, cursorVisible, timestampMs: 0 };
}

test('trailing empty rows are removed, the same count for every frame', () => {
  const frames = [frame(['a', '', '', '', '', '', '']), frame(['a', 'bc', 'd', '', '', '', ''])];
  const out = cropBlankRows(frames);
  assert.deepStrictEqual(out.map((f) => f.grid.length), [3, 3]);
});

test('at least minRows are kept, and the cursor row counts as content', () => {
  assert.strictEqual(cropBlankRows([frame(['x', '', '', '', ''])], 3)[0].grid.length, 3);
  assert.strictEqual(cropBlankRows([frame(['', '', '', '', '', ''], 4, true)], 1)[0].grid.length, 5);
  assert.strictEqual(cropBlankRows([frame(['', '', '', '', ''], 4, false)], 2)[0].grid.length, 2);
});

test('a screen that is fully used stays as it is', () => {
  const full = frame(['a', 'b', 'c', 'd']);
  assert.strictEqual(cropBlankRows([full])[0].grid.length, 4);
});
