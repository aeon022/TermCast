"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const pipeline_1 = require("./pipeline");
const mk = (rows, t = 0) => ({
    grid: rows.map((r) => Array.from(r.padEnd(60)).map((c) => ({ char: c, fg: '#f8f8f2', bg: '#282a36' }))),
    cursorX: 0, cursorY: rows.length - 1, cursorVisible: false, timestampMs: t
});
(0, node_test_1.test)('formats: single, list, aliases, errors', () => {
    strict_1.default.deepEqual((0, pipeline_1.parseFormats)('svg'), ['svg']);
    strict_1.default.deepEqual((0, pipeline_1.parseFormats)('both'), ['svg', 'html']);
    strict_1.default.deepEqual((0, pipeline_1.parseFormats)('svg, gif,svg'), ['svg', 'gif']);
    strict_1.default.deepEqual((0, pipeline_1.parseFormats)('all'), ['svg', 'html', 'gif', 'png']);
    strict_1.default.throws(() => (0, pipeline_1.parseFormats)('mp4'), /Unknown format "mp4"/);
    strict_1.default.throws(() => (0, pipeline_1.parseFormats)(''), /No output format/);
});
(0, node_test_1.test)('line ranges', () => {
    strict_1.default.deepEqual((0, pipeline_1.parseLineRange)('3-8'), [3, 8]);
    strict_1.default.deepEqual((0, pipeline_1.parseLineRange)('5'), [5, 5]);
    strict_1.default.throws(() => (0, pipeline_1.parseLineRange)('0-3'), /at least 1/);
    strict_1.default.throws(() => (0, pipeline_1.parseLineRange)('8-3'), /not after TO/);
    strict_1.default.throws(() => (0, pipeline_1.parseLineRange)('a-b'), /Invalid --lines/);
});
(0, node_test_1.test)('speed rescales timestamps; lines keeps a window of rows', () => {
    const sped = (0, pipeline_1.applySpeed)([mk(['a'], 0), mk(['a'], 1000)], 2);
    strict_1.default.deepEqual(sped.map((f) => f.timestampMs), [0, 500]);
    strict_1.default.throws(() => (0, pipeline_1.applySpeed)([mk(['a'])], 0), /--speed must be/);
    const sel = (0, pipeline_1.selectLines)([mk(['one', 'two', 'three', 'four'])], [2, 3]);
    strict_1.default.equal(sel[0].grid.length, 2);
    strict_1.default.equal(sel[0].grid[0].map((c) => c.char).join('').trim(), 'two');
    strict_1.default.throws(() => (0, pipeline_1.selectLines)([mk(['one'])], [5, 6]), /outside the recording/);
});
(0, node_test_1.test)('writeOutputs writes every requested file, masks secrets and reports how many', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ttyreel-out-'));
    const secret = 'ghp_' + 'd'.repeat(36);
    const frames = [mk(['$ deploy', `token=${secret}`, '', '', ''], 0), mk(['$ deploy', `token=${secret}`, 'done', '', ''], 400)];
    const res = await (0, pipeline_1.writeOutputs)(frames, `$ deploy\r\ntoken=${secret}\r\ndone\r\n`, {
        output: path.join(dir, 'nested', 'demo.svg'),
        formats: ['svg', 'html', 'gif', 'png'],
        animated: true, scale: 1, loop: true, speed: 1, fps: 10,
        redact: {}, render: { watermark: false }
    });
    strict_1.default.equal(res.redacted, 1);
    strict_1.default.deepEqual(res.files.map((f) => path.basename(f)), ['demo.svg', 'demo.html', 'demo.gif', 'demo.png']);
    for (const f of res.files)
        strict_1.default.ok(fs.statSync(f).size > 200, f);
    for (const f of res.files.filter((f) => /\.(svg|html)$/.test(f))) {
        const text = fs.readFileSync(f, 'utf8');
        strict_1.default.ok(!text.includes(secret), `${path.basename(f)} must not contain the secret`);
    }
    strict_1.default.ok(fs.readFileSync(res.files[0], 'utf8').includes('•'), 'the mask is visible');
    strict_1.default.ok(fs.readFileSync(res.files[0], 'utf8').includes('done'));
});
(0, node_test_1.test)('--no-redact (auto:false) keeps the text, extra patterns still apply', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ttyreel-out-'));
    const secret = 'ghp_' + 'e'.repeat(36);
    const base = { formats: ['svg'], animated: false, scale: 1, loop: true, speed: 1, fps: 10, render: { watermark: false } };
    await (0, pipeline_1.writeOutputs)([mk([`x ${secret} y`, 'host-a'])], undefined, { ...base, output: path.join(dir, 'a'), redact: { auto: false, extra: [/host-a/] } });
    const svg = fs.readFileSync(path.join(dir, 'a.svg'), 'utf8');
    strict_1.default.ok(svg.includes(secret));
    strict_1.default.ok(!svg.includes('host-a'));
});
(0, node_test_1.test)('nothing recorded is an error', async () => {
    await strict_1.default.rejects((0, pipeline_1.writeOutputs)([], '', { output: 'x', formats: ['svg'], animated: false, scale: 1, loop: true, speed: 1, fps: 10, redact: {}, render: {} }), /Nothing was recorded/);
});
