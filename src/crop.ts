import { Frame } from './types';

/**
 * Drops the empty rows below the content, so a short command is not drawn inside a 24-row window.
 * The same row count is applied to every frame (an animation must not change size); the cursor row of
 * any frame counts as content. At least `minRows` rows are kept.
 */
export function cropBlankRows(frames: Frame[], minRows: number = 3): Frame[] {
  let last = -1;
  for (const f of frames) {
    f.grid.forEach((row, y) => {
      if (row.some((c) => c.char !== ' ' && c.char !== '')) last = Math.max(last, y);
    });
    if (f.cursorVisible) last = Math.max(last, f.cursorY);
  }
  const keep = Math.max(minRows, last + 1);
  return frames.map((f) => (f.grid.length > keep ? { ...f, grid: f.grid.slice(0, keep) } : f));
}
