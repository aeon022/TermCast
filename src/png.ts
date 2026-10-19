import { Resvg } from '@resvg/resvg-js';
import { renderGridFrame } from './renderer/svg';
import { resolveMonospaceFontOptions } from './gif';
import { Frame, RenderOptions } from './types';

/** Renders one frame (normally the last) as a PNG; `scale` 2 doubles the pixel size for sharp images on retina screens. */
export function encodePng(frame: Frame, options: RenderOptions, scale: number = 1): Buffer {
  if (!(scale >= 0.25 && scale <= 8)) throw new Error('scale must be between 0.25 and 8');
  const svg = renderGridFrame(frame, options);
  const resvg = new Resvg(svg, {
    font: resolveMonospaceFontOptions(),
    fitTo: scale === 1 ? { mode: 'original' } : { mode: 'zoom', value: scale }
  });
  return Buffer.from(resvg.render().asPng());
}
