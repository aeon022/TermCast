export type ThemeName = string; // a built-in theme name or one registered from a --theme-file
export type GradientPreset = 'default' | 'cyberpunk' | 'sunset' | 'matrix' | 'hyper' | 'neon' | 'midnight';
export type PromptStyle = 'none' | 'zsh' | 'starship' | 'bash';

export interface ThemeColors {
  name: string;
  background: string;
  foreground: string;
  titleBar: string;
  gradientBackground: string;
  colors: {
    black: string;
    red: string;
    green: string;
    yellow: string;
    blue: string;
    magenta: string;
    cyan: string;
    white: string;
  };
}

export interface TerminalFrame {
  text: string;
  delayMs: number;
}

export interface RenderOptions {
  theme?: ThemeName;
  gradient?: GradientPreset;
  title?: string;
  output?: string;
  fontFamily?: string;
  fontSize?: number;
  padding?: number;
  loop?: boolean; // animated SVG: repeat forever (default) or play once and stay on the last frame
  windowless?: boolean; // no title bar and traffic lights: just the terminal body
  lightTheme?: ThemeName; // SVG only: also draw this theme and switch with prefers-color-scheme
  watermark?: boolean;
  licenseKey?: string;
  animated?: boolean;
  prompt?: PromptStyle;
  format?: 'svg' | 'html' | 'gif' | 'both';
}

export interface Cell {
  char: string;
  fg: string;
  bg: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface Frame {
  grid: Cell[][];
  cursorX: number;
  cursorY: number;
  cursorVisible: boolean;
  timestampMs: number;
}

export interface RecordOptions {
  cols?: number;
  rows?: number;
  fps?: number;
  maxDurationMs?: number;
  theme?: ThemeName;
}

export interface RecordResult {
  frames: Frame[];
  rawText: string;
}
