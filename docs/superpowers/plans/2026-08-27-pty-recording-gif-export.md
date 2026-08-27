# PTY Session Recording + GIF Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace TermCast's fake "record" (two static frames from `execSync`) with real PTY-based capture of a command's live output, and add the GIF export the product name and docs already promise but the code never implemented.

**Architecture:** `node-pty` spawns the given command in a real pseudoterminal; its output feeds an `@xterm/headless` `Terminal` instance (correct ANSI/VT parsing — 256-color, truecolor, cursor movement — for free, fixing the audit's parser-gap finding as a side effect). The terminal's cell grid is sampled at a fixed rate into a `Frame[]` timeline. SVG rendering reads resolved per-cell colors directly from the grid; GIF export rasterizes each frame's SVG via `@resvg/resvg-js` and assembles the PNG sequence via `gifenc`.

**Tech Stack:** TypeScript (existing `tsc` build, `strict: true`), `node-pty` ^1.1.0, `@xterm/headless` ^6.0.0, `@resvg/resvg-js` ^2.6.2, `gifenc` ^1.0.3 (no type declarations — needs a local ambient module shim). Tests use Node's built-in `node:test` + `node:assert/strict`, run against the compiled `dist/` output (`node --test dist`) — no new test-runner dependency.

**Spec:** `docs/superpowers/specs/2026-08-27-pty-recording-gif-export-design.md`

## Global Constraints

- Recording mode is "one command, real timing" only — no interactive live-typed session recording (explicitly out of scope, see spec).
- Frame sampling is rate-limited (`--fps`, default 10) and time-bounded (`--max-duration`, default 30s) — never unbounded.
- A frame is always captured at t=0 in addition to interval samples, so a fast-exiting command still produces real output.
- `demo` command stays exactly as-is (synthetic `TerminalFrame[]`, existing `renderSvgFrame` text-based path) — not touched by this plan.
- HTML output (`--format html`) stays on the existing text-based `renderHtmlEmbed` path for this plan — `recordCommand` returns the accumulated raw PTY text alongside the frame timeline specifically so HTML output keeps working unchanged. A grid-based HTML rewrite is out of scope here.
- `node-pty` requires native compilation — this is an accepted, unavoidable constraint of real PTY capture (see spec), not something to work around in this plan.

---

## Task 1: Dependencies, Cell/Frame types, gifenc type shim, color resolution

**Files:**
- Modify: `package.json` (add 4 dependencies)
- Modify: `src/types.ts`
- Create: `src/gifenc.d.ts`
- Create: `src/colorResolve.ts`
- Test: `src/colorResolve.test.ts`

**Interfaces:**
- Produces: `Cell`, `Frame`, `RecordOptions`, `RecordResult` (in `types.ts`); `resolveColor(isRGB: boolean, isPalette: boolean, value: number, theme: ThemeColors, isForeground: boolean): string` (in `colorResolve.ts`) — Task 2 (recorder) and Task 3 (renderer, indirectly via already-resolved cells) depend on these.

- [ ] **Step 1: Add the four dependencies**

Run: `npm install node-pty@^1.1.0 @xterm/headless@^6.0.0 @resvg/resvg-js@^2.6.2 gifenc@^1.0.3`
Expected: `package.json`/`package-lock.json` updated, `npm install` completes without native-build errors on this machine (already verified during design — if it fails on a different machine, that's the accepted `node-pty` native-compile constraint, not a bug in this step).

- [ ] **Step 2: Add the gifenc ambient module type shim**

`gifenc` ships no TypeScript types. Create `src/gifenc.d.ts`:

```ts
declare module 'gifenc' {
  export interface GIFEncoderOptions {
    initialCapacity?: number;
    auto?: boolean;
  }
  export interface WriteFrameOptions {
    transparent?: boolean;
    transparentIndex?: number;
    delay?: number;
    palette?: number[][] | null;
    repeat?: number;
    colorDepth?: number;
    dispose?: number;
    first?: boolean;
  }
  export interface GIFEncoderInstance {
    reset(): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
    writeFrame(index: Uint8Array, width: number, height: number, opts?: WriteFrameOptions): void;
  }
  export function GIFEncoder(opts?: GIFEncoderOptions): GIFEncoderInstance;
  export function quantize(rgba: Uint8Array, maxColors: number, opts?: Record<string, unknown>): number[][];
  export function applyPalette(rgba: Uint8Array, palette: number[][], format?: string): Uint8Array;
}
```

- [ ] **Step 3: Add Cell/Frame/RecordOptions/RecordResult to types.ts**

Add to `src/types.ts` (keep the existing `TerminalFrame`/`RenderOptions` — `TerminalFrame` is still used by `demo`):

```ts
export interface Cell {
  char: string;
  fg: string;
  bg: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface Frame {
  grid: Cell[][];
  cursorX: number;
  cursorY: number;
  cursorVisible: boolean;
  timestampMs: number;
}

export interface RecordOptions {
  cols?: number;
  rows?: number;
  fps?: number;
  maxDurationMs?: number;
  theme?: ThemeName;
}

export interface RecordResult {
  frames: Frame[];
  rawText: string;
}
```

Also add `'gif'` to `RenderOptions.format`'s union type — change:
```ts
  format?: 'svg' | 'html' | 'both';
```
to:
```ts
  format?: 'svg' | 'html' | 'gif' | 'both';
```

- [ ] **Step 4: Write the failing test for resolveColor**

Create `src/colorResolve.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveColor } from './colorResolve';
import { THEMES } from './themes';

const theme = THEMES.dracula;

test('resolveColor: RGB mode returns the exact hex color', () => {
  const hex = resolveColor(true, false, 0xff00aa, theme, true);
  assert.equal(hex, '#ff00aa');
});

test('resolveColor: default mode returns theme foreground/background', () => {
  assert.equal(resolveColor(false, false, 0, theme, true), theme.foreground);
  assert.equal(resolveColor(false, false, 0, theme, false), theme.background);
});

test('resolveColor: palette 0-7 maps to the theme\'s 8 base colors', () => {
  assert.equal(resolveColor(false, true, 1, theme, true), theme.colors.red);
  assert.equal(resolveColor(false, true, 2, theme, true), theme.colors.green);
});

test('resolveColor: palette 8-15 (bright) falls back to the same base 8', () => {
  assert.equal(resolveColor(false, true, 9, theme, true), theme.colors.red);
});

test('resolveColor: palette 16-231 resolves the xterm 6x6x6 color cube', () => {
  // Index 16 is the cube's (0,0,0) corner -> pure black
  assert.equal(resolveColor(false, true, 16, theme, true), '#000000');
  // Index 21 is (0,0,5) -> pure blue at the cube's max step (255)
  assert.equal(resolveColor(false, true, 21, theme, true), '#0000ff');
});

test('resolveColor: palette 232-255 resolves the grayscale ramp', () => {
  // Index 232 is the ramp's first step: gray = 8
  assert.equal(resolveColor(false, true, 232, theme, true), '#080808');
});
```

- [ ] **Step 5: Run to confirm it fails**

Run: `npm run build`
Expected: FAIL — `Cannot find module './colorResolve'` (the module doesn't exist yet).

- [ ] **Step 6: Implement colorResolve.ts**

Create `src/colorResolve.ts`:

```ts
import { ThemeColors } from './types';

// Standard xterm 256-color palette: indices 16-231 are a 6x6x6 RGB cube,
// 232-255 are a 24-step grayscale ramp. This fixed mapping is the same
// one every terminal emulator uses for palette colors beyond the 16 basic
// ANSI ones (0-15).
const CUBE_STEPS = [0, 95, 135, 175, 215, 255];

function cube256ToHex(index: number): string {
  if (index >= 232) {
    const gray = 8 + (index - 232) * 10;
    const hex = gray.toString(16).padStart(2, '0');
    return `#${hex}${hex}${hex}`;
  }
  const i = index - 16;
  const r = CUBE_STEPS[Math.floor(i / 36) % 6];
  const g = CUBE_STEPS[Math.floor(i / 6) % 6];
  const b = CUBE_STEPS[i % 6];
  return `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`;
}

const PALETTE_KEYS: (keyof ThemeColors['colors'])[] = [
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'
];

// Resolves one xterm cell's foreground/background color to a hex string.
// xterm reports color mode via isRGB/isPalette booleans rather than a
// single mode number (see @xterm/headless's IBufferCell docs) — neither
// true means "default", i.e. the theme's own foreground/background.
export function resolveColor(
  isRGB: boolean,
  isPalette: boolean,
  value: number,
  theme: ThemeColors,
  isForeground: boolean
): string {
  if (isRGB) {
    return `#${value.toString(16).padStart(6, '0')}`;
  }
  if (isPalette) {
    if (value < 8) {
      return theme.colors[PALETTE_KEYS[value]];
    }
    if (value < 16) {
      // ponytail: no distinct bright-color variants defined per theme;
      // reusing the base 8 is visually close enough for a banner tool.
      // Add a `brightColors` set per theme if a real recording needs to
      // tell bold-bright apart from normal-intensity colors.
      return theme.colors[PALETTE_KEYS[value - 8]];
    }
    return cube256ToHex(value);
  }
  return isForeground ? theme.foreground : theme.background;
}
```

- [ ] **Step 7: Build and run the test to confirm it passes**

Run: `npm run build && node --test dist/colorResolve.test.js`
Expected: all 6 tests pass.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/gifenc.d.ts src/types.ts src/colorResolve.ts src/colorResolve.test.ts
git commit -m "feat: add recording/GIF dependencies, Frame types, xterm color resolution"
```

---

## Task 2: `src/recorder.ts` — real PTY-based recording

**Files:**
- Create: `src/recorder.ts`
- Test: `src/recorder.test.ts`

**Interfaces:**
- Consumes: `Cell`, `Frame`, `RecordOptions`, `RecordResult` (Task 1, `types.ts`); `resolveColor` (Task 1, `colorResolve.ts`); `THEMES` (existing, `themes.ts`).
- Produces: `recordCommand(cmdString: string, options?: RecordOptions): Promise<RecordResult>` — Task 6 (`index.ts`) calls this.

- [ ] **Step 1: Write the failing test**

Create `src/recorder.test.ts` — this is an integration-style test that spawns a real process; it is deliberately not mocked, since the risk being tested (recording silently failing to capture output) is exactly what a mock would hide:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recordCommand } from './recorder';

