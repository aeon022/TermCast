# Real session recording + GIF export

Status: approved design, not yet implemented.
Date: 2026-08-27

## Problem

ttyreel's `README.md`/`package.json` describe it as a "Terminal SVG & GIF
Studio" that records sessions. Neither claim is true today:

- `render`/`serve` run the given command once via `execSync` and produce
  exactly two static `TerminalFrame`s (`{command}` and `{full stdout}`) —
  there is no real-time capture, no timing, no intermediate output.
- There is no GIF encoder anywhere in the codebase. `--format gif` doesn't
  exist as an option.
- The ANSI parser (`src/parser.ts`) only understands legacy 8/16-color SGR
  codes and bold — no 256-color, no truecolor, no cursor movement. Real
  colorful CLI output (linters, progress bars, `git status`) renders wrong.

Goal: make session recording and GIF export real, and fix the ANSI/color
gap as a side effect of the chosen architecture.

## Scope

**In scope:** recording a single given command's real-time output
(`ttyreel render <cmd>` / `ttyreel serve <cmd>`) as a timed sequence of
terminal-state frames, exporting that as GIF, and upgrading the existing
`--animated` SVG output to play back real captured frames instead of a
CSS typing-effect over static text.

**Out of scope (explicit, deferred):**
- Interactive live-typed session recording (the user types into a real
  shell, asciinema-style). This spec covers only "run this one command
  and record what happens" — the more ambitious "record an interactive
  session" mode is a distinct, larger feature for a later spec if wanted.
- `demo` command is unchanged — it already manufactures synthetic frames
  for a fixed showcase and doesn't run a real process.
- Scrollback recording beyond the visible grid, and resizing mid-recording
  — not handled; the terminal grid size is fixed for the duration of a
  recording (`--cols`/`--rows`, defaulting to the invoking terminal's
  current size or 80x24 if not a TTY).

## Architecture

### Capture: `node-pty` + `@xterm/headless`

The command is spawned in a real pseudo-terminal via `node-pty` (not
`execSync`) so output timing is real, not just a captured final buffer.
That raw byte stream is fed into an `@xterm/headless` `Terminal` instance
— xterm.js's terminal-state engine with no DOM dependency, the same VT
parser used by VS Code's and Hyper's real terminals. This is deliberately
not a hand-rolled VT parser: correctly handling 256-color, truecolor,
cursor movement, and screen-clear escape sequences is a large, easy-to-get-
subtly-wrong undertaking, and xterm.js already solves it correctly. This
also fixes the ANSI-parser gap as a side effect — frames are read back out
of xterm's cell buffer, already correctly resolved.

**Constraint accepted knowingly:** `node-pty` requires native compilation
(node-gyp) unless a prebuilt binary is available for the platform. There is
no pure-JS way to open a real OS pseudo-terminal — this is an unavoidable
cost of real PTY capture, not a design choice to revisit. Worth a README
troubleshooting note ("if `npm install` fails to build node-pty...") as a
follow-up doc task, not part of this spec's code changes.

### Frame model: sampled grid snapshots, not raw byte deltas

The terminal's cell grid is sampled at a fixed rate (`--fps`, default 10)
into a `Frame[]` timeline, rather than recording every raw output chunk —
this bounds memory/file size regardless of how chatty the command's output
is (the audit's "unbounded SVG size" finding). A `Frame` is a grid of
per-cell `{char, fg, bg, bold, italic, underline}` plus cursor position and
a relative timestamp — reading this back from xterm's buffer API
(`terminal.buffer.active.getLine(y).getCell(x)`) rather than re-parsing
ANSI text per frame.

An immediate frame is always captured at t=0 in addition to the interval
samples, so a command that exits before the first sample interval fires
(e.g. a fast `ls`) still produces at least one real frame instead of zero.

Recording stops at whichever comes first: the process exits, or
`--max-duration` (default 30s) elapses — in the latter case the PTY
process is killed, whatever was captured is still rendered/encoded, and a
warning is printed that the command may still have been running.

### Rendering: grid-driven SVG, then optional GIF

`src/renderer/svg.ts` gains a function that renders one SVG frame directly
from a `Frame`'s cell grid (window chrome, title bar, theme background/
gradient reused from the existing theme system in `src/themes.ts`) — this
replaces re-parsing ANSI text per frame with reading already-resolved
per-cell color/style data, which is both more correct and simpler than the
current text-based renderer.

