"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const cast_1 = require("./cast");
const v2 = [
    '{"version": 2, "width": 30, "height": 5}',
    '[0.1, "o", "hello "]',
    '[0.5, "i", "ignored input"]',
    '[0.6, "o", "world\\r\\n"]',
    '[30.0, "o", "later"]'
].join('\n');
(0, node_test_1.test)('asciinema v2: size, output events, and long idle gaps are shortened', () => {
    const cast = (0, cast_1.parseCast)(v2, 2);
    strict_1.default.equal(cast.cols, 30);
    strict_1.default.equal(cast.rows, 5);
    strict_1.default.deepEqual(cast.events.map((e) => e.data), ['hello ', 'world\r\n', 'later']);
    const times = cast.events.map((e) => Math.round(e.time * 10) / 10);
    strict_1.default.deepEqual(times, [0.1, 0.6, 2.6], 'the 29.4 s pause became the 2 s idle limit');
    strict_1.default.equal((0, cast_1.parseCast)(v2, 0).events[2].time, 30, 'idleLimit 0 keeps real timing');
});
(0, node_test_1.test)('asciinema v3: relative timestamps and the term size', () => {
    const cast = (0, cast_1.parseCast)(['{"version": 3, "term": {"cols": 40, "rows": 8}}', '[0.2, "o", "a"]', '[0.3, "o", "b"]'].join('\n'));
    strict_1.default.equal(cast.cols, 40);
    strict_1.default.deepEqual(cast.events.map((e) => Math.round(e.time * 10) / 10), [0.2, 0.5]);
});
(0, node_test_1.test)('bad files are explained', () => {
    strict_1.default.throws(() => (0, cast_1.parseCast)(''), /Empty cast/);
    strict_1.default.throws(() => (0, cast_1.parseCast)('not json'), /Not an asciinema cast/);
    strict_1.default.throws(() => (0, cast_1.parseCast)('{"version": 1}'), /Unsupported asciinema cast version 1/);
});
(0, node_test_1.test)('playing a cast produces frames that show the text appearing over time', async () => {
    const frames = await (0, cast_1.castToFrames)((0, cast_1.parseCast)(v2, 1), { fps: 20 });
    const screen = (i) => frames[i].grid.map((r) => r.map((c) => c.char).join('').trimEnd()).join('\n');
    strict_1.default.equal(screen(0).trim(), '');
    strict_1.default.ok(frames.some((_, i) => screen(i).startsWith('hello') && !screen(i).includes('world')));
    strict_1.default.match(screen(frames.length - 1), /hello world\nlater/);
    strict_1.default.ok(frames[frames.length - 1].timestampMs >= 1500, 'the timeline reaches the last event');
});
