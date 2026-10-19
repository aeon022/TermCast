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
const themes_1 = require("./themes");
(0, node_test_1.test)('every preset gradient yields its own colours (hex colours contain digits)', () => {
    const cyber = (0, themes_1.gradientStops)(themes_1.GRADIENTS.cyberpunk, '#111', '#222');
    assert.match(cyber, /offset="0%" stop-color="#ff007f"/);
    assert.match(cyber, /offset="100%" stop-color="#00f0ff"/);
    assert.ok(!cyber.includes('#111'), 'the fallback colours must not be used for a valid gradient');
});
(0, node_test_1.test)('three-stop gradients keep all their stops', () => {
    const matrix = (0, themes_1.gradientStops)(themes_1.GRADIENTS.matrix, '#111', '#222');
    assert.strictEqual((matrix.match(/<stop /g) || []).length, 3);
    assert.match(matrix, /offset="50%"/);
});
(0, node_test_1.test)('stops without percentages are spread evenly; rgb() colours work; junk falls back', () => {
    const even = (0, themes_1.gradientStops)('linear-gradient(90deg, #aaa, rgb(1, 2, 3), #ccc)', '#111', '#222');
    assert.match(even, /offset="0%"[\s\S]*offset="50%"[\s\S]*offset="100%"/);
    assert.match(even, /rgb\(1, 2, 3\)/);
    const fb = (0, themes_1.gradientStops)('not a gradient', '#111', '#222');
    assert.match(fb, /#111/);
    assert.match(fb, /#222/);
});
(0, node_test_1.test)('every gradient preset differs from the others', () => {
    const seen = new Set(Object.values(themes_1.GRADIENTS).map((g) => (0, themes_1.gradientStops)(g, '#111', '#222')));
    assert.strictEqual(seen.size, Object.keys(themes_1.GRADIENTS).length);
});
