# 🎬 TermCast: Pretty Terminal SVG & GIF Studio

[![npm version](https://img.shields.io/npm/v/termcast.svg)](https://www.npmjs.com/package/termcast)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Support on Polar](https://img.shields.io/badge/Support_TermCast-Polar-0066FF.svg?style=flat-square&logo=polar)](https://buy.polar.sh/polar_cl_BN6xwyJH2Drn6WuzvV49E2KCGauvtoTHixD3w1hCpSH)
[![Created by abteilung83](https://img.shields.io/badge/Crafted%20by-abteilung83-black.svg)](https://github.com/aeon022)

**TermCast** is a zero-dependency CLI tool engineered by **abteilung83**. It captures terminal outputs or shell commands, applies modern developer aesthetics (macOS glassmorphism window frame with traffic-light buttons, vibrant gradient backgrounds, syntax themes), and exports crisp, scalable vector SVGs for GitHub READMEs, ProductHunt launches, and X/Twitter demos.

---

## 🚀 Quickstart & Tutorial

Follow this 1-minute tutorial to generate beautiful terminal graphics.

### Step 1: Install TermCast
Install globally via npm or run directly using `npx`:

```bash
npm install -g termcast
```

### Step 2: Generate a Quick Demo
Generate an instant demo vector SVG:

```bash
termcast demo --theme dracula --output termcast-demo.svg
```

### Step 3: Render Any Shell Command Output
Render the styled output of any command (e.g. `ls -la`, `git status`, `npm test`):

```bash
termcast render "git status" --theme tokyonight --title "my-app — git status" --output git-status.svg
```

---

## 🎨 Built-In Themes

Choose from built-in developer color palettes:
- `dracula` (Default)
- `tokyonight`
- `nord`
- `catppuccin`
- `monokai`

Example:
```bash
termcast render "npm test" --theme catppuccin --output test-output.svg
```

---

## ✨ Features

- 🎨 **Glassmorphism Window Frames**: macOS window controls (red/yellow/green) with soft drop shadows.
- 🌈 **Gradient Canvas Backgrounds**: Vibrant developer gradients out of the box.
- ⚡ **Pure Vector SVG**: Sharp text at any zoom level, tiny file size, instant page loading.
- 🔤 **ANSI Color Code Support**: Preserves ANSI colors (green checkmarks, cyan paths, yellow warnings).
- 🔑 **Polar.sh Pro License**: Unlock watermark removal and custom canvas styling.

---

## 💜 Pro License & Support

Support further development and remove the watermark!

👉 **[Support & Unlock Pro on Polar](https://buy.polar.sh/polar_cl_BN6xwyJH2Drn6WuzvV49E2KCGauvtoTHixD3w1hCpSH)**

---

## 🏢 About abteilung83

**TermCast** is engineered and maintained by **abteilung83** — specializing in developer tools, CLI utilities, workflow automation, and open-source integrations.

- **GitHub**: [@aeon022](https://github.com/aeon022)

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
