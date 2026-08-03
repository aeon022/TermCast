import { RenderOptions, TerminalFrame, ThemeName, GradientPreset } from '../types';
import { THEMES, GRADIENTS } from '../themes';
import { parseAnsiToStyledSpans, escapeXml } from '../parser';

export function renderSvgFrame(frames: TerminalFrame[], options: RenderOptions = {}): string {
  const themeName = (options.theme || 'dracula') as ThemeName;
  const theme = THEMES[themeName] || THEMES.dracula;
  const gradientCss = options.gradient ? (GRADIENTS[options.gradient] || GRADIENTS.default) : theme.gradientBackground;
  const windowTitle = options.title || 'termcast — zsh';
  const showWatermark = options.watermark !== false;
  const isAnimated = options.animated === true;

  // Add optional ZSH / Starship prompt header line
  let fullRawText = frames.map(f => f.text).join('\n');
  if (options.prompt === 'zsh') {
    fullRawText = `\x1b[32muser@macbook\x1b[0m:\x1b[34m~/Projects/my-app\x1b[0m \x1b[35mgit:(main)\x1b[0m ❯ ${fullRawText}`;
  } else if (options.prompt === 'starship') {
    fullRawText = `\x1b[36m📁 my-app\x1b[0m on \x1b[35m🌿 main\x1b[0m \x1b[33m[⚡ 42ms]\x1b[0m\n❯ ${fullRawText}`;
  }

  const lines = fullRawText.split(/\r?\n/);

  const fontSize = options.fontSize || 14;
  const lineHeight = Math.round(fontSize * 1.45);
  const padding = options.padding || 35;
  const titleBarHeight = 36;

  let maxCols = 60;
  for (const line of lines) {
    const cleanLine = line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
    if (cleanLine.length > maxCols) {
      maxCols = cleanLine.length;
    }
  }

  const contentWidth = Math.max(680, maxCols * (fontSize * 0.62));
  const width = Math.round(contentWidth + padding * 2);
  const contentHeight = Math.max(120, lines.length * lineHeight);
  const height = Math.round(contentHeight + titleBarHeight + padding * 2 + (showWatermark ? 25 : 0));

  const termX = padding;
  const termY = padding;
  const termW = width - padding * 2;
  const termH = height - padding * 2 - (showWatermark ? 25 : 0);

  let textSvgLines = '';
  lines.forEach((line, index) => {
    const spans = parseAnsiToStyledSpans(line, theme);
    const yPos = termY + titleBarHeight + 25 + (index * lineHeight);

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

  // Pure CSS Keyframe Animation Styles
  const animationStyles = isAnimated ? `
    <style>
      .animated-line {
        opacity: 0;
        animation: fadeInLine 0.3s forwards;
      }
      ${lines.map((_, i) => `.line-${i} { animation-delay: ${0.2 + (i * 0.4)}s; }`).join('\n')}

      @keyframes fadeInLine {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .cursor {
        animation: blink 1s infinite;
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
    </style>
  ` : '';

  const cursorSvg = isAnimated ? `
    <rect x="${termX + 20}" y="${termY + titleBarHeight + 25 + ((lines.length - 1) * lineHeight) - 12}" width="8" height="15" fill="${theme.colors.green}" class="cursor" />
  ` : '';

  const watermarkSvg = showWatermark ? `
    <g transform="translate(${width - 210}, ${height - 15})">
      <text font-family="-apple-system, system-ui, sans-serif" font-size="11px" fill="#888888">
        Crafted with <tspan fill="#0066FF" font-weight="bold">TermCast</tspan>
      </text>
    </g>
  ` : '';

  // Extract gradient colors for SVG linearGradient
  const gradMatch = gradientCss.match(/linear-gradient\([^,]+,\s*([^0-9]+)[0-9]+%\s*,\s*([^0-9]+)[0-9]+%\)/);
  const stop1 = gradMatch ? gradMatch[1].trim() : theme.colors.blue;
  const stop2 = gradMatch ? gradMatch[2].trim() : theme.colors.magenta;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${stop1}"/>
      <stop offset="100%" stop-color="${stop2}"/>
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

    <text x="${termX + termW / 2}" y="${termY + 22}" text-anchor="middle" font-family="-apple-system, system-ui, sans-serif" font-size="12px" font-weight="600" fill="${theme.foreground}" opacity="0.75">${escapeXml(windowTitle)}</text>
  </g>

  <g xml:space="preserve">
${textSvgLines}
${cursorSvg}  </g>

  ${watermarkSvg}
</svg>`;
}