test('recordCommand captures real output from a spawned command', async () => {
  const result = await recordCommand('echo hello-termcast', {
    cols: 40,
    rows: 5,
    fps: 20,
    maxDurationMs: 5000
  });

  assert.ok(result.frames.length >= 1, 'expected at least one frame');
  const lastFrame = result.frames[result.frames.length - 1];
  const lineText = lastFrame.grid.map(row => row.map(c => c.char).join('')).join('\n');
  assert.match(lineText, /hello-termcast/, 'expected the echoed text to appear in the captured grid');
  assert.match(result.rawText, /hello-termcast/, 'expected the raw text accumulator to contain the echoed text');
});

test('recordCommand always captures a t=0 frame even for a fast command', async () => {
  const result = await recordCommand('true', { cols: 20, rows: 3, fps: 10, maxDurationMs: 2000 });
  assert.ok(result.frames.length >= 1);
  assert.equal(result.frames[0].timestampMs, 0);
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npm run build`
Expected: FAIL — `Cannot find module './recorder'`.

- [ ] **Step 3: Implement recorder.ts**

Create `src/recorder.ts`:

```ts
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
      frames.push(snapshotFrame(term, themeName, Date.now() - startedAt));
      try {
        ptyProcess.kill();
      } catch {
        // already exited — killing an exited process throws, that's fine
      }
      resolve({ frames, rawText });
    }

    ptyProcess.onData((data) => {
      rawText += data;
      term.write(data);
    });

    ptyProcess.onExit(() => {
      finish();
    });
  });
}
```

- [ ] **Step 4: Run to confirm it passes**

Run: `npm run build && node --test dist/recorder.test.js`
Expected: both tests pass. (This spawns a real `/bin/sh` process — if run in a sandboxed environment without shell access, this test will fail for environmental reasons, not a code defect; note that explicitly if it happens rather than silently working around it.)

- [ ] **Step 5: Commit**

```bash
git add src/recorder.ts src/recorder.test.ts
git commit -m "feat: real PTY-based command recording via node-pty + xterm-headless"
```

---

## Task 3: Grid-driven SVG rendering (static + animated)

**Files:**
- Modify: `src/renderer/svg.ts`
- Test: `src/renderer/svg.test.ts` (new)

**Interfaces:**
- Consumes: `Frame`, `Cell`, `RenderOptions` (Task 1, `types.ts`); `THEMES`, `GRADIENTS` (existing, `themes.ts`); `escapeXml` (existing, `parser.ts`).
- Produces: `renderGridFrame(frame: Frame, options?: RenderOptions): string`; `renderAnimatedGridFrames(frames: Frame[], options?: RenderOptions): string` — Task 4 (`gif.ts`) and Task 6 (`index.ts`) both call these.

This task adds two new exported functions to the existing `src/renderer/svg.ts` file alongside the current `renderSvgFrame` (which stays untouched — `demo` still uses it). Both new functions share a private `buildChrome` helper for the window/title-bar/background markup so the static and animated paths don't duplicate that structure.

- [ ] **Step 1: Write the failing tests**

Create `src/renderer/svg.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderGridFrame, renderAnimatedGridFrames } from './svg';
import { Frame } from '../types';

