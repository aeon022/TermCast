import { RenderOptions, TerminalFrame, ThemeName } from '../types';
import { THEMES, GRADIENTS } from '../themes';
import { parseAnsiToStyledSpans, escapeXml } from '../parser';
import { fontStack } from './svg';

export function renderHtmlEmbed(frames: TerminalFrame[], options: RenderOptions = {}): string {
  const themeName = (options.theme || 'dracula') as ThemeName;
  const theme = THEMES[themeName] || THEMES.dracula;
  const gradient = options.gradient ? GRADIENTS[options.gradient] || GRADIENTS.default : theme.gradientBackground;
  const windowTitle = options.title || 'ttyreel — bash';
  const showWatermark = options.watermark !== false;

  const fullRawText = frames.map(f => f.text).join('\n');
  const lines = fullRawText.split(/\r?\n/);
  while (lines.length > 1 && lines[lines.length - 1].trim() === '') lines.pop(); // the final newline is not an extra line

  let linesHtml = '';
  lines.forEach((line, idx) => {
    const spans = parseAnsiToStyledSpans(line, theme);
    let lineInner = '';
    spans.forEach(span => {
      const escaped = escapeXml(span.text);
      const style = `color: ${span.color || theme.foreground}; ${span.bold ? 'font-weight: bold;' : ''}`;
      lineInner += `<span style="${style}">${escaped}</span>`;
    });
    linesHtml += `<div class="line"><span class="ln">${idx + 1}</span><span class="lc">${lineInner || ' '}</span></div>\n`;
  });

  const rawPlainContent = lines.join('\n').replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
  // The text goes into an inline <script>: a "</script>" in command output must not end it, so < > & and the
  // JS line separators are written as unicode escapes (still valid JSON, still the same string).
  const rawForScript = JSON.stringify(rawPlainContent)
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeXml(windowTitle)}</title>
  <style>
    body {
      margin: 0;
      padding: 40px 20px;
      font-family: -apple-system, system-ui, sans-serif;
      background: ${gradient};
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      box-sizing: border-box;
    }
    .ttyreel-card {
      width: 100%;
      max-width: 800px;
      background: ${theme.background};
      border-radius: 12px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5);
      overflow: hidden;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .ttyreel-header {
      background: ${theme.titleBar};
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(0,0,0,0.2);
    }
    .ttyreel-dots {
      display: flex;
      gap: 8px;
    }
    .dot { width: 12px; height: 12px; border-radius: 50%; }
    .dot.red { background: #FF5F56; }
    .dot.yellow { background: #FFBD2E; }
    .dot.green { background: #27C93F; }
    .ttyreel-title {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: ${theme.foreground};
      opacity: 0.8;
      font-size: 13px;
      font-weight: 600;
    }
    .ttyreel-copy {
      background: rgba(255,255,255,0.1);
      color: ${theme.foreground};
      border: none;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .ttyreel-copy:hover { background: rgba(255,255,255,0.25); }
    .ttyreel-body {
      padding: 20px;
      font-family: ${fontStack(options)};
      font-size: 14px;
      line-height: 1.5;
      overflow-x: auto;
      color: ${theme.foreground};
    }
    .line { display: flex; }
    .ln {
      width: 32px;
      color: rgba(255,255,255,0.25);
      user-select: none;
      text-align: right;
      padding-right: 16px;
      font-size: 12px;
    }
    .lc { flex: 1; white-space: pre; }
    .footer {
      text-align: center;
      padding: 10px;
      font-size: 11px;
      color: rgba(255,255,255,0.5);
    }
    .footer a { color: #0066FF; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>

<div class="ttyreel-card">
  <div class="ttyreel-header"${options.windowless ? ' style="background: transparent; justify-content: flex-end;"' : ''}>
${options.windowless ? '' : `    <div class="ttyreel-dots">
      <div class="dot red"></div>
      <div class="dot yellow"></div>
      <div class="dot green"></div>
    </div>
    <div class="ttyreel-title">${escapeXml(windowTitle)}</div>
`}    <button class="ttyreel-copy" onclick="copyCode()">Copy</button>
  </div>
  <div class="ttyreel-body">
${linesHtml}  </div>
  ${showWatermark ? `<div class="footer">Crafted with <a href="https://github.com/aeon022/ttyreel" target="_blank">ttyreel</a></div>` : ''}
</div>

<script>
  function copyCode() {
    const raw = ${rawForScript};
    navigator.clipboard.writeText(raw).then(() => {
      const btn = document.querySelector('.ttyreel-copy');
      btn.innerText = '✓ Copied!';
      setTimeout(() => btn.innerText = 'Copy', 2000);
    });
  }
</script>

</body>
</html>`;
}
