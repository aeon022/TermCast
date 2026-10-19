import * as fs from 'fs';
import { Terminal } from '@xterm/headless';
import { Frame } from './types';
import { snapshotFrame } from './recorder';

export interface CastEvent { time: number; data: string }
export interface Cast { cols: number; rows: number; events: CastEvent[] }

/**
 * Reads an asciinema recording (format v2, or v3 with relative timestamps) and keeps its output events.
 * Idle gaps longer than `idleLimit` seconds are shortened, like `asciinema play -i`.
 */
export function parseCast(text: string, idleLimit: number = 2): Cast {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) throw new Error('Empty cast file');
  let header: any;
  try {
    header = JSON.parse(lines[0]);
  } catch {
    throw new Error('Not an asciinema cast: the first line is not a JSON header');
  }
  const version = header.version;
  if (version !== 2 && version !== 3) throw new Error(`Unsupported asciinema cast version ${version} (supported: 2 and 3)`);
  const cols = Number(version === 3 ? header.term?.cols : header.width) || 80;
  const rows = Number(version === 3 ? header.term?.rows : header.height) || 24;

  const events: CastEvent[] = [];
  let clock = 0; // time on the (idle-shortened) output timeline
  let lastRaw = 0; // previous event's own timestamp, for gap detection
  for (const line of lines.slice(1)) {
    let ev: any;
    try { ev = JSON.parse(line); } catch { continue; }
    if (!Array.isArray(ev) || typeof ev[0] !== 'number') continue;
    const gap = version === 3 ? ev[0] : ev[0] - lastRaw;
    lastRaw = version === 3 ? 0 : ev[0];
    clock += idleLimit > 0 ? Math.min(Math.max(gap, 0), idleLimit) : Math.max(gap, 0);
    if (ev[1] === 'o' && typeof ev[2] === 'string') events.push({ time: clock, data: ev[2] });
  }
  return { cols, rows, events };
}

/** Plays the cast into a headless terminal and samples it at `fps`, producing the same frames as a live recording. */
export async function castToFrames(cast: Cast, options: { fps?: number; theme?: string } = {}): Promise<Frame[]> {
  const fps = options.fps || 10;
  const term = new Terminal({ cols: cast.cols, rows: cast.rows, allowProposedApi: true });
  const write = (data: string) => new Promise<void>((res) => term.write(data, () => res()));
  const theme = options.theme || 'dracula';
  const end = cast.events.length ? cast.events[cast.events.length - 1].time : 0;
  const frames: Frame[] = [snapshotFrame(term, theme, 0)];
  let i = 0;
  for (let t = 1000 / fps; t <= end * 1000 + 1000 / fps; t += 1000 / fps) {
    while (i < cast.events.length && cast.events[i].time * 1000 <= t) await write(cast.events[i++].data);
    frames.push(snapshotFrame(term, theme, Math.round(t)));
  }
  return frames;
}

export async function loadCastFrames(file: string, options: { fps?: number; theme?: string; idleLimit?: number } = {}): Promise<{ frames: Frame[]; cols: number; rows: number }> {
  let text: string;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err: any) {
    throw new Error(`Cannot read cast ${file}: ${err.message}`);
  }
  const cast = parseCast(text, options.idleLimit ?? 2);
  return { frames: await castToFrames(cast, options), cols: cast.cols, rows: cast.rows };
}
