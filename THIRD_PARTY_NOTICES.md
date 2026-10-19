# Third-party notices

ttyreel is MIT-licensed (see `LICENSE`). It contains or uses the following third-party material.

## Colour schemes

The built-in themes use the published colour values of these schemes. ttyreel is not affiliated with or endorsed by their authors.

| Theme | Source | Licence |
|---|---|---|
| Dracula | Dracula Theme, https://draculatheme.com | MIT |
| Tokyo Night | enkia/tokyo-night-vscode-theme | MIT |
| Nord | Arctic Ice Studio / Nord, https://www.nordtheme.com | MIT |
| Catppuccin Mocha | Catppuccin, https://catppuccin.com | MIT |
| Monokai (classic) | the palette shipped in VS Code's `theme-monokai` extension | MIT |
| Gruvbox Dark | Pavel Pertsev, morhetz/gruvbox | MIT / public domain |
| Solarized Dark / Light | Ethan Schoonover, altercation/solarized | MIT |
| One Dark | Atom One Dark syntax theme, atom/atom | MIT |
| GitHub Dark / Light | primer/github-vscode-theme | MIT |

The names and the MIT notices are kept here out of respect for the authors. "Monokai Pro" is a commercial product and is not used.

## Window frame

The three coloured dots in the title bar are a generic window-control motif. ttyreel does not use Apple's icons, fonts or trademarks in its output.

## Dependencies

Runtime dependencies and their licences: `@resvg/resvg-js` (MPL-2.0, used unmodified), `@xterm/headless`, `node-pty`, `commander`, `chalk`, `fs-extra`, `gifenc`, `js-yaml`, `node-fetch` and `ora` (all MIT) plus small transitive packages under MIT, ISC, BSD-2/3-Clause. Run `npm ls --prod` for the full list.

## Fonts

ttyreel does not ship any font. SVG and HTML name the fonts `Menlo, Monaco, 'Courier New', monospace` (the viewer's own fonts are used). For GIF and PNG, resvg reads monospace and symbol fonts that are **already installed on your computer** (on macOS Menlo, Apple Symbols and Arial Unicode; on Linux DejaVu; on Windows Consolas and Segoe UI Symbol) to rasterise the text. Font licences differ. Publishing images of text is common practice, but check your font's licence if you are unsure (this is not legal advice).
