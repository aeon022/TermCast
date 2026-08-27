import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveColor } from './colorResolve';
import { THEMES } from './themes';

const theme = THEMES.dracula;

test('resolveColor: RGB mode returns the exact hex color', () => {
  const hex = resolveColor(true, false, 0xff00aa, theme, true);
  assert.equal(hex, '#ff00aa');
});

test('resolveColor: default mode returns theme foreground/background', () => {
  assert.equal(resolveColor(false, false, 0, theme, true), theme.foreground);
  assert.equal(resolveColor(false, false, 0, theme, false), theme.background);
});

test('resolveColor: palette 0-7 maps to the theme\'s 8 base colors', () => {
  assert.equal(resolveColor(false, true, 1, theme, true), theme.colors.red);
  assert.equal(resolveColor(false, true, 2, theme, true), theme.colors.green);
});

test('resolveColor: palette 8-15 (bright) falls back to the same base 8', () => {
  assert.equal(resolveColor(false, true, 9, theme, true), theme.colors.red);
});

test('resolveColor: palette 16-231 resolves the xterm 6x6x6 color cube', () => {
  // Index 16 is the cube's (0,0,0) corner -> pure black
  assert.equal(resolveColor(false, true, 16, theme, true), '#000000');
  // Index 21 is (0,0,5) -> pure blue at the cube's max step (255)
  assert.equal(resolveColor(false, true, 21, theme, true), '#0000ff');
});

test('resolveColor: palette 232-255 resolves the grayscale ramp', () => {
  // Index 232 is the ramp's first step: gray = 8
  assert.equal(resolveColor(false, true, 232, theme, true), '#080808');
});
