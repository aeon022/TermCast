"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const svg_1 = require("./svg");
function makeFrame(text, timestampMs = 0) {
    const grid = [
        text.split('').map(ch => ({ char: ch, fg: '#f8f8f2', bg: '#282a36' }))
    ];
    return { grid, cursorX: text.length, cursorY: 0, cursorVisible: true, timestampMs };
}
(0, node_test_1.test)('renderGridFrame includes the frame\'s text and resolved color', () => {
    const svg = (0, svg_1.renderGridFrame)(makeFrame('hi'), { watermark: false });
    strict_1.default.match(svg, /hi/);
    strict_1.default.match(svg, /#f8f8f2/);
    strict_1.default.match(svg, /<svg/);
});
(0, node_test_1.test)('renderGridFrame escapes XML-unsafe characters', () => {
    const svg = (0, svg_1.renderGridFrame)(makeFrame('<>&'), { watermark: false });
    strict_1.default.doesNotMatch(svg, /<>&/);
    strict_1.default.match(svg, /&lt;/);
});
(0, node_test_1.test)('renderAnimatedGridFrames with one frame falls back to a static render', () => {
    const svg = (0, svg_1.renderAnimatedGridFrames)([makeFrame('only', 0)], { watermark: false });
    strict_1.default.match(svg, /only/);
});
(0, node_test_1.test)('renderAnimatedGridFrames with multiple frames includes a keyframe per frame', () => {
    const svg = (0, svg_1.renderAnimatedGridFrames)([makeFrame('a', 0), makeFrame('b', 100)], { watermark: false });
    strict_1.default.match(svg, /a/);
    strict_1.default.match(svg, /b/);
    strict_1.default.match(svg, /@keyframes frame-0/);
    strict_1.default.match(svg, /@keyframes frame-1/);
});
(0, node_test_1.test)('renderAnimatedGridFrames: last frame keyframe keeps opacity: 1 at 100%', () => {
    const svg = (0, svg_1.renderAnimatedGridFrames)([makeFrame('a', 0), makeFrame('b', 100), makeFrame('c', 200)], { watermark: false });
    // Regression: the last frame (frame-2) must keep opacity: 1 all the way to 100%
    // so the final frame stays visible during the full animation duration
    strict_1.default.match(svg, /@keyframes frame-2/);
    // Extract the frame-2 keyframe rule and verify it ends with opacity: 1 at 100%
    const frame2Match = svg.match(/@keyframes frame-2[^<]*/);
    strict_1.default.ok(frame2Match && frame2Match[0].includes('100% { opacity: 1; }'), 'frame-2 keyframe should have 100% { opacity: 1; }');
});
// Simulates CSS `animation-timing-function: steps(1, end)` for one loop of
// durationMs, sampled at atMs (wrapped modulo durationMs) — lets tests
// verify actual rendered-opacity-over-time from parsed keyframe stops,
// without needing a real browser.
function sampledOpacity(stops, durationMs, atMs) {
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
function parseKeyframeStops(svg, frameIndex) {
    // Extract the entire keyframe declaration by finding it between @keyframes frame-N and the next </style>
    const re = new RegExp(`@keyframes frame-${frameIndex}[^<]*`);
    const match = svg.match(re);
    strict_1.default.ok(match, `expected to find @keyframes frame-${frameIndex} in the SVG`);
    const fullRule = match[0]; // the entire '@keyframes frame-N { ... }'
    // Extract all percentage/opacity pairs: "20.000% { opacity: 1; }" -> (20.000, 1)
    const stopRe = /([\d.]+)%\s*\{\s*opacity:\s*([\d.]+)\s*;/g;
    const stops = [];
    let m;
    while ((m = stopRe.exec(fullRule)) !== null) {
        stops.push({ pct: parseFloat(m[1]), opacity: parseFloat(m[2]) });
    }
    return stops;
}
(0, node_test_1.test)('renderAnimatedGridFrames: the last frame is actually visible before the loop wraps, not just present in the CSS text', () => {
    const frames = [makeFrame('a', 0), makeFrame('b', 100), makeFrame('c', 200)];
    const svg = (0, svg_1.renderAnimatedGridFrames)(frames, { watermark: false });
    // Extract animation-duration from the shared .rec-frame rule.
    const durationMatch = svg.match(/animation-duration:\s*([\d.]+)ms/);
    strict_1.default.ok(durationMatch, 'expected to find animation-duration in the generated CSS');
    const durationMs = parseFloat(durationMatch[1]);
    const lastFrameStops = parseKeyframeStops(svg, frames.length - 1);
    // Sample well inside the last frame's window (its own timestamp + a bit,
    // and again just before the loop wraps) — both must show opacity 1.
    strict_1.default.equal(sampledOpacity(lastFrameStops, durationMs, 200 + 50), 1, 'last frame should be visible shortly after its own timestamp');
    strict_1.default.equal(sampledOpacity(lastFrameStops, durationMs, durationMs - 1), 1, 'last frame should still be visible just before the loop wraps');
    // Sample right at the wrap point (t=0 of the next iteration) — must be
    // back to invisible so frame-0 can take over cleanly.
    strict_1.default.equal(sampledOpacity(lastFrameStops, durationMs, 0), 0, 'last frame must reset to invisible at the start of the next loop');
});
(0, node_test_1.test)('--gradient really changes the background (hex colours contain digits: this used to fall back to the theme colours)', () => {
    const sunset = (0, svg_1.renderGridFrame)(makeFrame('x'), { watermark: false, gradient: 'sunset' });
    const neon = (0, svg_1.renderGridFrame)(makeFrame('x'), { watermark: false, gradient: 'neon' });
    strict_1.default.match(sunset, /stop-color="#ff512f"/);
    strict_1.default.match(sunset, /stop-color="#dd2476"/);
    strict_1.default.match(neon, /stop-color="#00F260"/);
    strict_1.default.notEqual(sunset, neon);
});
const svg_2 = require("./svg");
(0, node_test_1.test)('long window titles are shortened so they stay clear of the traffic lights', () => {
    strict_1.default.equal((0, svg_2.fitTitle)('zsh — ls', 700), 'zsh — ls');
    const long = 'zsh — ' + 'x'.repeat(200);
    const fitted = (0, svg_2.fitTitle)(long, 700);
    strict_1.default.ok(fitted.length <= Math.floor((700 - 220) / 7), fitted.length.toString());
    strict_1.default.ok(fitted.endsWith('…'));
    strict_1.default.equal((0, svg_2.fitTitle)('a\nb\n  c', 700), 'a b c');
    const svg = (0, svg_1.renderGridFrame)(makeFrame('x'), { watermark: false, title: long });
    strict_1.default.ok(!svg.includes('x'.repeat(100)), 'the full title must not be in the SVG');
});
const svg_3 = require("./svg");
(0, node_test_1.test)('a light theme adds a second rendering that is shown for prefers-color-scheme: light', () => {
    const svg = (0, svg_1.renderGridFrame)(makeFrame('hi'), { watermark: false, theme: 'github-dark', lightTheme: 'github-light' });
    strict_1.default.match(svg, /prefers-color-scheme: light/);
    strict_1.default.match(svg, /class="ttyreel-dark"/);
    strict_1.default.match(svg, /class="ttyreel-light"/);
    strict_1.default.match(svg, /#0d1117/, 'the dark background');
    strict_1.default.match(svg, /#ffffff/, 'the light background');
    strict_1.default.match(svg, /id="bgGrad"/);
    strict_1.default.match(svg, /id="bgGrad-light"/);
    strict_1.default.match(svg, /url\(#bgGrad-light\)/);
    strict_1.default.equal((svg.match(/<svg /g) || []).length, 1, 'one root element');
    strict_1.default.equal((0, svg_1.renderGridFrame)(makeFrame('hi'), { watermark: false, theme: 'github-dark' }).includes('ttyreel-light'), false);
});
(0, node_test_1.test)('light/dark also works for animations', () => {
    const frames = [makeFrame('a', 0), makeFrame('ab', 500)];
    const svg = (0, svg_1.renderAnimatedGridFrames)(frames, { watermark: false, theme: 'one-dark', lightTheme: 'solarized-light' });
    strict_1.default.match(svg, /ttyreel-light/);
    strict_1.default.match(svg, /#fdf6e3/);
});
(0, node_test_1.test)('--no-window drops the title bar and shrinks the image; a custom font goes first in the stack', () => {
    const normal = (0, svg_1.renderGridFrame)(makeFrame('hi'), { watermark: false });
    const bare = (0, svg_1.renderGridFrame)(makeFrame('hi'), { watermark: false, windowless: true });
    strict_1.default.match(normal, /#FF5F56/);
    strict_1.default.doesNotMatch(bare, /#FF5F56/);
    const h = (svg) => Number(/height="(\d+)"/.exec(svg)[1]);
    strict_1.default.equal(h(normal) - h(bare), 36);
    strict_1.default.equal((0, svg_3.fontStack)({ fontFamily: 'Fira Code' }), "'Fira Code', Menlo, Monaco, 'Courier New', monospace");
    strict_1.default.equal((0, svg_3.fontStack)({ fontFamily: "x'><script>" }), "'xscript', Menlo, Monaco, 'Courier New', monospace");
});
(0, node_test_1.test)('loop:false plays the animation once and stays on the last frame', () => {
    const frames = [makeFrame('a', 0), makeFrame('ab', 500)];
    const once = (0, svg_1.renderAnimatedGridFrames)(frames, { watermark: false, loop: false });
    const forever = (0, svg_1.renderAnimatedGridFrames)(frames, { watermark: false });
    strict_1.default.match(once, /animation-iteration-count: 1; animation-fill-mode: forwards/);
    strict_1.default.match(forever, /animation-iteration-count: infinite/);
});
const svg_4 = require("./svg");
const themes_1 = require("../themes");
(0, node_test_1.test)('the light rendering re-colours default text and ANSI colours for the light theme', () => {
    const dark = themes_1.THEMES['github-dark'];
    const light = themes_1.THEMES['github-light'];
    const f = { grid: [[{ char: 'a', fg: dark.foreground, bg: dark.background }, { char: 'b', fg: dark.colors.red, bg: dark.background }, { char: 'c', fg: '#123456', bg: dark.background }]], cursorX: 0, cursorY: 0, cursorVisible: false, timestampMs: 0 };
    const out = (0, svg_4.remapTheme)([f], dark, light)[0].grid[0];
    strict_1.default.equal(out[0].fg, light.foreground);
    strict_1.default.equal(out[0].bg, light.background);
    strict_1.default.equal(out[1].fg, light.colors.red);
    strict_1.default.equal(out[2].fg, '#123456', 'true colours stay');
    const svg = (0, svg_1.renderGridFrame)(f, { watermark: false, theme: 'github-dark', lightTheme: 'github-light' });
    strict_1.default.ok((svg.match(/fill="#24292f"/g) || []).length >= 1, 'dark text on the light page');
});
