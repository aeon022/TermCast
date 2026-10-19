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
exports.parseCast = parseCast;
exports.castToFrames = castToFrames;
exports.loadCastFrames = loadCastFrames;
const fs = __importStar(require("fs"));
const headless_1 = require("@xterm/headless");
const recorder_1 = require("./recorder");
/**
 * Reads an asciinema recording (format v2, or v3 with relative timestamps) and keeps its output events.
 * Idle gaps longer than `idleLimit` seconds are shortened, like `asciinema play -i`.
 */
function parseCast(text, idleLimit = 2) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
    if (lines.length === 0)
        throw new Error('Empty cast file');
    let header;
    try {
        header = JSON.parse(lines[0]);
    }
    catch {
        throw new Error('Not an asciinema cast: the first line is not a JSON header');
    }
    const version = header.version;
    if (version !== 2 && version !== 3)
        throw new Error(`Unsupported asciinema cast version ${version} (supported: 2 and 3)`);
    const cols = Number(version === 3 ? header.term?.cols : header.width) || 80;
    const rows = Number(version === 3 ? header.term?.rows : header.height) || 24;
    const events = [];
    let clock = 0; // time on the (idle-shortened) output timeline
    let lastRaw = 0; // previous event's own timestamp, for gap detection
    for (const line of lines.slice(1)) {
        let ev;
        try {
            ev = JSON.parse(line);
        }
        catch {
            continue;
        }
        if (!Array.isArray(ev) || typeof ev[0] !== 'number')
            continue;
        const gap = version === 3 ? ev[0] : ev[0] - lastRaw;
        lastRaw = version === 3 ? 0 : ev[0];
        clock += idleLimit > 0 ? Math.min(Math.max(gap, 0), idleLimit) : Math.max(gap, 0);
        if (ev[1] === 'o' && typeof ev[2] === 'string')
            events.push({ time: clock, data: ev[2] });
    }
    return { cols, rows, events };
}
/** Plays the cast into a headless terminal and samples it at `fps`, producing the same frames as a live recording. */
async function castToFrames(cast, options = {}) {
    const fps = options.fps || 10;
    const term = new headless_1.Terminal({ cols: cast.cols, rows: cast.rows, allowProposedApi: true });
    const write = (data) => new Promise((res) => term.write(data, () => res()));
    const theme = options.theme || 'dracula';
    const end = cast.events.length ? cast.events[cast.events.length - 1].time : 0;
    const frames = [(0, recorder_1.snapshotFrame)(term, theme, 0)];
    let i = 0;
    for (let t = 1000 / fps; t <= end * 1000 + 1000 / fps; t += 1000 / fps) {
        while (i < cast.events.length && cast.events[i].time * 1000 <= t)
            await write(cast.events[i++].data);
        frames.push((0, recorder_1.snapshotFrame)(term, theme, Math.round(t)));
    }
    return frames;
}
async function loadCastFrames(file, options = {}) {
    let text;
    try {
        text = fs.readFileSync(file, 'utf8');
    }
    catch (err) {
        throw new Error(`Cannot read cast ${file}: ${err.message}`);
    }
    const cast = parseCast(text, options.idleLimit ?? 2);
    return { frames: await castToFrames(cast, options), cols: cast.cols, rows: cast.rows };
}
