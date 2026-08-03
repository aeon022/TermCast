export type ThemeName = 'dracula' | 'tokyonight' | 'nord' | 'catppuccin' | 'monokai';
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
  watermark?: boolean;
  licenseKey?: string;
  animated?: boolean;
  prompt?: PromptStyle;
  format?: 'svg' | 'html' | 'both';
}
