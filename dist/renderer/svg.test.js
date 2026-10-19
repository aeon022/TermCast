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
