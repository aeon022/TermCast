import * as fs from 'fs-extra';
import * as path from 'path';
import { Frame, RenderOptions } from './types';
import { cropBlankRows } from './crop';
import { redactFrames, redactAnsiText, redactString, RedactOptions } from './redact';
import { renderGridFrame, renderAnimatedGridFrames } from './renderer/svg';
import { renderHtmlEmbed } from './renderer/html';
import { encodeGif } from './gif';
import { encodePng } from './png';

export type OutputFormat = 'svg' | 'html' | 'gif' | 'png';
const ALL: OutputFormat[] = ['svg', 'html', 'gif', 'png'];

/** "svg", "svg,gif", "both" (= svg + html) or "all" → the list of files to write. */
export function parseFormats(spec: string): OutputFormat[] {
  const out: OutputFormat[] = [];
  for (const part of spec.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean)) {
    const add = part === 'both' ? ['svg', 'html'] : part === 'all' ? ALL : [part];
    for (const f of add) {
      if (!ALL.includes(f as OutputFormat)) throw new Error(`Unknown format "${f}". Use svg, html, gif, png, both or all (comma-separated to combine).`);
      if (!out.includes(f as OutputFormat)) out.push(f as OutputFormat);
    }
  }
  if (out.length === 0) throw new Error('No output format given.');
  return out;
}

/** "3-8" → [3, 8] (1-based, inclusive); "5" → [5, 5]. */
export function parseLineRange(spec: string, total?: number): [number, number] {
  const m = /^(\d+)(?:-(\d+))?$/.exec(spec.trim());
  if (!m) throw new Error(`Invalid --lines "${spec}": use N or FROM-TO, e.g. 3-8`);
  const from = Number(m[1]);
  const to = m[2] === undefined ? from : Number(m[2]);
  if (from < 1 || to < from) throw new Error(`Invalid --lines "${spec}": FROM must be at least 1 and not after TO`);
  if (total !== undefined && from > total) throw new Error(`--lines ${spec} is outside the recording (${total} lines)`);
  return [from, to];
}

/** Plays the recording faster (speed > 1) or slower by rescaling the timestamps. */
export function applySpeed(frames: Frame[], speed: number): Frame[] {
  if (!(speed > 0 && speed <= 100)) throw new Error('--speed must be greater than 0 and at most 100');
  if (speed === 1) return frames;
  return frames.map((f) => ({ ...f, timestampMs: Math.round(f.timestampMs / speed) }));
}

/** Keeps rows FROM..TO of every frame. */
export function selectLines(frames: Frame[], range: [number, number]): Frame[] {
  const [from, to] = range;
  const total = Math.max(...frames.map((f) => f.grid.length));
  if (from > total) throw new Error(`--lines ${from}-${to} is outside the recording (${total} lines)`);
  return frames.map((f) => ({ ...f, grid: f.grid.slice(from - 1, to), cursorY: Math.max(0, f.cursorY - (from - 1)) }));
}

export interface OutputSettings {
  /** base path without extension */
  output: string;
  formats: OutputFormat[];
  animated: boolean;
  scale: number;
  loop: boolean;
  speed: number;
  lines?: [number, number];
  fps: number;
  redact: RedactOptions;
  render: RenderOptions;
}

export interface OutputResult {
  files: string[];
  redacted: number;
}

const frameText = (f: Frame) => f.grid.map((row) => row.map((c) => c.char || ' ').join('').trimEnd()).join('\n');

/** Turns a recording into the requested files: speed, line selection, cropping, redaction, then each format. */
export async function writeOutputs(recorded: Frame[], rawText: string | undefined, s: OutputSettings): Promise<OutputResult> {
  if (recorded.length === 0) throw new Error('Nothing was recorded.');
  let frames = applySpeed(recorded, s.speed);
  if (s.lines) frames = selectLines(frames, s.lines);
  frames = cropBlankRows(frames);
  const red = redactFrames(frames, s.redact);
  frames = red.frames;

  const base = path.resolve(s.output.replace(/\.(svg|html|gif|png)$/i, ''));
  await fs.ensureDir(path.dirname(base));
  const files: string[] = [];
  const last = frames[frames.length - 1];
  // the title is usually the command line: it can hold the very secret that is masked in the output
  const render: RenderOptions = { ...s.render, loop: s.loop, title: s.render.title === undefined ? undefined : redactString(s.render.title, s.redact) };

  for (const format of s.formats) {
    const file = `${base}.${format}`;
    if (format === 'svg') {
      await fs.writeFile(file, s.animated ? renderAnimatedGridFrames(frames, render) : renderGridFrame(last, render), 'utf8');
    } else if (format === 'html') {
      // colours come from the raw terminal text when there is one (live recordings); otherwise from the last frame
      let text = rawText !== undefined && !s.lines ? redactAnsiText(rawText, s.redact).text : frameText(last);
      await fs.writeFile(file, renderHtmlEmbed([{ text, delayMs: 0 }], render), 'utf8');
    } else if (format === 'gif') {
      await fs.writeFile(file, await encodeGif(frames, render, s.fps, { loop: s.loop, scale: s.scale }));
    } else {
      await fs.writeFile(file, encodePng(last, render, s.scale));
    }
    files.push(file);
  }
  return { files, redacted: red.count };
}
