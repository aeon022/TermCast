# 🎬 TermCast: Pretty Terminal SVG & GIF Studio

[![npm version](https://img.shields.io/npm/v/termcast.svg)](https://www.npmjs.com/package/termcast)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Support on Polar](https://img.shields.io/badge/Support_TermCast-Polar-0066FF.svg?style=flat-square&logo=polar)](https://buy.polar.sh/polar_cl_BN6xwyJH2Drn6WuzvV49E2KCGauvtoTHixD3w1hCpSH)
[![Created by abteilung83](https://img.shields.io/badge/Crafted%20by-abteilung83-black.svg)](https://github.com/aeon022)

**TermCast** is a zero-dependency CLI tool engineered by **abteilung83**. It captures terminal outputs or shell commands, applies modern developer aesthetics (macOS glassmorphism window frame with traffic-light buttons, vibrant gradient backgrounds, syntax themes), and exports crisp, scalable vector SVGs and interactive HTML embeds for GitHub READMEs, ProductHunt launches, and X/Twitter demos.

---

## 🔥 Ultra-Cool Features

- ⌨️ **Pure CSS Typing Animation (`--animated`)**: Generates SVGs where text types out line-by-line with a blinking cursor without any JavaScript!
- 🌈 **7 Gradient Canvas Presets (`-g cyberpunk / sunset / matrix / hyper / neon / midnight`)**: Instant vibrant gradient backgrounds.
- 💡 **Interactive HTML Embeds (`--format html`)**: Standalone HTML component with a **Copy Code** button, line numbers, and hover effects.
- ⚡ **Instant Live Preview Web Server (`termcast serve`)**: Launches a local web server to preview your rendered terminal graphics in real-time in your browser!
- 🤖 **ZSH & Starship Prompt Generators (`--prompt zsh / starship`)**: Renders ZSH or Starship shell badges (`main 🌿`, `📁 my-app`).

---

## 🚀 Quickstart & Tutorial

### 1. Installation
Install globally via npm or run directly using `npx`:

```bash
npm install -g termcast
```

### 2. Generate Animated Demo SVG & HTML Embed
Generate animated graphics with custom gradient background:

```bash
termcast demo --animated --gradient cyberpunk --format both
```

### 3. Render Any Shell Command Output with Starship Prompt
Render the output of any command (e.g. `ls -la`, `git status`, `npm test`):

```bash
termcast render "git status" --animated --prompt starship --theme tokyonight --format both --output git-status
```

### 4. Launch Instant Live Preview in Browser
Preview any command output live in your default browser:

```bash
termcast serve "npm test"
```

---

## 🎨 Built-In Themes & Gradients

### Developer Themes (`-t` / `--theme`)
- `dracula` (Default)
- `tokyonight`
- `nord`
- `catppuccin`
- `monokai`

### Gradient Background Presets (`-g` / `--gradient`)
- `cyberpunk` (Neon Pink to Cyan)
- `sunset` (Warm Orange to Magenta)
- `matrix` (Dark Emerald Green)
- `hyper` (Ultra Purple to Orange)
- `neon` (Electric Green to Blue)
- `midnight` (Deep Slate Purple)

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
