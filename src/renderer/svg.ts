import { RenderOptions, TerminalFrame, ThemeName } from '../types';
import { THEMES } from '../themes';
import { parseAnsiToStyledSpans, escapeXml } from '../parser';

export function renderSvgFrame(frames: TerminalFrame[], options: RenderOptions = {}): string {
  const themeName = (options.theme || 'dracula') as ThemeName;
  const theme = THEMES[themeName] || THEMES.dracula;
  const windowTitle = options.title || 'termcast — bash';
  const showWatermark = options.watermark !== false; // true if free version

  // Flatten text from frames
  const fullRawText = frames.map(f => f.text).join('\n');
  const lines = fullRawText.split(/\r?\n/);

  const fontSize = options.fontSize || 14;
  const lineHeight = Math.round(fontSize * 1.45);
  const padding = options.padding || 35;
  const titleBarHeight = 36;

  // Compute dimensions
  let maxCols = 60;
  for (const line of lines) {
    const cleanLine = line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
    if (cleanLine.length > maxCols) {
      maxCols = cleanLine.length;
    }
  }

  const contentWidth = Math.max(650, maxCols * (fontSize * 0.62));
  const width = Math.round(contentWidth + padding * 2);
  const contentHeight = Math.max(120, lines.length * lineHeight);
  const height = Math.round(contentHeight + titleBarHeight + padding * 2 + (showWatermark ? 25 : 0));

  const termX = padding;
  const termY = padding;
  const termW = width - padding * 2;
  const termH = height - padding * 2 - (showWatermark ? 25 : 0);

  // Render SVG lines with colored spans
  let textSvgLines = '';
  lines.forEach((line, index) => {
    const spans = parseAnsiToStyledSpans(line, theme);
    const yPos = termY + titleBarHeight + 25 + (index * lineHeight);

    let lineInnerSvg = '';
    let currentXOffset = 0;

    spans.forEach(span => {
      const escapedText = escapeXml(span.text);
      const fontWeight = span.bold ? 'font-weight="bold"' : '';
      const color = span.color || theme.foreground;

      lineInnerSvg += `<tspan fill="${color}" ${fontWeight}>${escapedText}</tspan>`;
    });

    textSvgLines += `    <text x="${termX + 20}" y="${yPos}" font-family="Menlo, Monaco, 'Courier New', monospace" font-size="${fontSize}px">${lineInnerSvg}</text>\n`;
  });

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
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${theme.colors.blue}" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="${theme.colors.magenta}" stop-opacity="0.8"/>
    </linearGradient>

    <!-- Glassmorphism Drop Shadow -->
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>

  <!-- Canvas Outer Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" rx="12"/>

  <!-- Terminal Window Frame -->
  <g filter="url(#shadow)">
    <rect x="${termX}" y="${termY}" width="${termW}" height="${termH}" rx="10" fill="${theme.background}"/>

    <!-- Window Title Bar -->
    <path d="M${termX} ${termY + 10} C${termX} ${termY + 4} ${termX + 4} ${termY} ${termX + 10} ${termY} L${termX + termW - 10} ${termY} C${termX + termW - 4} ${termY} ${termX + termW} ${termY + 4} ${termX + termW} ${termY + 10} L${termX + termW} ${termY + titleBarHeight} L${termX} ${termY + titleBarHeight} Z" fill="${theme.titleBar}"/>

    <!-- macOS Traffic Light Buttons -->
    <circle cx="${termX + 18}" cy="${termY + 18}" r="6" fill="#FF5F56"/>
    <circle cx="${termX + 38}" cy="${termY + 18}" r="6" fill="#FFBD2E"/>
    <circle cx="${termX + 58}" cy="${termY + 18}" r="6" fill="#27C93F"/>

    <!-- Window Title -->
    <text x="${termX + termW / 2}" y="${termY + 22}" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif" font-size="12px" font-weight="600" fill="${theme.foreground}" opacity="0.75">${escapeXml(windowTitle)}</text>
  </g>

  <!-- Terminal Body Content -->
  <g xml:space="preserve">
${textSvgLines}  </g>

  ${watermarkSvg}
</svg>`;
}