function makeFrame(text: string, timestampMs = 0): Frame {
  const grid = [
    text.split('').map(ch => ({ char: ch, fg: '#f8f8f2', bg: '#282a36' }))
  ];
  return { grid, cursorX: text.length, cursorY: 0, cursorVisible: true, timestampMs };
}

test('renderGridFrame includes the frame\'s text and resolved color', () => {
  const svg = renderGridFrame(makeFrame('hi'), { watermark: false });
  assert.match(svg, /hi/);
  assert.match(svg, /#f8f8f2/);
  assert.match(svg, /<svg/);
});

test('renderGridFrame escapes XML-unsafe characters', () => {
  const svg = renderGridFrame(makeFrame('<>&'), { watermark: false });
  assert.doesNotMatch(svg, /<>&/);
  assert.match(svg, /&lt;/);
});

test('renderAnimatedGridFrames with one frame falls back to a static render', () => {
  const svg = renderAnimatedGridFrames([makeFrame('only', 0)], { watermark: false });
  assert.match(svg, /only/);
});

test('renderAnimatedGridFrames with multiple frames includes a keyframe per frame', () => {
  const svg = renderAnimatedGridFrames([makeFrame('a', 0), makeFrame('b', 100)], { watermark: false });
  assert.match(svg, /a/);
  assert.match(svg, /b/);
  assert.match(svg, /@keyframes frame-0/);
  assert.match(svg, /@keyframes frame-1/);
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npm run build`
Expected: FAIL — `renderGridFrame`/`renderAnimatedGridFrames` are not exported from `./svg` yet.

- [ ] **Step 3: Implement the additions to svg.ts**

Add to `src/renderer/svg.ts` (keep everything already in the file — these are additions, not replacements). Add these imports at the top alongside the existing ones:

```ts
import { Frame, Cell } from '../types';
```

Then append to the end of the file:

```ts
function cellsToTspans(row: Cell[]): string {
  let out = '';
  let i = 0;
  while (i < row.length) {
    const cell = row[i];
    let text = cell.char;
    let j = i + 1;
    while (
      j < row.length &&
      row[j].fg === cell.fg &&
      row[j].bg === cell.bg &&
      !!row[j].bold === !!cell.bold &&
      !!row[j].italic === !!cell.italic &&
      !!row[j].underline === !!cell.underline
    ) {
      text += row[j].char;
      j++;
    }
    const styleAttrs = [
      `fill="${cell.fg}"`,
      cell.bold ? 'font-weight="bold"' : '',
      cell.italic ? 'font-style="italic"' : '',
      cell.underline ? 'text-decoration="underline"' : ''
    ].filter(Boolean).join(' ');
    out += `<tspan ${styleAttrs}>${escapeXml(text)}</tspan>`;
    i = j;
  }
  return out;
}

interface ChromeGeometry {
  width: number;
  height: number;
  termX: number;
  termY: number;
  termW: number;
  termH: number;
  titleBarHeight: number;
  fontSize: number;
  lineHeight: number;
}

function computeChromeGeometry(cols: number, rows: number, options: RenderOptions, showWatermark: boolean): ChromeGeometry {
  const fontSize = options.fontSize || 14;
  const lineHeight = Math.round(fontSize * 1.45);
  const padding = options.padding || 35;
  const titleBarHeight = 36;
  const charWidth = fontSize * 0.62;

  const contentWidth = Math.max(680, cols * charWidth);
  const width = Math.round(contentWidth + padding * 2);
  const terminalBodyHeight = (rows * lineHeight) + 30;
  const termH = titleBarHeight + terminalBodyHeight;
  const height = Math.round(termH + padding * 2 + (showWatermark ? 25 : 0));

  return {
    width, height,
    termX: padding, termY: padding, termW: width - padding * 2, termH,
    titleBarHeight, fontSize, lineHeight
  };
}

// Renders the window chrome (background gradient, title bar, traffic-light
// dots, watermark) shared by both the static and animated grid renderers.
// bodyContent is the already-built <g>...</g> markup for the terminal text;
// extraStyles is an optional <style> block (used by the animated renderer
// for its per-frame @keyframes).
function buildChrome(
  geom: ChromeGeometry,
  options: RenderOptions,
  bodyContent: string,
  extraStyles: string,
  showWatermark: boolean
): string {
  const themeName = (options.theme || 'dracula') as ThemeName;
  const theme = THEMES[themeName] || THEMES.dracula;
  const gradientCss = options.gradient ? (GRADIENTS[options.gradient] || GRADIENTS.default) : theme.gradientBackground;
  const windowTitle = options.title || 'termcast — zsh';
  const { width, height, termX, termY, termW, termH, titleBarHeight } = geom;

  const gradMatch = gradientCss.match(/linear-gradient\([^,]+,\s*([^0-9]+)[0-9]+%\s*,\s*([^0-9]+)[0-9]+%\)/);
  const stop1 = gradMatch ? gradMatch[1].trim() : theme.colors.blue;
  const stop2 = gradMatch ? gradMatch[2].trim() : theme.colors.magenta;

  const watermarkSvg = showWatermark ? `
    <g transform="translate(${width - 210}, ${height - 15})">
      <text font-family="-apple-system, system-ui, sans-serif" font-size="11px" fill="#888888">
        Crafted with <tspan fill="#0066FF" font-weight="bold">TermCast</tspan>
      </text>
    </g>
  ` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${stop1}"/>
      <stop offset="100%" stop-color="${stop2}"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>
  ${extraStyles}
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" rx="12"/>
  <g filter="url(#shadow)">
    <rect x="${termX}" y="${termY}" width="${termW}" height="${termH}" rx="10" fill="${theme.background}"/>
    <path d="M${termX} ${termY + 10} C${termX} ${termY + 4} ${termX + 4} ${termY} ${termX + 10} ${termY} L${termX + termW - 10} ${termY} C${termX + termW - 4} ${termY} ${termX + termW} ${termY + 4} ${termX + termW} ${termY + 10} L${termX + termW} ${termY + titleBarHeight} L${termX} ${termY + titleBarHeight} Z" fill="${theme.titleBar}"/>
    <circle cx="${termX + 18}" cy="${termY + 18}" r="6" fill="#FF5F56"/>
    <circle cx="${termX + 38}" cy="${termY + 18}" r="6" fill="#FFBD2E"/>
    <circle cx="${termX + 58}" cy="${termY + 18}" r="6" fill="#27C93F"/>
    <text x="${termX + termW / 2}" y="${termY + 22}" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif" font-size="12px" font-weight="600" fill="${theme.foreground}" opacity="0.75">${escapeXml(windowTitle)}</text>
  </g>
  <g xml:space="preserve">
${bodyContent}  </g>
  ${watermarkSvg}
</svg>`;
}

function renderFrameLines(frame: Frame, geom: ChromeGeometry): string {
  let lines = '';
  frame.grid.forEach((row, index) => {
    const yPos = geom.termY + geom.titleBarHeight + 24 + (index * geom.lineHeight);
    lines += `    <text x="${geom.termX + 20}" y="${yPos}" font-family="Menlo, Monaco, 'Courier New', monospace" font-size="${geom.fontSize}px">${cellsToTspans(row)}</text>\n`;
  });
  return lines;
}

// Renders a single Frame (by default the last one in a recording) as a
// static SVG — this is the grid-driven equivalent of the existing
// text-based renderSvgFrame, used for real recordings instead of demo's
// synthetic TerminalFrame text.
export function renderGridFrame(frame: Frame, options: RenderOptions = {}): string {
  const showWatermark = options.watermark !== false;
  const cols = frame.grid[0]?.length || 80;
  const rows = frame.grid.length;
  const geom = computeChromeGeometry(cols, rows, options, showWatermark);
  const body = renderFrameLines(frame, geom);
  return buildChrome(geom, options, body, '', showWatermark);
}

// Renders every frame in a recording as a single animated SVG: each frame
// is a <g> shown only during its real captured time window (CSS step
// keyframes keyed to the frame's timestamp as a % of total duration), so
// playback matches the actual recording instead of simulating typing over
// static final output.
export function renderAnimatedGridFrames(frames: Frame[], options: RenderOptions = {}): string {
  if (frames.length === 0) {
    throw new Error('renderAnimatedGridFrames requires at least one frame');
  }
  if (frames.length === 1) {
    return renderGridFrame(frames[0], options);
  }

  const showWatermark = options.watermark !== false;
  const cols = frames[0].grid[0]?.length || 80;
  const rows = frames[0].grid.length;
  const geom = computeChromeGeometry(cols, rows, options, showWatermark);
  const totalDurationMs = Math.max(1, frames[frames.length - 1].timestampMs);

  let framesBody = '';
  let styles = `<style>.rec-frame { opacity: 0; animation-duration: ${totalDurationMs}ms; animation-iteration-count: infinite; animation-timing-function: steps(1, end); }</style>\n`;

  frames.forEach((frame, i) => {
    const startPct = (frame.timestampMs / totalDurationMs) * 100;
    const nextTimestamp = i < frames.length - 1 ? frames[i + 1].timestampMs : totalDurationMs;
    const endPct = Math.min(100, (nextTimestamp / totalDurationMs) * 100);
    const lines = renderFrameLines(frame, geom);
    framesBody += `    <g class="rec-frame" style="animation-name: frame-${i};">\n${lines}    </g>\n`;
    styles += `<style>@keyframes frame-${i} { 0% { opacity: 0; } ${startPct.toFixed(3)}% { opacity: 1; } ${endPct.toFixed(3)}% { opacity: 0; } 100% { opacity: 0; } }</style>\n`;
  });

  return buildChrome(geom, options, framesBody, styles, showWatermark);
}
```

- [ ] **Step 4: Run to confirm the tests pass**

Run: `npm run build && node --test dist/renderer/svg.test.js`
Expected: all 4 tests pass.

- [ ] **Step 5: Run the full test suite so far**

Run: `npm run build && node --test dist`
Expected: all tests from Tasks 1-3 pass.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/svg.ts src/renderer/svg.test.ts
git commit -m "feat: grid-driven static and animated SVG rendering from real recordings"
```

---

## Task 4: `src/gif.ts` — GIF export

**Files:**
- Create: `src/gif.ts`
- Test: `src/gif.test.ts`

**Interfaces:**
- Consumes: `renderGridFrame` (Task 3, `renderer/svg.ts`); `Frame`, `RenderOptions` (Task 1, `types.ts`); `GIFEncoder`, `quantize`, `applyPalette` (via the Task 1 `gifenc.d.ts` shim); `Resvg` (from `@resvg/resvg-js`).
- Produces: `encodeGif(frames: Frame[], options: RenderOptions, fps: number): Promise<Buffer>` — Task 6 (`index.ts`) calls this.

- [ ] **Step 1: Write the failing test**

Create `src/gif.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeGif } from './gif';
import { Frame } from './types';

function makeFrame(text: string, timestampMs: number): Frame {
  const grid = [
    text.split('').map(ch => ({ char: ch, fg: '#f8f8f2', bg: '#282a36' }))
  ];
  return { grid, cursorX: text.length, cursorY: 0, cursorVisible: true, timestampMs };
}

test('encodeGif produces a non-empty buffer with a valid GIF header', async () => {
  const frames = [makeFrame('a', 0), makeFrame('b', 100)];
  const buffer = await encodeGif(frames, { watermark: false }, 10);
  assert.ok(buffer.length > 0);
  assert.equal(buffer.subarray(0, 6).toString('ascii'), 'GIF89a');
});

test('encodeGif rejects an empty frame list', async () => {
  await assert.rejects(() => encodeGif([], { watermark: false }, 10));
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npm run build`
Expected: FAIL — `Cannot find module './gif'`.

- [ ] **Step 3: Implement gif.ts**

Create `src/gif.ts`:

```ts
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { Resvg } from '@resvg/resvg-js';
import { renderGridFrame } from './renderer/svg';
import { Frame, RenderOptions } from './types';

// Renders each frame to SVG, rasterizes it via resvg (no system
// dependencies beyond what npm already installs), and assembles the PNG
// sequence into an animated GIF. fps determines each GIF frame's playback
// delay (should match the rate frames were sampled at during recording).
export async function encodeGif(frames: Frame[], options: RenderOptions, fps: number): Promise<Buffer> {
  if (frames.length === 0) {
    throw new Error('encodeGif requires at least one frame');
  }

  const encoder = GIFEncoder();
  const delay = Math.round(1000 / fps);

  for (let i = 0; i < frames.length; i++) {
    const svg = renderGridFrame(frames[i], options);
    const resvg = new Resvg(svg, { font: { loadSystemFonts: true } });
    const rendered = resvg.render();
    const { pixels, width, height } = rendered;

    const palette = quantize(pixels, 256);
    const indexed = applyPalette(pixels, palette);

    encoder.writeFrame(indexed, width, height, { palette, delay, first: i === 0 });
  }

  encoder.finish();
  return Buffer.from(encoder.bytes());
}
```

- [ ] **Step 4: Run to confirm it passes**

Run: `npm run build && node --test dist/gif.test.js`
Expected: both tests pass.

- [ ] **Step 5: Run the full test suite so far**

Run: `npm run build && node --test dist`
Expected: all tests from Tasks 1-4 pass.

- [ ] **Step 6: Commit**

```bash
git add src/gif.ts src/gif.test.ts
git commit -m "feat: SVG->PNG->GIF export pipeline via resvg-js and gifenc"
```

---

## Task 5: `src/server.ts` — accept a pre-rendered SVG string

**Files:**
- Modify: `src/server.ts`

**Interfaces:**
- Consumes: nothing new — this is a signature simplification.
- Produces: `startPreviewServer(svg: string, port?: number): void` (was `startPreviewServer(frames: TerminalFrame[], options: RenderOptions, port: number): void`) — Task 6 (`index.ts`) calls this with the new signature.

`server.ts` currently renders `TerminalFrame[]` via the old text-based `renderSvgFrame` internally. Since `serve` (Task 6) will now render the SVG itself (static or animated, from real `Frame[]`) before calling the server, `server.ts` no longer needs to know about frame types at all — it just serves whatever SVG string it's given. This is a pure simplification, not a behavior change for the HTTP server itself.

- [ ] **Step 1: Replace server.ts's contents**

Replace the full contents of `src/server.ts`:

```ts
import * as http from 'http';
import { exec } from 'child_process';

export function startPreviewServer(svg: string, port: number = 3333): void {
  const server = http.createServer((req, res) => {
    if (req.url === '/favicon.ico') {
      res.writeHead(404);
      res.end();
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-cache'
    });
    res.end(svg);
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`\n🚀 TermCast Live Preview running at: ${url}`);
    console.log('   (Press Ctrl+C to stop preview server)\n');

    const startCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${startCmd} ${url}`);
  });
}
```

- [ ] **Step 2: Build to confirm it compiles**

Run: `npm run build`
Expected: this step alone will FAIL to build cleanly, because `src/index.ts`'s `serve` command still calls `startPreviewServer` with the old 3-argument signature. That's expected — Task 6 fixes the call site. Confirm the error is specifically about `index.ts`'s call to `startPreviewServer`, not something else, then proceed to Task 6 without trying to make this task's build pass in isolation.

- [ ] **Step 3: Commit**

```bash
git add src/server.ts
git commit -m "refactor: startPreviewServer takes a pre-rendered SVG string instead of frames+options"
```

---

## Task 6: Wire `render`/`serve` to the real recorder, new CLI flags, GIF output

**Files:**
- Modify: `src/index.ts`

**Interfaces:**
- Consumes: `recordCommand` (Task 2); `renderGridFrame`, `renderAnimatedGridFrames` (Task 3); `encodeGif` (Task 4); `startPreviewServer(svg, port)` (Task 5).
- Produces: the updated `render`/`serve` CLI commands — this is the final integration task, nothing downstream depends on it.

This task replaces the `execSync`-based capture in `render` and `serve` with real recording, adds `--fps`/`--max-duration`/`--cols`/`--rows` flags, adds `gif` as a valid `--format` value, and upgrades `--animated` to play back real frames. The `license` and `demo` commands are untouched.

- [ ] **Step 1: Update imports**

At the top of `src/index.ts`, replace:
```ts
import { renderSvgFrame } from './renderer/svg';
```
with:
```ts
import { renderSvgFrame, renderGridFrame, renderAnimatedGridFrames } from './renderer/svg';
```
and add two new imports:
```ts
import { recordCommand } from './recorder';
import { encodeGif } from './gif';
```

After Steps 2-3 below remove every `execSync` call from `render`/`serve`, the top-level `import { execSync } from 'child_process';` becomes unused (nothing else in this file calls it). Remove that import line too — leave no dead import behind.

- [ ] **Step 2: Replace the `render` command**

Replace the entire `render` command block (from `// Render Command` through its closing `});`) with:

```ts
// Render Command
program
  .command('render <cmd>')
  .description('Run a command and record its real terminal output as SVG, GIF, or HTML')
  .option('-t, --theme <name>', 'Theme: dracula, tokyonight, nord, catppuccin, monokai', 'dracula')
  .option('-g, --gradient <name>', 'Gradient: default, cyberpunk, sunset, matrix, hyper, neon, midnight', 'cyberpunk')
  .option('-o, --output <path>', 'Output filepath', 'terminal-output')
  .option('--title <title>', 'Window title bar text', 'termcast — zsh')
  .option('--animated', 'Play back the real recorded frames as an animated SVG')
  .option('--prompt <style>', 'Prompt style: zsh, starship, bash, none', 'zsh')
  .option('--format <type>', 'Output format: svg, html, gif, both', 'svg')
  .option('--fps <n>', 'Frames sampled per second while recording', '10')
  .option('--max-duration <seconds>', 'Stop recording after this many seconds', '30')
  .option('--cols <n>', 'Terminal columns to record at', String(process.stdout.columns || 80))
  .option('--rows <n>', 'Terminal rows to record at', String(process.stdout.rows || 24))
  .option('-l, --license <key>', 'Polar.sh Pro License Key')
  .action(async (cmdString, options) => {
    try {
      const licenseCheck = await validatePolarLicense(options.license);
      console.log(`[TermCast] License Status: ${licenseCheck.message}`);
      console.log(`[TermCast] Recording: "${cmdString}"...`);

      const fps = parseInt(options.fps, 10) || 10;
      const cols = parseInt(options.cols, 10) || 80;
      const rows = parseInt(options.rows, 10) || 24;
      const maxDurationMs = (parseInt(options.maxDuration, 10) || 30) * 1000;

      const { frames, rawText } = await recordCommand(cmdString, {
        cols, rows, fps, maxDurationMs, theme: options.theme as ThemeName
      });

      const renderOpts: RenderOptions = {
        theme: options.theme as ThemeName,
        gradient: options.gradient as GradientPreset,
        title: options.title || `zsh — ${cmdString}`,
        watermark: !licenseCheck.valid,
        prompt: options.prompt as PromptStyle
      };

      const format = options.format || 'svg';
      const baseOutput = options.output.replace(/\.(svg|html|gif)$/, '');

      if (format === 'svg' || format === 'both') {
        const svgContent = options.animated
          ? renderAnimatedGridFrames(frames, renderOpts)
          : renderGridFrame(frames[frames.length - 1], renderOpts);
        const svgPath = path.resolve(`${baseOutput}.svg`);
        await fs.writeFile(svgPath, svgContent, 'utf8');
        console.log(`  ✨ Created SVG: ${svgPath}`);
      }

      if (format === 'html' || format === 'both') {
        // HTML output stays on the original text-based renderer for now —
        // recordCommand's rawText accumulator exists specifically so this
        // path keeps working unchanged (see plan Global Constraints).
        const htmlContent = renderHtmlEmbed(
          [{ text: rawText, delayMs: 0 }],
          renderOpts
        );
        const htmlPath = path.resolve(`${baseOutput}.html`);
        await fs.writeFile(htmlPath, htmlContent, 'utf8');
        console.log(`  ✨ Created HTML Embed: ${htmlPath}`);
      }

      if (format === 'gif') {
        const gifBuffer = await encodeGif(frames, renderOpts, fps);
        const gifPath = path.resolve(`${baseOutput}.gif`);
        await fs.writeFile(gifPath, gifBuffer);
        console.log(`  ✨ Created GIF: ${gifPath}`);
      }

      console.log('\n[TermCast] Recording finished successfully.\n');
      if (!licenseCheck.valid) {
        console.log('💡 Remove watermark & unlock custom gradients: https://buy.polar.sh/polar_cl_BN6xwyJH2Drn6WuzvV49E2KCGauvtoTHixD3w1hCpSH');
      }
    } catch (err: any) {
      console.error(`[TermCast] Error: ${err.message}`);
    }
  });
```

- [ ] **Step 3: Replace the `serve` command**

Replace the entire `serve` command block (from `// Serve (Preview) Command` through its closing `});`) with:

```ts
// Serve (Preview) Command
program
  .command('serve <cmd>')
  .description('Record a command and launch an instant live web preview in the browser')
  .option('-t, --theme <name>', 'Theme: dracula, tokyonight, nord, catppuccin, monokai', 'dracula')
  .option('-g, --gradient <name>', 'Gradient: default, cyberpunk, sunset, matrix, hyper, neon, midnight', 'cyberpunk')
  .option('--prompt <style>', 'Prompt style: zsh, starship, bash, none', 'zsh')
  .option('--animated', 'Play back the real recorded frames as an animated SVG')
  .action(async (cmdString, options) => {
    try {
      console.log(`[TermCast] Recording: "${cmdString}" for live preview...`);

      const cols = process.stdout.columns || 80;
      const rows = process.stdout.rows || 24;
      const { frames } = await recordCommand(cmdString, {
        cols, rows, fps: 10, maxDurationMs: 30000, theme: options.theme as ThemeName
      });

      const renderOpts: RenderOptions = {
        theme: options.theme as ThemeName,
        gradient: options.gradient as GradientPreset,
        title: `zsh — ${cmdString}`,
        prompt: options.prompt as PromptStyle
      };

      const svg = options.animated
        ? renderAnimatedGridFrames(frames, renderOpts)
        : renderGridFrame(frames[frames.length - 1], renderOpts);

      startPreviewServer(svg, 3333);
    } catch (err: any) {
      console.error(`[TermCast] Preview Error: ${err.message}`);
    }
  });
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: succeeds with no errors — this resolves the Task 5 build failure too, since `startPreviewServer` is now called with the new signature.

- [ ] **Step 5: Run the full test suite**

Run: `npm run build && node --test dist`
Expected: all tests from Tasks 1-4 still pass (this task has no new automated tests — it's CLI wiring, verified manually next).

- [ ] **Step 6: Manual smoke test**

Run each of these against the built CLI and confirm no crash and a real, non-trivial output file is produced (not just the two old static lines):

```bash
node dist/index.js render "echo hello world" --format svg -o /tmp/termcast-smoke
node dist/index.js render "echo hello world" --format gif -o /tmp/termcast-smoke --fps 5
node dist/index.js render "echo hello world" --format svg --animated -o /tmp/termcast-smoke-anim
```

Expected: `/tmp/termcast-smoke.svg` and `/tmp/termcast-smoke.gif` exist and are non-trivially sized (the GIF should open in an image viewer as a valid, if simple, animated GIF); `/tmp/termcast-smoke-anim.svg` contains multiple `@keyframes frame-N` blocks. Report the actual file sizes and confirm visually if possible — if you cannot visually confirm (headless environment), say so explicitly rather than claiming full verification.

- [ ] **Step 7: Commit**

```bash
git add src/index.ts
git commit -m "feat: wire render/serve to real recording, add GIF export and fps/duration/size flags"
```
