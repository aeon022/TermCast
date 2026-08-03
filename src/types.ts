export type ThemeName = 'dracula' | 'tokyonight' | 'nord' | 'catppuccin' | 'monokai';

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
  title?: string;
  output?: string;
  fontFamily?: string;
  fontSize?: number;
  padding?: number;
  watermark?: boolean;
  licenseKey?: string;
}
