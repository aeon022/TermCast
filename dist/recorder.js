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
exports.snapshotFrame = snapshotFrame;
exports.promptString = promptString;
exports.recordSession = recordSession;
exports.recordCommand = recordCommand;
const pty = __importStar(require("node-pty"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const headless_1 = require("@xterm/headless");
const colorResolve_1 = require("./colorResolve");
const themes_1 = require("./themes");
const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const DEFAULT_FPS = 10;
const DEFAULT_MAX_DURATION_MS = 30000;
// npm can install node-pty's prebuilt spawn-helper without the execute bit, which makes every
// spawn fail with "posix_spawnp failed". Restore it before the first spawn (no-op elsewhere).
function ensureSpawnHelperExecutable() {
    if (process.platform === 'win32')
        return;
    try {
        const dir = path.join(path.dirname(require.resolve('node-pty/package.json')), 'prebuilds', `${process.platform}-${process.arch}`);
        const helper = path.join(dir, 'spawn-helper');
        if (fs.existsSync(helper) && (fs.statSync(helper).mode & 0o111) === 0)
            fs.chmodSync(helper, 0o755);
    }
    catch {
        // best effort: a source build or a read-only install keeps working or fails with the original error
    }
}
function snapshotFrame(term, themeName, timestampMs) {
    const theme = themes_1.THEMES[themeName] || themes_1.THEMES.dracula;
    const buffer = term.buffer.active;
    const grid = [];
    for (let y = 0; y < term.rows; y++) {
        const line = buffer.getLine(buffer.viewportY + y);
        const row = [];
        for (let x = 0; x < term.cols; x++) {
            const cell = line ? line.getCell(x) : undefined;
            if (!cell) {
                row.push({ char: ' ', fg: theme.foreground, bg: theme.background });
                continue;
            }
            const fg = (0, colorResolve_1.resolveColor)(cell.isFgRGB(), cell.isFgPalette(), cell.getFgColor(), theme, true);
            const bg = (0, colorResolve_1.resolveColor)(cell.isBgRGB(), cell.isBgPalette(), cell.getBgColor(), theme, false);
            row.push({
                char: cell.getChars() || ' ',
                fg,
                bg,
                bold: !!cell.isBold(),
                italic: !!cell.isItalic(),
                underline: !!cell.isUnderline()
            });
        }
        grid.push(row);
    }
    return {
        grid,
        cursorX: buffer.cursorX,
        cursorY: buffer.cursorY,
        cursorVisible: true,
        timestampMs
    };
}
const PROMPTS = {
    zsh: '\x1b[1;32m➜\x1b[0m  \x1b[36m~\x1b[0m ',
    bash: '\x1b[1;32muser@host\x1b[0m:\x1b[1;34m~\x1b[0m$ ',
    starship: '\x1b[1;34m~\x1b[0m \x1b[1;32m❯\x1b[0m ',
    none: ''
};
function promptString(style) {
    if (style === undefined)
        return PROMPTS.zsh;
    return Object.prototype.hasOwnProperty.call(PROMPTS, style) ? PROMPTS[style] : style;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Records a session of one or more commands in a single terminal: for every step the prompt and the typed
// command can be shown (typing simulated character by character), then the command runs in a
// pseudoterminal and its real output is added below. The terminal grid is sampled at a fixed rate
// (options.fps) into a Frame timeline. A frame is always captured at t=0, so a command that exits before
// the first sample tick still produces output. The whole session stops at options.maxDurationMs: the running
// process is killed and a warning is printed.
function recordSession(steps, options = {}) {
    const cols = options.cols || DEFAULT_COLS;
    const rows = options.rows || DEFAULT_ROWS;
    const fps = options.fps || DEFAULT_FPS;
    const maxDurationMs = options.maxDurationMs || DEFAULT_MAX_DURATION_MS;
    const themeName = options.theme || 'dracula';
    const typeSpeed = options.typeSpeedMs ?? 45;
    const prompt = promptString(options.prompt);
    return new Promise((resolve, reject) => {
        const term = new headless_1.Terminal({ cols, rows, allowProposedApi: true });
        const frames = [];
        let rawText = '';
        const startedAt = Date.now();
        let current;
        let lastWritePending = Promise.resolve();
        let stopped = false;
        const snap = () => frames.push(snapshotFrame(term, themeName, Date.now() - startedAt));
        const write = (data) => {
            rawText += data;
            lastWritePending = new Promise((res) => term.write(data, () => res()));
        };
        snap();
        const sampleInterval = setInterval(snap, Math.max(1, Math.round(1000 / fps)));
        const limit = setTimeout(() => {
            if (stopped)
                return;
            stopped = true;
            console.warn(`[ttyreel] Recording stopped at ${maxDurationMs / 1000}s limit — the command may still have been running.`);
            try {
                current?.kill();
            }
            catch { /* already gone */ }
        }, maxDurationMs);
        const run = async () => {
            for (let i = 0; i < steps.length && !stopped; i++) {
                const step = steps[i];
                const typed = step.type ?? options.typing ?? false;
                if (typed) {
                    write(prompt);
                    for (const ch of Array.from(step.show ?? step.cmd)) {
                        if (stopped)
                            break;
                        write(ch);
                        await sleep(typeSpeed ? typeSpeed + Math.round(Math.random() * typeSpeed * 0.4) : 0);
                    }
                    await sleep(typeSpeed ? 250 : 0);
                    write('\r\n');
                }
                if (stopped)
                    break;
                await new Promise((done) => {
                    const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/sh');
                    const args = process.platform === 'win32' ? ['-Command', step.cmd] : ['-c', step.cmd];
                    try {
                        ensureSpawnHelperExecutable();
                        current = pty.spawn(shell, args, { name: 'xterm-256color', cols, rows, env: { ...process.env, FORCE_COLOR: '1' } });
                    }
                    catch (err) {
                        reject(err);
                        stopped = true;
                        return done();
                    }
                    current.onData(write);
                    current.onExit(() => done());
                });
                await lastWritePending;
                if (step.pause && !stopped)
                    await sleep(step.pause);
            }
        };
        run().then(async () => {
            stopped = true;
            clearInterval(sampleInterval);
            clearTimeout(limit);
            await lastWritePending;
            snap();
            try {
                current?.kill();
            }
            catch { /* already exited */ }
            resolve({ frames, rawText });
        }, (err) => {
            clearInterval(sampleInterval);
            clearTimeout(limit);
            reject(err);
        });
    });
}
// Records one command (no prompt, no typing): the original single-command entry point.
function recordCommand(cmdString, options = {}) {
    return recordSession([{ cmd: cmdString }], { ...options, typing: false, prompt: 'none' });
}
