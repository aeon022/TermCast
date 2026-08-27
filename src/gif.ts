import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { Resvg } from '@resvg/resvg-js';
import * as fs from 'fs';
import * as os from 'os';
import { renderGridFrame, FINAL_FRAME_HOLD_MS } from './renderer/svg';
import { Frame, RenderOptions } from './types';

const MONOSPACE_FONT_CANDIDATES: Record<string, string[]> = {
  darwin: ['/System/Library/Fonts/Menlo.ttc', '/System/Library/Fonts/Monaco.ttf'],
  linux: [
    '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf',
    '/usr/share/fonts/TTF/DejaVuSansMono.ttf'
  ],
  win32: ['C:\\Windows\\Fonts\\consola.ttf', 'C:\\Windows\\Fonts\\cour.ttf']
};

// Resolving fonts via loadSystemFonts is a full system font-database scan
// — measured ~140x slower per Resvg instantiation than pointing at a known
// file directly. This project only ever renders one fixed monospace font
// family, so resolve a real font file once per encodeGif() call (checked
// against well-known per-OS install paths) and reuse it for every frame,
// instead of rescanning per frame. Falls back to the slow but
// always-correct loadSystemFonts:true only if none of the known paths
// exist on this machine.
export function resolveMonospaceFontOptions(): { loadSystemFonts: boolean; fontFiles?: string[] } {
  const candidates = MONOSPACE_FONT_CANDIDATES[os.platform()] || [];
  const found = candidates.filter(p => fs.existsSync(p));
  if (found.length > 0) {
    return { loadSystemFonts: false, fontFiles: found };
  }
  return { loadSystemFonts: true };
}

function framesEqual(a: Frame, b: Frame): boolean {
  if (a.grid.length !== b.grid.length) return false;
  for (let y = 0; y < a.grid.length; y++) {
    const rowA = a.grid[y];
    const rowB = b.grid[y];
    if (rowA.length !== rowB.length) return false;
    for (let x = 0; x < rowA.length; x++) {
      const ca = rowA[x];
      const cb = rowB[x];
      if (
        ca.char !== cb.char || ca.fg !== cb.fg || ca.bg !== cb.bg ||
        !!ca.bold !== !!cb.bold || !!ca.italic !== !!cb.italic || !!ca.underline !== !!cb.underline
      ) {
        return false;
      }
    }
  }
  return true;
}

interface EncodableFrame {
  frame: Frame;
  delayMs: number;
}

// Merges consecutive identical frames into one GIF frame with an extended
// delay (instead of encoding N redundant identical frames), and derives
// each remaining frame's delay from the REAL inter-frame timestamp gap
// rather than a flat fps-derived constant. The last frame's delay is
// extended by FINAL_FRAME_HOLD_MS so it's actually visible before a
// looping GIF wraps back to the first frame — mirroring the same fix
// already applied to renderAnimatedGridFrames's CSS animation timing.
export function buildEncodableFrames(frames: Frame[]): EncodableFrame[] {
  const result: EncodableFrame[] = [];
  for (let i = 0; i < frames.length; i++) {
    const nextTimestamp = i < frames.length - 1
      ? frames[i + 1].timestampMs
      : frames[i].timestampMs + FINAL_FRAME_HOLD_MS;
    const gapMs = Math.max(1, nextTimestamp - frames[i].timestampMs);

    const prev = result[result.length - 1];
    if (prev && framesEqual(prev.frame, frames[i])) {
      prev.delayMs += gapMs;
      continue;
    }
    result.push({ frame: frames[i], delayMs: gapMs });
  }
  return result;
}

// Renders each frame to SVG, rasterizes it via resvg (no system
// dependencies beyond what npm already installs), and assembles the PNG
// sequence into an animated GIF.
// `fps` is kept for call-site compatibility but no longer sets the playback
// delay — per-frame delays now come from the recording's real timestamps.
export async function encodeGif(frames: Frame[], options: RenderOptions, fps: number): Promise<Buffer> {
  if (frames.length === 0) {
    throw new Error('encodeGif requires at least one frame');
  }

  const fontOpts = resolveMonospaceFontOptions();
  const encodable = buildEncodableFrames(frames);
  const encoder = GIFEncoder();

  for (let i = 0; i < encodable.length; i++) {
    const svg = renderGridFrame(encodable[i].frame, options);
    const resvg = new Resvg(svg, { font: fontOpts });
    const rendered = resvg.render();
    const { pixels, width, height } = rendered;

    const palette = quantize(pixels, 256);
    const indexed = applyPalette(pixels, palette);

    encoder.writeFrame(indexed, width, height, { palette, delay: encodable[i].delayMs, first: i === 0 });
  }

  encoder.finish();
  return Buffer.from(encoder.bytes());
}
