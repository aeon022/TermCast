import * as pty from 'node-pty';
import * as fs from 'fs';
import * as path from 'path';
import { Terminal } from '@xterm/headless';
import { Cell, Frame, RecordOptions, RecordResult, ThemeName } from './types';
import { resolveColor } from './colorResolve';
import { THEMES } from './themes';

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const DEFAULT_FPS = 10;
const DEFAULT_MAX_DURATION_MS = 30000;

// npm can install node-pty's prebuilt spawn-helper without the execute bit, which makes every
// spawn fail with "posix_spawnp failed". Restore it before the first spawn (no-op elsewhere).
function ensureSpawnHelperExecutable(): void {
  if (process.platform === 'win32') return;
  try {
    const dir = path.join(path.dirname(require.resolve('node-pty/package.json')), 'prebuilds', `${process.platform}-${process.arch}`);
    const helper = path.join(dir, 'spawn-helper');
    if (fs.existsSync(helper) && (fs.statSync(helper).mode & 0o111) === 0) fs.chmodSync(helper, 0o755);
  } catch {
    // best effort: a source build or a read-only install keeps working or fails with the original error
  }
}

export function snapshotFrame(term: Terminal, themeName: ThemeName, timestampMs: number): Frame {
  const theme = THEMES[themeName] || THEMES.dracula;
  const buffer = term.buffer.active;
  const grid: Cell[][] = [];
  for (let y = 0; y < term.rows; y++) {
    const line = buffer.getLine(buffer.viewportY + y);
    const row: Cell[] = [];
    for (let x = 0; x < term.cols; x++) {
      const cell = line ? line.getCell(x) : undefined;
      if (!cell) {
        row.push({ char: ' ', fg: theme.foreground, bg: theme.background });
        continue;
      }
      const fg = resolveColor(cell.isFgRGB(), cell.isFgPalette(), cell.getFgColor(), theme, true);
      const bg = resolveColor(cell.isBgRGB(), cell.isBgPalette(), cell.getBgColor(), theme, false);
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

/** One command of a recorded session. */
export interface Step {
  cmd: string;
  /** typed instead of `cmd` (a demo can show a short command while running something else) */
  show?: string;
  /** show the prompt and type the command before running it (default: the session's `typing`) */
  type?: boolean;
  /** milliseconds to wait after the output before the next step */
  pause?: number;
}

export interface SessionOptions extends RecordOptions {
  typing?: boolean;
  /** milliseconds per typed character (default 45) */
  typeSpeedMs?: number;
  /** a prompt style (zsh, bash, starship, none) or a literal prompt string */
  prompt?: string;
}

const PROMPTS: Record<string, string> = {
  zsh: '\x1b[1;32m➜\x1b[0m  \x1b[36m~\x1b[0m ',
  bash: '\x1b[1;32muser@host\x1b[0m:\x1b[1;34m~\x1b[0m$ ',
  starship: '\x1b[1;34m~\x1b[0m \x1b[1;32m❯\x1b[0m ',
  none: ''
};

export function promptString(style: string | undefined): string {
  if (style === undefined) return PROMPTS.zsh;
  return Object.prototype.hasOwnProperty.call(PROMPTS, style) ? PROMPTS[style] : style;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Records a session of one or more commands in a single terminal: for every step the prompt and the typed
// command can be shown (typing simulated character by character), then the command runs in a
// pseudoterminal and its real output is added below. The terminal grid is sampled at a fixed rate
// (options.fps) into a Frame timeline. A frame is always captured at t=0, so a command that exits before
// the first sample tick still produces output. The whole session stops at options.maxDurationMs: the running
// process is killed and a warning is printed.
export function recordSession(steps: Step[], options: SessionOptions = {}): Promise<RecordResult> {
  const cols = options.cols || DEFAULT_COLS;
  const rows = options.rows || DEFAULT_ROWS;
  const fps = options.fps || DEFAULT_FPS;
  const maxDurationMs = options.maxDurationMs || DEFAULT_MAX_DURATION_MS;
  const themeName = options.theme || 'dracula';
  const typeSpeed = options.typeSpeedMs ?? 45;
  const prompt = promptString(options.prompt);

  return new Promise((resolve, reject) => {
    const term = new Terminal({ cols, rows, allowProposedApi: true });
    const frames: Frame[] = [];
    let rawText = '';
    const startedAt = Date.now();
    let current: pty.IPty | undefined;
    let lastWritePending: Promise<void> = Promise.resolve();
    let stopped = false;

    const snap = () => frames.push(snapshotFrame(term, themeName, Date.now() - startedAt));
    const write = (data: string) => {
      rawText += data;
      lastWritePending = new Promise((res) => term.write(data, () => res()));
    };

    snap();
    const sampleInterval = setInterval(snap, Math.max(1, Math.round(1000 / fps)));
    const limit = setTimeout(() => {
      if (stopped) return;
      stopped = true;
      console.warn(`[ttyreel] Recording stopped at ${maxDurationMs / 1000}s limit — the command may still have been running.`);
      try { current?.kill(); } catch { /* already gone */ }
    }, maxDurationMs);

    const run = async () => {
      for (let i = 0; i < steps.length && !stopped; i++) {
        const step = steps[i];
        const typed = step.type ?? options.typing ?? false;
        if (typed) {
          write(prompt);
          for (const ch of Array.from(step.show ?? step.cmd)) {
            if (stopped) break;
            write(ch);
            await sleep(typeSpeed ? typeSpeed + Math.round(Math.random() * typeSpeed * 0.4) : 0);
          }
          await sleep(typeSpeed ? 250 : 0);
          write('\r\n');
        }
        if (stopped) break;
        await new Promise<void>((done) => {
          const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/sh');
          const args = process.platform === 'win32' ? ['-Command', step.cmd] : ['-c', step.cmd];
          try {
            ensureSpawnHelperExecutable();
            current = pty.spawn(shell, args, { name: 'xterm-256color', cols, rows, env: { ...process.env, FORCE_COLOR: '1' } as { [key: string]: string } });
          } catch (err) {
            reject(err);
            stopped = true;
            return done();
          }
          current.onData(write);
          current.onExit(() => done());
        });
        await lastWritePending;
        if (step.pause && !stopped) await sleep(step.pause);
      }
    };

    run().then(async () => {
      stopped = true;
      clearInterval(sampleInterval);
      clearTimeout(limit);
      await lastWritePending;
      snap();
      try { current?.kill(); } catch { /* already exited */ }
      resolve({ frames, rawText });
    }, (err) => {
      clearInterval(sampleInterval);
      clearTimeout(limit);
      reject(err);
    });
  });
}

// Records one command (no prompt, no typing): the original single-command entry point.
export function recordCommand(cmdString: string, options: RecordOptions = {}): Promise<RecordResult> {
  return recordSession([{ cmd: cmdString }], { ...options, typing: false, prompt: 'none' });
}
