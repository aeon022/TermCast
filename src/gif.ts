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
