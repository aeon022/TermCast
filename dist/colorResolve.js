"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveColor = resolveColor;
// Standard xterm 256-color palette: indices 16-231 are a 6x6x6 RGB cube,
// 232-255 are a 24-step grayscale ramp. This fixed mapping is the same
// one every terminal emulator uses for palette colors beyond the 16 basic
// ANSI ones (0-15).
const CUBE_STEPS = [0, 95, 135, 175, 215, 255];
function cube256ToHex(index) {
    if (index >= 232) {
        const gray = 8 + (index - 232) * 10;
        const hex = gray.toString(16).padStart(2, '0');
        return `#${hex}${hex}${hex}`;
    }
    const i = index - 16;
    const r = CUBE_STEPS[Math.floor(i / 36) % 6];
    const g = CUBE_STEPS[Math.floor(i / 6) % 6];
    const b = CUBE_STEPS[i % 6];
    return `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`;
}
const PALETTE_KEYS = [
    'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'
];
// Resolves one xterm cell's foreground/background color to a hex string.
// xterm reports color mode via isRGB/isPalette booleans rather than a
// single mode number (see @xterm/headless's IBufferCell docs) — neither
// true means "default", i.e. the theme's own foreground/background.
function resolveColor(isRGB, isPalette, value, theme, isForeground) {
    if (isRGB) {
        return `#${value.toString(16).padStart(6, '0')}`;
    }
    if (isPalette) {
        if (value < 8) {
            return theme.colors[PALETTE_KEYS[value]];
        }
        if (value < 16) {
            // ponytail: no distinct bright-color variants defined per theme;
            // reusing the base 8 is visually close enough for a banner tool.
            // Add a `brightColors` set per theme if a real recording needs to
            // tell bold-bright apart from normal-intensity colors.
            return theme.colors[PALETTE_KEYS[value - 8]];
        }
        return cube256ToHex(value);
    }
    return isForeground ? theme.foreground : theme.background;
}
