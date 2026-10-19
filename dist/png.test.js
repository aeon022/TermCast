"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const png_1 = require("./png");
const gif_1 = require("./gif");
const frame = (text) => ({
    grid: [Array.from(text).map((c) => ({ char: c, fg: '#f8f8f2', bg: '#282a36' }))],
    cursorX: 0, cursorY: 0, cursorVisible: false, timestampMs: 0
});
const size = (png) => ({ w: png.readUInt32BE(16), h: png.readUInt32BE(20) });
(0, node_test_1.test)('PNG export: valid image, and scale 2 doubles both dimensions', () => {
    const one = (0, png_1.encodePng)(frame('hi'), { watermark: false }, 1);
    const two = (0, png_1.encodePng)(frame('hi'), { watermark: false }, 2);
    strict_1.default.equal(one.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    strict_1.default.equal(size(two).w, size(one).w * 2);
    strict_1.default.equal(size(two).h, size(one).h * 2);
    strict_1.default.throws(() => (0, png_1.encodePng)(frame('x'), {}, 0), /scale must be between/);
});
(0, node_test_1.test)('GIF export: loops by default, plays once with loop:false, scale applies', async () => {
    const frames = [frame('a'), { ...frame('b'), timestampMs: 100 }];
    const looping = await (0, gif_1.encodeGif)(frames, { watermark: false }, 10);
    const once = await (0, gif_1.encodeGif)(frames, { watermark: false }, 10, { loop: false });
    const big = await (0, gif_1.encodeGif)(frames, { watermark: false }, 10, { scale: 2 });
    const hasLoopExtension = (b) => b.includes(Buffer.from('NETSCAPE2.0'));
    strict_1.default.ok(hasLoopExtension(looping), 'a looping GIF carries the NETSCAPE loop extension');
    strict_1.default.ok(!hasLoopExtension(once), 'a play-once GIF does not');
    strict_1.default.equal(big.readUInt16LE(6), looping.readUInt16LE(6) * 2, 'logical screen width doubles');
});
