import { test } from 'node:test';
import * as assert from 'node:assert';
import { GRADIENTS, gradientStops } from './themes';

test('every preset gradient yields its own colours (hex colours contain digits)', () => {
  const cyber = gradientStops(GRADIENTS.cyberpunk, '#111', '#222');
  assert.match(cyber, /offset="0%" stop-color="#ff007f"/);
  assert.match(cyber, /offset="100%" stop-color="#00f0ff"/);
  assert.ok(!cyber.includes('#111'), 'the fallback colours must not be used for a valid gradient');
});

test('three-stop gradients keep all their stops', () => {
  const matrix = gradientStops(GRADIENTS.matrix, '#111', '#222');
  assert.strictEqual((matrix.match(/<stop /g) || []).length, 3);
  assert.match(matrix, /offset="50%"/);
});

test('stops without percentages are spread evenly; rgb() colours work; junk falls back', () => {
  const even = gradientStops('linear-gradient(90deg, #aaa, rgb(1, 2, 3), #ccc)', '#111', '#222');
  assert.match(even, /offset="0%"[\s\S]*offset="50%"[\s\S]*offset="100%"/);
  assert.match(even, /rgb\(1, 2, 3\)/);
  const fb = gradientStops('not a gradient', '#111', '#222');
  assert.match(fb, /#111/);
  assert.match(fb, /#222/);
});

test('every gradient preset differs from the others', () => {
  const seen = new Set(Object.values(GRADIENTS).map((g) => gradientStops(g, '#111', '#222')));
  assert.strictEqual(seen.size, Object.keys(GRADIENTS).length);
});
