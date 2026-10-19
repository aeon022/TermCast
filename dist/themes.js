"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.THEMES = exports.GRADIENTS = void 0;
exports.gradientStops = gradientStops;
exports.parseThemeFile = parseThemeFile;
exports.registerThemeFile = registerThemeFile;
exports.GRADIENTS = {
    default: 'linear-gradient(135deg, #6272a4 0%, #bd93f9 100%)',
    cyberpunk: 'linear-gradient(135deg, #ff007f 0%, #00f0ff 100%)',
    sunset: 'linear-gradient(135deg, #ff512f 0%, #dd2476 100%)',
    matrix: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
    hyper: 'linear-gradient(135deg, #8A2387 0%, #E94057 50%, #F27121 100%)',
    neon: 'linear-gradient(135deg, #00F260 0%, #0575E6 100%)',
    midnight: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #311042 100%)'
};
exports.THEMES = {
    dracula: {
        name: 'Dracula',
        background: '#282a36',
        foreground: '#f8f8f2',
        titleBar: '#21222c',
        gradientBackground: exports.GRADIENTS.default,
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
        // the classic Monokai palette as shipped by VS Code's MIT-licensed theme-monokai (not the commercial Monokai Pro)
        name: 'Monokai',
        background: '#272822',
        foreground: '#f8f8f2',
        titleBar: '#1e1f1c',
        gradientBackground: 'linear-gradient(135deg, #e6db74 0%, #f92672 100%)',
        colors: {
            black: '#3e3d32',
            red: '#f92672',
            green: '#a6e22e',
            yellow: '#e6db74',
            blue: '#66d9ef',
            magenta: '#ae81ff',
            cyan: '#a1efe4',
            white: '#f8f8f2'
        }
    },
    gruvbox: {
        name: 'Gruvbox Dark',
        background: '#282828',
        foreground: '#ebdbb2',
        titleBar: '#1d2021',
        gradientBackground: 'linear-gradient(135deg, #fabd2f 0%, #fe8019 100%)',
        colors: { black: '#3c3836', red: '#fb4934', green: '#b8bb26', yellow: '#fabd2f', blue: '#83a598', magenta: '#d3869b', cyan: '#8ec07c', white: '#ebdbb2' }
    },
    'solarized-dark': {
        name: 'Solarized Dark',
        background: '#002b36',
        foreground: '#839496',
        titleBar: '#00212b',
        gradientBackground: 'linear-gradient(135deg, #268bd2 0%, #2aa198 100%)',
        colors: { black: '#073642', red: '#dc322f', green: '#859900', yellow: '#b58900', blue: '#268bd2', magenta: '#d33682', cyan: '#2aa198', white: '#eee8d5' }
    },
    'solarized-light': {
        name: 'Solarized Light',
        background: '#fdf6e3',
        foreground: '#657b83',
        titleBar: '#eee8d5',
        gradientBackground: 'linear-gradient(135deg, #b58900 0%, #cb4b16 100%)',
        colors: { black: '#073642', red: '#dc322f', green: '#859900', yellow: '#b58900', blue: '#268bd2', magenta: '#d33682', cyan: '#2aa198', white: '#93a1a1' }
    },
    'one-dark': {
        name: 'One Dark',
        background: '#282c34',
        foreground: '#abb2bf',
        titleBar: '#21252b',
        gradientBackground: 'linear-gradient(135deg, #61afef 0%, #c678dd 100%)',
        colors: { black: '#3f4451', red: '#e06c75', green: '#98c379', yellow: '#e5c07b', blue: '#61afef', magenta: '#c678dd', cyan: '#56b6c2', white: '#abb2bf' }
    },
    'github-dark': {
        name: 'GitHub Dark',
        background: '#0d1117',
        foreground: '#c9d1d9',
        titleBar: '#161b22',
        gradientBackground: 'linear-gradient(135deg, #58a6ff 0%, #bc8cff 100%)',
        colors: { black: '#484f58', red: '#ff7b72', green: '#3fb950', yellow: '#d29922', blue: '#58a6ff', magenta: '#bc8cff', cyan: '#39c5cf', white: '#b1bac4' }
    },
    'github-light': {
        name: 'GitHub Light',
        background: '#ffffff',
        foreground: '#24292f',
        titleBar: '#f6f8fa',
        gradientBackground: 'linear-gradient(135deg, #0969da 0%, #8250df 100%)',
        colors: { black: '#24292f', red: '#cf222e', green: '#116329', yellow: '#9a6700', blue: '#0969da', magenta: '#8250df', cyan: '#1b7c83', white: '#6e7781' }
    }
};
/**
 * Turns a CSS linear-gradient (e.g. "linear-gradient(135deg, #ff007f 0%, #00f0ff 100%)") into SVG <stop>
 * elements. Any number of stops is supported; stops without a percentage are spread evenly.
 * Falls back to the two given colours when the string has fewer than two colours.
 */
function gradientStops(css, fallbackA, fallbackB) {
    const stops = [];
    const re = /(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|hsla?\([^)]*\))\s*(\d+(?:\.\d+)?)?%?/g;
    let m;
    while ((m = re.exec(css)) !== null) {
        stops.push({ color: m[1], offset: m[2] !== undefined ? parseFloat(m[2]) : undefined });
    }
    const list = stops.length >= 2 ? stops : [{ color: fallbackA }, { color: fallbackB }];
    return list
        .map((st, i) => {
        const offset = st.offset !== undefined ? st.offset : (i / (list.length - 1)) * 100;
        return `      <stop offset="${offset}%" stop-color="${st.color}"/>`;
    })
        .join('\n');
}
const HEX = /^#[0-9a-fA-F]{3,8}$/;
const ANSI_KEYS = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'];
/** Checks a user-supplied theme object and fills the optional parts; throws a precise message when it is unusable. */
function parseThemeFile(json, fileName = 'theme') {
    const fail = (m) => { throw new Error(`Invalid theme file ${fileName}: ${m}`); };
    if (!json || typeof json !== 'object')
        fail('expected a JSON object');
    for (const k of ['background', 'foreground'])
        if (!HEX.test(json[k] || ''))
            fail(`"${k}" must be a hex colour like #1e1e2e`);
    const colors = json.colors;
    if (!colors || typeof colors !== 'object')
        fail('missing "colors" with black, red, green, yellow, blue, magenta, cyan, white');
    for (const k of ANSI_KEYS)
        if (!HEX.test(colors[k] || ''))
            fail(`colors.${k} must be a hex colour`);
    if (json.titleBar !== undefined && !HEX.test(json.titleBar))
        fail('"titleBar" must be a hex colour');
    return {
        name: String(json.name || fileName),
        background: json.background,
        foreground: json.foreground,
        titleBar: json.titleBar || json.background,
        gradientBackground: typeof json.gradientBackground === 'string' ? json.gradientBackground : `linear-gradient(135deg, ${colors.blue} 0%, ${colors.magenta} 100%)`,
        colors: Object.fromEntries(ANSI_KEYS.map((k) => [k, colors[k]]))
    };
}
/** Reads a theme from a JSON file, registers it, and returns the name to use for it. */
function registerThemeFile(file) {
    const fs = require('fs');
    const path = require('path');
    let json;
    try {
        json = JSON.parse(fs.readFileSync(file, 'utf8'));
    }
    catch (err) {
        throw new Error(`Cannot read theme file ${file}: ${err.message}`);
    }
    const theme = parseThemeFile(json, path.basename(file));
    const key = `file:${path.basename(file, path.extname(file))}`;
    exports.THEMES[key] = theme;
    return key;
}
