import { ThemeColors } from './types';

export interface StyledSpan {
  text: string;
  color?: string;
  bold?: boolean;
}

export function parseAnsiToStyledSpans(text: string, theme: ThemeColors): StyledSpan[] {
  // Strip non-color control sequences
  const sanitized = text.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, (match) => {
    if (match.endsWith('m')) return match; // keep color/style codes
    return '';
  });

  const parts = sanitized.split(/(\x1b\[[0-9;]*m)/g);
  const spans: StyledSpan[] = [];

  let currentColor: string | undefined = undefined;
  let currentBold: boolean = false;

  const ansiColorMap: Record<number, string> = {
    30: theme.colors.black,
    31: theme.colors.red,
    32: theme.colors.green,
    33: theme.colors.yellow,
    34: theme.colors.blue,
    35: theme.colors.magenta,
    36: theme.colors.cyan,
    37: theme.colors.white,
    90: theme.colors.black,
    91: theme.colors.red,
    92: theme.colors.green,
    93: theme.colors.yellow,
    94: theme.colors.blue,
    95: theme.colors.magenta,
    96: theme.colors.cyan,
    97: theme.colors.white,
  };

  for (const part of parts) {
    if (part.startsWith('\x1b[')) {
      const codes = part.slice(2, -1).split(';').map(Number);
      for (const code of codes) {
        if (code === 0) {
          currentColor = undefined;
          currentBold = false;
        } else if (code === 1) {
          currentBold = true;
        } else if (ansiColorMap[code]) {
          currentColor = ansiColorMap[code];
        }
      }
    } else if (part.length > 0) {
      spans.push({
        text: part,
        color: currentColor || theme.foreground,
        bold: currentBold
      });
    }
  }

  return spans;
}

export function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