For GIF export (`--format gif`): each `Frame` → SVG string → rasterized to
a PNG buffer via `@resvg/resvg-js` (Rust/WASM, no system dependencies
beyond what npm already installs) → the PNG sequence is assembled into an
animated GIF via `gifenc` (pure JS/WASM, no native deps), with per-frame
delay matching `1000/fps` ms.

**Alternative considered and rejected:** rendering frames directly to a
canvas bitmap (e.g. via `node-canvas`) instead of going through SVG first.
Rejected because `node-canvas` needs a native Cairo build (real install
friction on top of the already-accepted `node-pty` native dependency), and
it would mean duplicating the theme/chrome rendering logic that already
exists in the SVG renderer instead of reusing it.

The existing `--animated` flag (currently a CSS typing-effect over static
text) is upgraded to play back the real `Frame[]` timeline as a multi-frame
animated SVG (CSS/SMIL keyframes cycling through the captured frames)
instead of simulating typing over the final output — same underlying
timeline now drives both the animated-SVG and GIF paths.

## Components

- `src/recorder.ts` (new) — `recordCommand(cmdString, options): Promise<Frame[]>`. Owns the `node-pty` spawn, the `@xterm/headless` instance, the sample-interval timer, and the max-duration/process-exit stop conditions.
- `src/types.ts` (modified) — adds `Cell`, `Frame`, `RecordOptions`. `TerminalFrame` (the old `{text, delayMs}` shape) stays, still used by `demo`'s synthetic showcase frames.
- `src/renderer/svg.ts` (modified) — adds a grid-driven frame renderer alongside the existing text-based one (which stays, for `demo`).
- `src/gif.ts` (new) — `encodeGif(frames, renderOpts, fps): Promise<Buffer>`. Owns the SVG→PNG→GIF pipeline.
- `src/index.ts` (modified) — `render`/`serve` commands call `recordCommand` instead of `execSync`; new `--fps`, `--max-duration`, `--cols`, `--rows` flags; `--format gif` wired to `encodeGif`.

New dependencies: `node-pty`, `@xterm/headless`, `@resvg/resvg-js`, `gifenc`.

## Error handling

- Command not found / shell spawn failure: surfaced the same way the
  current `execSync` try/catch already does — clear error, no partial
  output file written.
- Max-duration reached mid-recording: PTY process killed, captured frames
  still rendered/encoded, explicit warning printed (not a silent partial
  result).
- GIF/PNG encoding failure: clear error, no partially-written output file
  left on disk.
- Fast-exiting command (before first sample tick): the t=0 immediate frame
  guarantees at least one real frame is always captured.

## Testing

- `renderGridFrame` (SVG-from-grid): pure function, test with a small
  synthetic `Frame` fixture (e.g. a 4x2 grid with known text/colors),
  assert the output SVG contains the expected text and resolved color
  values.
- `recordCommand`: an integration-style test that actually runs a trivial
  real command (`echo hello`) through the recorder and asserts the
  resulting `Frame[]` has at least one frame whose grid contains "hello"
  in the expected cells. This is real spawned-process behavior, not
  mocked — the risk here (silent capture failure) is exactly what a mock
  would hide.
- `encodeGif`: test that encoding 2 synthetic frames produces a non-empty
  `Buffer` starting with the `GIF89a` magic bytes.

## Open questions

None — both architecture decisions (node-pty + xterm-headless for capture;
SVG→PNG→GIF via resvg-js + gifenc for export) were explicitly confirmed
during design. Recording mode is scoped to "one command, real timing" per
explicit choice; interactive live-session recording is out of scope for
this spec.
