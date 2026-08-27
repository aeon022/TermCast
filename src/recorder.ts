import * as pty from 'node-pty';
import { Terminal } from '@xterm/headless';
import { Cell, Frame, RecordOptions, RecordResult, ThemeName } from './types';
import { resolveColor } from './colorResolve';
import { THEMES } from './themes';

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const DEFAULT_FPS = 10;
const DEFAULT_MAX_DURATION_MS = 30000;

function snapshotFrame(term: Terminal, themeName: ThemeName, timestampMs: number): Frame {
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

// Records the real-time output of cmdString in a pseudoterminal, sampling
// the terminal grid at a fixed rate (options.fps) into a Frame timeline.
// Always captures one immediate frame at t=0 in addition to the interval
// samples, so a command that exits before the first sample tick still
// produces real output instead of zero frames. Stops at whichever comes
// first: the process exiting, or options.maxDurationMs elapsing (in which
// case the process is killed and a warning is printed).
export function recordCommand(cmdString: string, options: RecordOptions = {}): Promise<RecordResult> {
  const cols = options.cols || DEFAULT_COLS;
  const rows = options.rows || DEFAULT_ROWS;
  const fps = options.fps || DEFAULT_FPS;
  const maxDurationMs = options.maxDurationMs || DEFAULT_MAX_DURATION_MS;
  const themeName = options.theme || 'dracula';

  return new Promise((resolve, reject) => {
    const term = new Terminal({ cols, rows, allowProposedApi: true });
    const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || '/bin/sh');
    const shellArgs = process.platform === 'win32' ? ['-Command', cmdString] : ['-c', cmdString];

    let ptyProcess: pty.IPty;
    try {
      ptyProcess = pty.spawn(shell, shellArgs, {
        name: 'xterm-256color',
        cols,
        rows,
        env: { ...process.env, FORCE_COLOR: '1' } as { [key: string]: string }
      });
    } catch (err) {
      reject(err);
      return;
    }

    const frames: Frame[] = [];
    let rawText = '';
    const startedAt = Date.now();
    let finished = false;
    let lastWritePending: Promise<void> = Promise.resolve();

    frames.push(snapshotFrame(term, themeName, 0));

    const sampleInterval = setInterval(() => {
      frames.push(snapshotFrame(term, themeName, Date.now() - startedAt));
    }, Math.max(1, Math.round(1000 / fps)));

    const maxDurationTimer = setTimeout(() => {
      if (finished) return;
      console.warn(`[TermCast] Recording stopped at ${maxDurationMs / 1000}s limit — the command may still have been running.`);
      finish();
    }, maxDurationMs);

    function finish(): void {
      if (finished) return;
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
        } catch {
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
