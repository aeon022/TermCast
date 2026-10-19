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
// Records the real-time output of cmdString in a pseudoterminal, sampling
// the terminal grid at a fixed rate (options.fps) into a Frame timeline.
// Always captures one immediate frame at t=0 in addition to the interval
// samples, so a command that exits before the first sample tick still
// produces real output instead of zero frames. Stops at whichever comes
// first: the process exiting, or options.maxDurationMs elapsing (in which
// case the process is killed and a warning is printed).
function recordCommand(cmdString, options = {}) {
    const cols = options.cols || DEFAULT_COLS;
    const rows = options.rows || DEFAULT_ROWS;
    const fps = options.fps || DEFAULT_FPS;
    const maxDurationMs = options.maxDurationMs || DEFAULT_MAX_DURATION_MS;
    const themeName = options.theme || 'dracula';
    return new Promise((resolve, reject) => {
        const term = new headless_1.Terminal({ cols, rows, allowProposedApi: true });
        const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/sh');
        const shellArgs = process.platform === 'win32' ? ['-Command', cmdString] : ['-c', cmdString];
        let ptyProcess;
        try {
            ensureSpawnHelperExecutable();
            ptyProcess = pty.spawn(shell, shellArgs, {
                name: 'xterm-256color',
                cols,
                rows,
                env: { ...process.env, FORCE_COLOR: '1' }
            });
        }
        catch (err) {
            reject(err);
            return;
        }
        const frames = [];
        let rawText = '';
        const startedAt = Date.now();
        let finished = false;
        let lastWritePending = Promise.resolve();
        frames.push(snapshotFrame(term, themeName, 0));
        const sampleInterval = setInterval(() => {
            frames.push(snapshotFrame(term, themeName, Date.now() - startedAt));
        }, Math.max(1, Math.round(1000 / fps)));
        const maxDurationTimer = setTimeout(() => {
            if (finished)
                return;
            console.warn(`[ttyreel] Recording stopped at ${maxDurationMs / 1000}s limit — the command may still have been running.`);
            finish();
        }, maxDurationMs);
        function finish() {
            if (finished)
                return;
            finished = true;
            clearInterval(sampleInterval);
            clearTimeout(maxDurationTimer);
            // Wait for the last term.write() to flush into the buffer before
            // snapshotting — @xterm/headless's write() is asynchronous, so an
            // exit-triggered snapshot taken synchronously can race ahead of the
            // final chunk of output still being parsed into the buffer.
            lastWritePending.then(() => {
                frames.push(snapshotFrame(term, themeName, Date.now() - startedAt));
                try {
                    ptyProcess.kill();
                }
                catch {
                    // already exited — killing an exited process throws, that's fine
                }
                resolve({ frames, rawText });
            });
        }
        ptyProcess.onData((data) => {
            rawText += data;
            lastWritePending = new Promise((res) => {
                term.write(data, () => res());
            });
        });
        ptyProcess.onExit(() => {
            finish();
        });
    });
}
