"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const recorder_1 = require("./recorder");
(0, node_test_1.test)('recordCommand captures real output from a spawned command', async () => {
    const result = await (0, recorder_1.recordCommand)('echo hello-termcast', {
        cols: 40,
        rows: 5,
        fps: 20,
        maxDurationMs: 5000
    });
    strict_1.default.ok(result.frames.length >= 1, 'expected at least one frame');
    const lastFrame = result.frames[result.frames.length - 1];
    const lineText = lastFrame.grid.map(row => row.map(c => c.char).join('')).join('\n');
    strict_1.default.match(lineText, /hello-termcast/, 'expected the echoed text to appear in the captured grid');
    strict_1.default.match(result.rawText, /hello-termcast/, 'expected the raw text accumulator to contain the echoed text');
});
(0, node_test_1.test)('recordCommand always captures a t=0 frame even for a fast command', async () => {
    const result = await (0, recorder_1.recordCommand)('true', { cols: 20, rows: 3, fps: 10, maxDurationMs: 2000 });
    strict_1.default.ok(result.frames.length >= 1);
    strict_1.default.equal(result.frames[0].timestampMs, 0);
});
