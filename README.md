# 🎬 ttyreel

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![ci](https://github.com/aeon022/ttyreel/actions/workflows/ci.yml/badge.svg)](https://github.com/aeon022/ttyreel/actions/workflows/ci.yml)
[![Created by abteilung83](https://img.shields.io/badge/Crafted%20by-abteilung83-black.svg)](https://github.com/aeon022)

**Turn terminal output into polished images for READMEs, docs and posts.** Record a command, type it out like a screencast, run a whole demo from a script, or convert an asciinema recording. Output is SVG (static or animated, light/dark aware), GIF, PNG or HTML with a copy button. Tokens and passwords are **masked automatically**.

![ttyreel demo](docs/demo.svg)

*This image was made with `ttyreel play docs/demo.yml`.*

---

## Install

Needs Node 18+. Try it without installing:

```bash
npx github:aeon022/ttyreel demo
```

Install it (keep the cloned folder: the global command links to it):

```bash
git clone https://github.com/aeon022/ttyreel.git
cd ttyreel
npm install --omit=dev
npm install -g .
```

`node-pty` (it runs your command in a real terminal) ships ready-made binaries for macOS and Windows. On Linux npm compiles it, so you need a C++ compiler and Python (`sudo apt install build-essential python3`).

## Quick start

New to the terminal? Run `ttyreel wizard`: it asks a few questions, shows the command and runs it.

```bash
ttyreel demo                                        # see what it looks like
ttyreel render "git status" -o status               # run a command, write status.svg
ttyreel render "npm test" --type --animated         # type the command, play the output back
ttyreel render "ls -la" --format svg,png --scale 2  # also a sharp PNG for retina screens
ttyreel play demo.yml                               # several commands from a script
ttyreel cast session.cast --format gif              # asciinema recording → GIF
ttyreel serve "npm test" --watch src                # live preview that reloads when files change
```

Files are written next to where you run it (`-o path` sets the name, the extension is added for you). The paths go to stdout; status and hints go to stderr, so pipes stay clean.

## What it can do

- **Real output:** the command runs in a pseudoterminal, so colours, progress bars and cursor movement look like in your terminal.
- **Typing:** `--type` shows a prompt (`--prompt zsh|bash|starship|none|"your text"`) and types the command character by character (`--type-speed 45`).
- **Scripts:** a YAML or JSON file with steps, pauses and what to show while typing (see below).
- **asciinema:** `ttyreel cast file.cast` reads format v2 and v3 and shortens long pauses (`--idle-limit 2`).
- **Formats:** `--format svg,html,gif,png` (`both` = svg+html, `all` = everything). `--animated` plays the recording back in the SVG, `--no-loop` plays it once, `--speed 2` doubles the pace, `--scale 2` doubles GIF/PNG pixels, `--lines 3-8` draws only those rows.
- **Fits the content:** the window is as tall as the output, not a fixed terminal.
- **Secrets masked:** GitHub, OpenAI/Anthropic-style, AWS, Slack, Stripe and Google keys, JWTs, `Bearer` tokens, passwords in URLs, `password=…`/`token=…` values and private-key blocks are replaced by `•••` in the image **and in the window title** (which usually is the command line). `--redact REGEX` adds your own patterns, `--no-redact` turns it off. It is a safety net, not a guarantee: look at what you publish.
- **Light and dark:** `--light-theme github-light` makes an SVG that switches with the viewer's colour scheme (GitHub honours this).
- **Look:** 12 themes, 7 gradients, `--theme-file`, `--font`, `--font-size`, `--padding`, `--no-window`, `--title`.
- **Preview server:** `serve` is reachable from your computer only (127.0.0.1); with `--watch` it records again when files change (`--no-open` skips opening the browser).

## Themes and gradients

`dracula` (default), `tokyonight`, `nord`, `catppuccin`, `monokai`, `gruvbox`, `solarized-dark`, `solarized-light`, `one-dark`, `github-dark`, `github-light`. Gradients: `default`, `cyberpunk`, `sunset`, `matrix`, `hyper`, `neon`, `midnight`; without `-g` the theme's own gradient is used.

Your own theme is a JSON file:

```json
{
  "name": "Mine",
  "background": "#101010",
  "foreground": "#eeeeee",
  "titleBar": "#0a0a0a",
  "gradientBackground": "linear-gradient(135deg, #ff0080 0%, #00f0ff 100%)",
  "colors": { "black": "#000000", "red": "#ff0000", "green": "#00ff00", "yellow": "#ffff00",
              "blue": "#0000ff", "magenta": "#ff00ff", "cyan": "#00ffff", "white": "#ffffff" }
}
```

`ttyreel render "ls" --theme-file mine.json`. `titleBar` and `gradientBackground` are optional.

## Demo scripts

```yaml
# demo.yml
title: Set up my-app
theme: tokyonight
prompt: starship
cols: 70
steps:
  - cmd: npm install
    pause: 800
  - cmd: "node build.js --release"
    show: my-app build          # typed instead of the real command
  - cmd: echo done
    type: false                 # no prompt, no typing for this step
```

`ttyreel play demo.yml --animated --format svg,gif`. Flags on the command line win over the file. The output is named after the script. Steps run in your shell like a Makefile: only play scripts you trust.

## GitHub Action

Keep README demos current:

```yaml
- uses: aeon022/ttyreel@main
  with:
    script: docs/demo.yml
    output: docs/demo
    format: svg
    args: --animated --light-theme github-light
```

## Good to know

- The GIF/PNG text is drawn with the monospace and symbol fonts installed on your computer. Rare symbols may come from a fallback font and look slightly different; SVG and HTML use the viewer's fonts.
- Without a licence the images carry a small "Crafted with ttyreel" line. A Pro licence (`ttyreel license <key>`) removes it and supports development: **[ttyreel Pro on Polar](https://buy.polar.sh/polar_cl_H2APhJzqleLe4Z7FjOmFQ2yGColjaWTqqzhyr2oN5K1)**. Everything else is free.
- Third-party notices (colour schemes, dependencies): [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## 📄 License

MIT, see [LICENSE](LICENSE).
