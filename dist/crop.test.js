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
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert"));
const crop_1 = require("./crop");
const blank = { char: ' ', fg: '#fff', bg: '#000' };
const ch = (c) => ({ char: c, fg: '#fff', bg: '#000' });
function frame(rows, cursorY = 0, cursorVisible = false) {
    return { grid: rows.map((r) => Array.from(r.padEnd(5)).map((c) => (c === ' ' ? blank : ch(c)))), cursorX: 0, cursorY, cursorVisible, timestampMs: 0 };
}
(0, node_test_1.test)('trailing empty rows are removed, the same count for every frame', () => {
    const frames = [frame(['a', '', '', '', '', '', '']), frame(['a', 'bc', 'd', '', '', '', ''])];
    const out = (0, crop_1.cropBlankRows)(frames);
    assert.deepStrictEqual(out.map((f) => f.grid.length), [3, 3]);
});
(0, node_test_1.test)('at least minRows are kept, and the cursor row counts as content', () => {
    assert.strictEqual((0, crop_1.cropBlankRows)([frame(['x', '', '', '', ''])], 3)[0].grid.length, 3);
    assert.strictEqual((0, crop_1.cropBlankRows)([frame(['', '', '', '', '', ''], 4, true)], 1)[0].grid.length, 5);
    assert.strictEqual((0, crop_1.cropBlankRows)([frame(['', '', '', '', ''], 4, false)], 2)[0].grid.length, 2);
});
(0, node_test_1.test)('a screen that is fully used stays as it is', () => {
    const full = frame(['a', 'b', 'c', 'd']);
    assert.strictEqual((0, crop_1.cropBlankRows)([full])[0].grid.length, 4);
});
