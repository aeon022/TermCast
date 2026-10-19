import { RenderOptions, TerminalFrame, ThemeName, GradientPreset, Frame, Cell } from '../types';
import { THEMES, GRADIENTS, gradientStops } from '../themes';
import { parseAnsiToStyledSpans, escapeXml } from '../parser';

// How long the last recorded frame stays on screen before a looping playback
// wraps back to frame 0. Shared by the animated-SVG path (animation duration
// padding) and the GIF path (last frame's delay).
/**
 * Shortens a window title so it stays between the traffic lights (left) and the right edge: roughly
 * 7px per character at the title font size, with 110px reserved on each side. Newlines become spaces.
 */
export function fitTitle(title: string, windowWidth: number): string {
  const flat = title.replace(/\s+/g, ' ').trim();
  const max = Math.max(8, Math.floor((windowWidth - 220) / 7));
  return flat.length <= max ? flat : flat.slice(0, max - 1).trimEnd() + '…';
}

export const FINAL_FRAME_HOLD_MS = 800;

export function renderSvgFrame(frames: TerminalFrame[], options: RenderOptions = {}): string {
  const themeName = (options.theme || 'dracula') as ThemeName;
  const theme = THEMES[themeName] || THEMES.dracula;
  const gradientCss = options.gradient ? (GRADIENTS[options.gradient] || GRADIENTS.default) : theme.gradientBackground;
  const windowTitle = options.title || 'ttyreel — zsh';
  const showWatermark = options.watermark !== false;
  const isAnimated = options.animated === true;

  // Add optional ZSH / Starship prompt header line
  let fullRawText = frames.map(f => f.text).join('\n');
  if (options.prompt === 'zsh') {
    fullRawText = `\x1b[32muser@macbook\x1b[0m:\x1b[34m~/Projects/my-app\x1b[0m \x1b[35mgit:(main)\x1b[0m ❯ ${fullRawText}`;
  } else if (options.prompt === 'starship') {
    fullRawText = `\x1b[36m📁 my-app\x1b[0m on \x1b[35m🌿 main\x1b[0m \x1b[33m[⚡ 42ms]\x1b[0m\n❯ ${fullRawText}`;
  }

  const lines = fullRawText.split(/\r?\n/).filter((l, i, arr) => i < arr.length - 1 || l.trim().length > 0);

  const fontSize = options.fontSize || 14;
  const lineHeight = Math.round(fontSize * 1.45);
  const padding = options.padding || 35;
  const titleBarHeight = 36;

  let maxCols = 60;
  lines.forEach(line => {
    const cleanLine = line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
    if (cleanLine.length > maxCols) {
      maxCols = cleanLine.length;
    }
  });

  const contentWidth = Math.max(680, maxCols * (fontSize * 0.62));
  const width = Math.round(contentWidth + padding * 2);

  const terminalBodyHeight = (lines.length * lineHeight) + 30;
  const termH = titleBarHeight + terminalBodyHeight;
  const height = Math.round(termH + padding * 2 + (showWatermark ? 25 : 0));

  const termX = padding;
  const termY = padding;
  const termW = width - padding * 2;

  let textSvgLines = '';
  lines.forEach((line, index) => {
    const spans = parseAnsiToStyledSpans(line, theme);
    const yPos = termY + titleBarHeight + 24 + (index * lineHeight);

    let lineInnerSvg = '';
    spans.forEach(span => {
      const escapedText = escapeXml(span.text);
      const fontWeight = span.bold ? 'font-weight="bold"' : '';
      const color = span.color || theme.foreground;
      lineInnerSvg += `<tspan fill="${color}" ${fontWeight}>${escapedText}</tspan>`;
    });

    const animClass = isAnimated ? `class="animated-line line-${index}"` : '';
    textSvgLines += `    <text x="${termX + 20}" y="${yPos}" font-family="Menlo, Monaco, 'Courier New', monospace" font-size="${fontSize}px" ${animClass}>${lineInnerSvg}</text>\n`;
  });

  // Calculate cursor placement right after last character on last line
  const lastLine = lines[lines.length - 1] || '';
  const cleanLastLine = lastLine.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  const cursorX = termX + 20 + Math.round(cleanLastLine.length * (fontSize * 0.605));
  const cursorY = termY + titleBarHeight + 24 + ((lines.length - 1) * lineHeight) - 12;

  // Calculate timing sync for cursor
  const totalTypingTimeSec = (0.15 + (lines.length * 0.25)).toFixed(2);

  // Synchronized CSS Keyframe Animation Styles
  const animationStyles = isAnimated ? `
    <style>
      .animated-line {
        opacity: 0;
        animation: fadeInLine 0.25s forwards;
      }
      ${lines.map((_, i) => `.line-${i} { animation-delay: ${(0.15 + (i * 0.25)).toFixed(2)}s; }`).join('\n')}

      @keyframes fadeInLine {
        from { opacity: 0; transform: translateY(3px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .cursor {
        opacity: 0;
        animation: blinkCursor 1s infinite;
        animation-delay: ${totalTypingTimeSec}s;
      }

      @keyframes blinkCursor {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0; }
      }
    </style>
  ` : '';

  const cursorSvg = isAnimated ? `
    <rect x="${cursorX}" y="${cursorY}" width="8" height="15" fill="${theme.colors.green}" class="cursor" />
  ` : '';

  const watermarkSvg = showWatermark ? `
    <g transform="translate(${width - 210}, ${height - 15})">
      <text font-family="-apple-system, system-ui, sans-serif" font-size="11px" fill="#888888">
        Crafted with <tspan fill="#0066FF" font-weight="bold">ttyreel</tspan>
      </text>
    </g>
  ` : '';

  const stops = gradientStops(gradientCss, theme.colors.blue, theme.colors.magenta);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
${stops}
    </linearGradient>

    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>

  ${animationStyles}

  <rect width="${width}" height="${height}" fill="url(#bgGrad)" rx="12"/>

  <g filter="url(#shadow)">
    <rect x="${termX}" y="${termY}" width="${termW}" height="${termH}" rx="10" fill="${theme.background}"/>

    <path d="M${termX} ${termY + 10} C${termX} ${termY + 4} ${termX + 4} ${termY} ${termX + 10} ${termY} L${termX + termW - 10} ${termY} C${termX + termW - 4} ${termY} ${termX + termW} ${termY + 4} ${termX + termW} ${termY + 10} L${termX + termW} ${termY + titleBarHeight} L${termX} ${termY + titleBarHeight} Z" fill="${theme.titleBar}"/>

    <circle cx="${termX + 18}" cy="${termY + 18}" r="6" fill="#FF5F56"/>
    <circle cx="${termX + 38}" cy="${termY + 18}" r="6" fill="#FFBD2E"/>
    <circle cx="${termX + 58}" cy="${termY + 18}" r="6" fill="#27C93F"/>

    <text x="${termX + termW / 2}" y="${termY + 22}" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif" font-size="12px" font-weight="600" fill="${theme.foreground}" opacity="0.75">${escapeXml(fitTitle(windowTitle, termW))}</text>
  </g>

  <g xml:space="preserve">
${textSvgLines}
${cursorSvg}  </g>

  ${watermarkSvg}
</svg>`;
}

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
  const windowTitle = options.title || 'ttyreel — zsh';
  const { width, height, termX, termY, termW, termH, titleBarHeight } = geom;

  const stops = gradientStops(gradientCss, theme.colors.blue, theme.colors.magenta);

  const watermarkSvg = showWatermark ? `
    <g transform="translate(${width - 210}, ${height - 15})">
      <text font-family="-apple-system, system-ui, sans-serif" font-size="11px" fill="#888888">
        Crafted with <tspan fill="#0066FF" font-weight="bold">ttyreel</tspan>
      </text>
    </g>
  ` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
${stops}
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
    <text x="${termX + termW / 2}" y="${termY + 22}" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif" font-size="12px" font-weight="600" fill="${theme.foreground}" opacity="0.75">${escapeXml(fitTitle(windowTitle, termW))}</text>
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
  // Pad the animation loop to give the last frame a non-zero-length window
  // to be visible in before the loop wraps back to frame-0
  const animDurationMs = totalDurationMs + FINAL_FRAME_HOLD_MS;

  let framesBody = '';
  let styles = `<style>.rec-frame { opacity: 0; animation-duration: ${animDurationMs}ms; animation-iteration-count: infinite; animation-timing-function: steps(1, end); }</style>\n`;

  frames.forEach((frame, i) => {
    const startPct = (frame.timestampMs / animDurationMs) * 100;
    const isLast = i === frames.length - 1;
    const lines = renderFrameLines(frame, geom);
    framesBody += `    <g class="rec-frame" style="animation-name: frame-${i};">\n${lines}    </g>\n`;

    if (isLast) {
      styles += `<style>@keyframes frame-${i} { 0% { opacity: 0; } ${startPct.toFixed(3)}% { opacity: 1; } 100% { opacity: 1; } }</style>\n`;
    } else {
      const nextTimestamp = frames[i + 1].timestampMs;
      const endPct = (nextTimestamp / animDurationMs) * 100;
      styles += `<style>@keyframes frame-${i} { 0% { opacity: 0; } ${startPct.toFixed(3)}% { opacity: 1; } ${endPct.toFixed(3)}% { opacity: 0; } 100% { opacity: 0; } }</style>\n`;
    }
  });

  return buildChrome(geom, options, framesBody, styles, showWatermark);
}
