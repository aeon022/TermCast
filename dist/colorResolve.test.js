"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const colorResolve_1 = require("./colorResolve");
const themes_1 = require("./themes");
const theme = themes_1.THEMES.dracula;
(0, node_test_1.test)('resolveColor: RGB mode returns the exact hex color', () => {
    const hex = (0, colorResolve_1.resolveColor)(true, false, 0xff00aa, theme, true);
    strict_1.default.equal(hex, '#ff00aa');
});
(0, node_test_1.test)('resolveColor: default mode returns theme foreground/background', () => {
    strict_1.default.equal((0, colorResolve_1.resolveColor)(false, false, 0, theme, true), theme.foreground);
    strict_1.default.equal((0, colorResolve_1.resolveColor)(false, false, 0, theme, false), theme.background);
});
(0, node_test_1.test)('resolveColor: palette 0-7 maps to the theme\'s 8 base colors', () => {
    strict_1.default.equal((0, colorResolve_1.resolveColor)(false, true, 1, theme, true), theme.colors.red);
    strict_1.default.equal((0, colorResolve_1.resolveColor)(false, true, 2, theme, true), theme.colors.green);
});
(0, node_test_1.test)('resolveColor: palette 8-15 (bright) falls back to the same base 8', () => {
    strict_1.default.equal((0, colorResolve_1.resolveColor)(false, true, 9, theme, true), theme.colors.red);
});
(0, node_test_1.test)('resolveColor: palette 16-231 resolves the xterm 6x6x6 color cube', () => {
    // Index 16 is the cube's (0,0,0) corner -> pure black
    strict_1.default.equal((0, colorResolve_1.resolveColor)(false, true, 16, theme, true), '#000000');
    // Index 21 is (0,0,5) -> pure blue at the cube's max step (255)
    strict_1.default.equal((0, colorResolve_1.resolveColor)(false, true, 21, theme, true), '#0000ff');
});
(0, node_test_1.test)('resolveColor: palette 232-255 resolves the grayscale ramp', () => {
    // Index 232 is the ramp's first step: gray = 8
    strict_1.default.equal((0, colorResolve_1.resolveColor)(false, true, 232, theme, true), '#080808');
});
