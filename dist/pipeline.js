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
exports.parseFormats = parseFormats;
exports.parseLineRange = parseLineRange;
exports.applySpeed = applySpeed;
exports.selectLines = selectLines;
exports.writeOutputs = writeOutputs;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const crop_1 = require("./crop");
const redact_1 = require("./redact");
const svg_1 = require("./renderer/svg");
const html_1 = require("./renderer/html");
const gif_1 = require("./gif");
const png_1 = require("./png");
const ALL = ['svg', 'html', 'gif', 'png'];
/** "svg", "svg,gif", "both" (= svg + html) or "all" → the list of files to write. */
function parseFormats(spec) {
    const out = [];
    for (const part of spec.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean)) {
        const add = part === 'both' ? ['svg', 'html'] : part === 'all' ? ALL : [part];
        for (const f of add) {
            if (!ALL.includes(f))
                throw new Error(`Unknown format "${f}". Use svg, html, gif, png, both or all (comma-separated to combine).`);
            if (!out.includes(f))
                out.push(f);
        }
    }
    if (out.length === 0)
        throw new Error('No output format given.');
    return out;
}
/** "3-8" → [3, 8] (1-based, inclusive); "5" → [5, 5]. */
function parseLineRange(spec, total) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(spec.trim());
    if (!m)
        throw new Error(`Invalid --lines "${spec}": use N or FROM-TO, e.g. 3-8`);
    const from = Number(m[1]);
    const to = m[2] === undefined ? from : Number(m[2]);
    if (from < 1 || to < from)
        throw new Error(`Invalid --lines "${spec}": FROM must be at least 1 and not after TO`);
    if (total !== undefined && from > total)
        throw new Error(`--lines ${spec} is outside the recording (${total} lines)`);
    return [from, to];
}
/** Plays the recording faster (speed > 1) or slower by rescaling the timestamps. */
function applySpeed(frames, speed) {
    if (!(speed > 0 && speed <= 100))
        throw new Error('--speed must be greater than 0 and at most 100');
    if (speed === 1)
        return frames;
    return frames.map((f) => ({ ...f, timestampMs: Math.round(f.timestampMs / speed) }));
}
/** Keeps rows FROM..TO of every frame. */
function selectLines(frames, range) {
    const [from, to] = range;
    const total = Math.max(...frames.map((f) => f.grid.length));
    if (from > total)
        throw new Error(`--lines ${from}-${to} is outside the recording (${total} lines)`);
    return frames.map((f) => ({ ...f, grid: f.grid.slice(from - 1, to), cursorY: Math.max(0, f.cursorY - (from - 1)) }));
}
const frameText = (f) => f.grid.map((row) => row.map((c) => c.char || ' ').join('').trimEnd()).join('\n');
/** Turns a recording into the requested files: speed, line selection, cropping, redaction, then each format. */
async function writeOutputs(recorded, rawText, s) {
    if (recorded.length === 0)
        throw new Error('Nothing was recorded.');
    let frames = applySpeed(recorded, s.speed);
    if (s.lines)
        frames = selectLines(frames, s.lines);
    frames = (0, crop_1.cropBlankRows)(frames);
    const red = (0, redact_1.redactFrames)(frames, s.redact);
    frames = red.frames;
    const base = path.resolve(s.output.replace(/\.(svg|html|gif|png)$/i, ''));
    await fs.ensureDir(path.dirname(base));
    const files = [];
    const last = frames[frames.length - 1];
    // the title is usually the command line: it can hold the very secret that is masked in the output
    const render = { ...s.render, loop: s.loop, title: s.render.title === undefined ? undefined : (0, redact_1.redactString)(s.render.title, s.redact) };
    for (const format of s.formats) {
        const file = `${base}.${format}`;
        if (format === 'svg') {
            await fs.writeFile(file, s.animated ? (0, svg_1.renderAnimatedGridFrames)(frames, render) : (0, svg_1.renderGridFrame)(last, render), 'utf8');
        }
        else if (format === 'html') {
            // colours come from the raw terminal text when there is one (live recordings); otherwise from the last frame
            let text = rawText !== undefined && !s.lines ? (0, redact_1.redactAnsiText)(rawText, s.redact).text : frameText(last);
            await fs.writeFile(file, (0, html_1.renderHtmlEmbed)([{ text, delayMs: 0 }], render), 'utf8');
        }
        else if (format === 'gif') {
            await fs.writeFile(file, await (0, gif_1.encodeGif)(frames, render, s.fps, { loop: s.loop, scale: s.scale }));
        }
        else {
            await fs.writeFile(file, (0, png_1.encodePng)(last, render, s.scale));
        }
        files.push(file);
    }
    return { files, redacted: red.count };
}
