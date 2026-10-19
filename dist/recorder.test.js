"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const recorder_1 = require("./recorder");
(0, node_test_1.test)('recordCommand captures real output from a spawned command', async () => {
    const result = await (0, recorder_1.recordCommand)('echo hello-ttyreel', {
        cols: 40,
        rows: 5,
        fps: 20,
        maxDurationMs: 5000
    });
    strict_1.default.ok(result.frames.length >= 1, 'expected at least one frame');
    const lastFrame = result.frames[result.frames.length - 1];
    const lineText = lastFrame.grid.map(row => row.map(c => c.char).join('')).join('\n');
    strict_1.default.match(lineText, /hello-ttyreel/, 'expected the echoed text to appear in the captured grid');
    strict_1.default.match(result.rawText, /hello-ttyreel/, 'expected the raw text accumulator to contain the echoed text');
});
(0, node_test_1.test)('recordCommand always captures a t=0 frame even for a fast command', async () => {
    const result = await (0, recorder_1.recordCommand)('true', { cols: 20, rows: 3, fps: 10, maxDurationMs: 2000 });
    strict_1.default.ok(result.frames.length >= 1);
    strict_1.default.equal(result.frames[0].timestampMs, 0);
});
const recorder_2 = require("./recorder");
const screen = (f) => f.grid.map((r) => r.map((c) => c.char).join('').trimEnd()).join('\n');
(0, node_test_1.test)('recordSession types the command after a prompt and then shows its output', async () => {
    const { frames, rawText } = await (0, recorder_2.recordSession)([{ cmd: 'echo typed-output' }], { cols: 50, rows: 6, fps: 40, typing: true, typeSpeedMs: 5, prompt: '$ ', maxDurationMs: 8000 });
    const all = frames.map(screen);
    const typedFirst = all.findIndex((s) => s.includes('$ echo typed-output'));
    const outputAt = all.findIndex((s) => /\n?typed-output$/m.test(s) && s.split('\n').filter((l) => l.trim() === 'typed-output').length > 0);
    strict_1.default.ok(typedFirst >= 0, 'the typed command line appears');
    strict_1.default.ok(outputAt > typedFirst, 'the output comes after the typed line');
    strict_1.default.ok(all.some((s) => s.startsWith('$ ec') && !s.includes('echo typed')), 'the command is typed character by character');
    strict_1.default.match(rawText, /\$ echo typed-output/);
});
(0, node_test_1.test)('recordSession runs several steps in one screen, honouring per-step typing', async () => {
    const { frames } = await (0, recorder_2.recordSession)([{ cmd: 'echo first', type: true }, { cmd: 'echo second', type: false, pause: 20 }], { cols: 40, rows: 8, fps: 40, typeSpeedMs: 1, prompt: '> ', maxDurationMs: 8000 });
    const last = screen(frames[frames.length - 1]);
    strict_1.default.match(last, /> echo first\nfirst\nsecond/);
    strict_1.default.ok(!last.includes('> echo second'), 'a step with type:false shows no prompt');
});
(0, node_test_1.test)('recordSession stops at the time limit', async () => {
    const t0 = Date.now();
    const { frames } = await (0, recorder_2.recordSession)([{ cmd: 'sleep 5' }], { cols: 20, rows: 3, fps: 10, maxDurationMs: 300 });
    strict_1.default.ok(Date.now() - t0 < 3000);
    strict_1.default.ok(frames.length >= 2);
});
(0, node_test_1.test)('prompt styles: known names, none, or a literal string', () => {
    strict_1.default.match((0, recorder_2.promptString)('starship'), /❯/);
    strict_1.default.equal((0, recorder_2.promptString)('none'), '');
    strict_1.default.equal((0, recorder_2.promptString)('>>> '), '>>> ');
    strict_1.default.match((0, recorder_2.promptString)(undefined), /➜/);
});
