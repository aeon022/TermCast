import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { Step } from './recorder';

/** What `ttyreel play` reads: the steps plus optional look settings (command-line flags win over these). */
export interface ScriptFile {
  title?: string;
  theme?: string;
  themeFile?: string;
  gradient?: string;
  prompt?: string;
  cols?: number;
  rows?: number;
  typing: boolean;
  typeSpeed?: number;
  steps: Step[];
}

const num = (v: any, name: string, min: number, max: number): number | undefined => {
  if (v === undefined) return undefined;
  if (typeof v !== 'number' || !isFinite(v) || v < min || v > max) throw new Error(`"${name}" must be a number between ${min} and ${max}`);
  return v;
};

/** Validates a parsed script; every problem names the offending step so the file can be fixed without guessing. */
export function parseScript(raw: any, fileName: string = 'script'): ScriptFile {
  const fail = (m: string): never => { throw new Error(`Invalid script ${fileName}: ${m}`); };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) fail('expected a mapping with a "steps" list');
  if (!Array.isArray(raw.steps) || raw.steps.length === 0) fail('"steps" must be a non-empty list');
  const steps: Step[] = raw.steps.map((s: any, i: number) => {
    const entry = typeof s === 'string' ? { cmd: s } : s;
    if (!entry || typeof entry.cmd !== 'string' || entry.cmd.trim() === '') fail(`step ${i + 1} needs a "cmd" string`);
    if (entry.type !== undefined && typeof entry.type !== 'boolean') fail(`step ${i + 1}: "type" must be true or false`);
    let pause: number | undefined;
    try { pause = num(entry.pause, 'pause', 0, 60000); } catch (e: any) { fail(`step ${i + 1}: ${e.message}`); }
    if (entry.show !== undefined && typeof entry.show !== 'string') fail(`step ${i + 1}: "show" must be a string`);
    return { cmd: entry.cmd, show: entry.show, type: entry.type, pause };
  });
  try {
    return {
      title: raw.title === undefined ? undefined : String(raw.title),
      theme: raw.theme === undefined ? undefined : String(raw.theme),
      themeFile: raw.themeFile === undefined ? undefined : String(raw.themeFile),
      gradient: raw.gradient === undefined ? undefined : String(raw.gradient),
      prompt: raw.prompt === undefined ? undefined : String(raw.prompt),
      cols: num(raw.cols, 'cols', 20, 300),
      rows: num(raw.rows, 'rows', 3, 100),
      typing: raw.typing === undefined ? true : Boolean(raw.typing),
      typeSpeed: num(raw.typeSpeed, 'typeSpeed', 0, 1000),
      steps
    };
  } catch (e: any) {
    return fail(e.message);
  }
}

export function loadScript(file: string): ScriptFile {
  let text: string;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err: any) {
    throw new Error(`Cannot read script ${file}: ${err.message}`);
  }
  const ext = path.extname(file).toLowerCase();
  let raw: any;
  try {
    raw = ext === '.json' ? JSON.parse(text) : yaml.load(text);
  } catch (err: any) {
    throw new Error(`Cannot parse script ${file}: ${err.message}`);
  }
  return parseScript(raw, path.basename(file));
}
