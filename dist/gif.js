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
exports.resolveMonospaceFontOptions = resolveMonospaceFontOptions;
exports.buildEncodableFrames = buildEncodableFrames;
exports.encodeGif = encodeGif;
const gifenc_1 = require("gifenc");
const resvg_js_1 = require("@resvg/resvg-js");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const svg_1 = require("./renderer/svg");
const MONOSPACE_FONT_CANDIDATES = {
    darwin: ['/System/Library/Fonts/Menlo.ttc', '/System/Library/Fonts/Monaco.ttf'],
    linux: [
        '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
        '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf',
        '/usr/share/fonts/TTF/DejaVuSansMono.ttf'
    ],
    win32: ['C:\\Windows\\Fonts\\consola.ttf', 'C:\\Windows\\Fonts\\cour.ttf']
};
// Resolving fonts via loadSystemFonts is a full system font-database scan
// — measured ~140x slower per Resvg instantiation than pointing at a known
// file directly. This project only ever renders one fixed monospace font
// family, so resolve a real font file once per encodeGif() call (checked
// against well-known per-OS install paths) and reuse it for every frame,
// instead of rescanning per frame. Falls back to the slow but
// always-correct loadSystemFonts:true only if none of the known paths
// exist on this machine.
function resolveMonospaceFontOptions() {
    const candidates = MONOSPACE_FONT_CANDIDATES[os.platform()] || [];
    const found = candidates.filter(p => fs.existsSync(p));
    if (found.length > 0) {
        return { loadSystemFonts: false, fontFiles: found };
    }
    return { loadSystemFonts: true };
}
function framesEqual(a, b) {
    if (a.grid.length !== b.grid.length)
        return false;
    for (let y = 0; y < a.grid.length; y++) {
        const rowA = a.grid[y];
        const rowB = b.grid[y];
        if (rowA.length !== rowB.length)
            return false;
        for (let x = 0; x < rowA.length; x++) {
            const ca = rowA[x];
            const cb = rowB[x];
            if (ca.char !== cb.char || ca.fg !== cb.fg || ca.bg !== cb.bg ||
                !!ca.bold !== !!cb.bold || !!ca.italic !== !!cb.italic || !!ca.underline !== !!cb.underline) {
                return false;
            }
        }
    }
    return true;
}
// Merges consecutive identical frames into one GIF frame with an extended
// delay (instead of encoding N redundant identical frames), and derives
// each remaining frame's delay from the REAL inter-frame timestamp gap
// rather than a flat fps-derived constant. The last frame's delay is
// extended by FINAL_FRAME_HOLD_MS so it's actually visible before a
// looping GIF wraps back to the first frame — mirroring the same fix
// already applied to renderAnimatedGridFrames's CSS animation timing.
function buildEncodableFrames(frames) {
    const result = [];
    for (let i = 0; i < frames.length; i++) {
        const nextTimestamp = i < frames.length - 1
            ? frames[i + 1].timestampMs
            : frames[i].timestampMs + svg_1.FINAL_FRAME_HOLD_MS;
        const gapMs = Math.max(1, nextTimestamp - frames[i].timestampMs);
        const prev = result[result.length - 1];
        if (prev && framesEqual(prev.frame, frames[i])) {
            prev.delayMs += gapMs;
            continue;
        }
        result.push({ frame: frames[i], delayMs: gapMs });
    }
    return result;
}
// Renders each frame to SVG, rasterizes it via resvg (no system
// dependencies beyond what npm already installs), and assembles the PNG
// sequence into an animated GIF.
// `fps` is kept for call-site compatibility but no longer sets the playback
// delay — per-frame delays now come from the recording's real timestamps.
async function encodeGif(frames, options, fps) {
    if (frames.length === 0) {
        throw new Error('encodeGif requires at least one frame');
    }
    const fontOpts = resolveMonospaceFontOptions();
    const encodable = buildEncodableFrames(frames);
    const encoder = (0, gifenc_1.GIFEncoder)();
    for (let i = 0; i < encodable.length; i++) {
        const svg = (0, svg_1.renderGridFrame)(encodable[i].frame, options);
        const resvg = new resvg_js_1.Resvg(svg, { font: fontOpts });
        const rendered = resvg.render();
        const { pixels, width, height } = rendered;
        const palette = (0, gifenc_1.quantize)(pixels, 256);
        const indexed = (0, gifenc_1.applyPalette)(pixels, palette);
        encoder.writeFrame(indexed, width, height, { palette, delay: encodable[i].delayMs, first: i === 0 });
    }
    encoder.finish();
    return Buffer.from(encoder.bytes());
}
