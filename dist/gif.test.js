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
const gif_1 = require("./gif");
function makeFrame(text, timestampMs) {
    const grid = [
        text.split('').map(ch => ({ char: ch, fg: '#f8f8f2', bg: '#282a36' }))
    ];
    return { grid, cursorX: text.length, cursorY: 0, cursorVisible: true, timestampMs };
}
// Minimal GIF89a block walker: returns each frame's delay in centiseconds.
// Only exists so tests can assert on encoded frame count / delays.
function gifFrameDelaysCs(buf) {
    let p = 6 + 7; // signature + logical screen descriptor
    if (buf[10] & 0x80)
        p += 3 * (1 << ((buf[10] & 0x07) + 1)); // global color table
    const skipSubBlocks = () => {
        while (buf[p] !== 0)
            p += 1 + buf[p];
        p++;
    };
    const delays = [];
    let pendingDelay = 0;
    while (p < buf.length) {
        const marker = buf[p++];
        if (marker === 0x3b)
            break; // trailer
        if (marker === 0x21) {
            const label = buf[p++];
            if (label === 0xf9)
                pendingDelay = buf.readUInt16LE(p + 2);
            skipSubBlocks();
        }
        else if (marker === 0x2c) {
            const packed = buf[p + 8];
            p += 9;
            if (packed & 0x80)
                p += 3 * (1 << ((packed & 0x07) + 1)); // local color table
            p++; // LZW min code size
            skipSubBlocks();
            delays.push(pendingDelay);
        }
        else {
            throw new Error(`unexpected GIF block marker 0x${marker.toString(16)} at ${p - 1}`);
        }
    }
    return delays;
}
(0, node_test_1.test)('encodeGif produces a non-empty buffer with a valid GIF header', async () => {
    const frames = [makeFrame('a', 0), makeFrame('b', 100)];
    const buffer = await (0, gif_1.encodeGif)(frames, { watermark: false }, 10);
    strict_1.default.ok(buffer.length > 0);
    strict_1.default.equal(buffer.subarray(0, 6).toString('ascii'), 'GIF89a');
});
(0, node_test_1.test)('encodeGif rejects an empty frame list', async () => {
    await strict_1.default.rejects(() => (0, gif_1.encodeGif)([], { watermark: false }, 10));
});
(0, node_test_1.test)('encodeGif merges consecutive identical frames into one GIF frame', async () => {
    const frames = [
        makeFrame('a', 0),
        makeFrame('a', 100),
        makeFrame('a', 200),
        makeFrame('b', 300)
    ];
    const delays = gifFrameDelaysCs(await (0, gif_1.encodeGif)(frames, { watermark: false }, 10));
    strict_1.default.equal(delays.length, 2, 'four input frames should collapse to two encoded frames');
    // The three identical 'a' frames merge: 100 + 100 + 100 = 300ms = 30cs.
    strict_1.default.equal(delays[0], 30);
});
(0, node_test_1.test)('encodeGif holds the last frame for FINAL_FRAME_HOLD_MS', async () => {
    const frames = [makeFrame('a', 0), makeFrame('b', 100)];
    const delays = gifFrameDelaysCs(await (0, gif_1.encodeGif)(frames, { watermark: false }, 10));
    strict_1.default.deepEqual(delays, [10, 80]); // 100ms real gap, then the 800ms hold
});
(0, node_test_1.test)('resolveMonospaceFontOptions points at a real font file when one exists', () => {
    const opts = (0, gif_1.resolveMonospaceFontOptions)();
    if (os.platform() === 'darwin' && fs.existsSync('/System/Library/Fonts/Menlo.ttc')) {
        strict_1.default.equal(opts.loadSystemFonts, false);
        strict_1.default.ok(opts.fontFiles && opts.fontFiles.length > 0);
        strict_1.default.ok(opts.fontFiles.every(p => fs.existsSync(p)));
    }
    else {
        // No known candidate on this machine — must degrade to the slow-but-correct path.
        strict_1.default.equal(opts.loadSystemFonts, opts.fontFiles ? false : true);
    }
});
