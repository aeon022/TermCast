import { ThemeColors, ThemeName } from './types';

export const THEMES: Record<ThemeName, ThemeColors> = {
  dracula: {
    name: 'Dracula',
    background: '#282a36',
    foreground: '#f8f8f2',
    titleBar: '#21222c',
    gradientBackground: 'linear-gradient(135deg, #6272a4 0%, #bd93f9 100%)',
    colors: {
      black: '#21222c',
      red: '#ff5555',
      green: '#50fa7b',
      yellow: '#f1fa8c',
      blue: '#bd93f9',
      magenta: '#ff79c6',
      cyan: '#8be9fd',
      white: '#f8f8f2'
    }
  },
  tokyonight: {
    name: 'Tokyo Night',
    background: '#1a1b26',
    foreground: '#a9b1d6',
    titleBar: '#16161e',
    gradientBackground: 'linear-gradient(135deg, #7aa2f7 0%, #bb9af7 100%)',
    colors: {
      black: '#15161e',
      red: '#f7768e',
      green: '#9ece6a',
      yellow: '#e0af68',
      blue: '#7aa2f7',
      magenta: '#bb9af7',
      cyan: '#7dcfff',
      white: '#c0caf5'
    }
  },
  nord: {
    name: 'Nord',
    background: '#2e3440',
    foreground: '#d8dee9',
    titleBar: '#242933',
    gradientBackground: 'linear-gradient(135deg, #88c0d0 0%, #81a1c1 100%)',
    colors: {
      black: '#3b4252',
      red: '#bf616a',
      green: '#a3be8c',
      yellow: '#ebcb8b',
      blue: '#81a1c1',
      magenta: '#b48ead',
      cyan: '#88c0d0',
      white: '#e5e9f0'
    }
  },
  catppuccin: {
    name: 'Catppuccin Mocha',
    background: '#1e1e2e',
    foreground: '#cdd6f4',
    titleBar: '#181825',
    gradientBackground: 'linear-gradient(135deg, #cba6f7 0%, #f38ba8 100%)',
    colors: {
      black: '#45475a',
      red: '#f38ba8',
      green: '#a6e3a1',
      yellow: '#f9e2af',
      blue: '#89b4fa',
      magenta: '#cba6f7',
      cyan: '#94e2d5',
      white: '#bac2de'
    }
  },
  monokai: {
    name: 'Monokai Pro',
    background: '#2d2a2e',
    foreground: '#fcfcfa',
    titleBar: '#221f22',
    gradientBackground: 'linear-gradient(135deg, #ffd866 0%, #ff6188 100%)',
    colors: {
      black: '#403e41',
      red: '#ff6188',
      green: '#a9dc76',
      yellow: '#ffd866',
      blue: '#fc9867',
      magenta: '#ab9df2',
      cyan: '#78dce8',
      white: '#fcfcfa'
    }
  }
};
