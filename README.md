# 🎬 TermCast: Pretty Terminal SVG & GIF Studio

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Support on Polar](https://img.shields.io/badge/Support_TermCast-Polar-0066FF.svg?style=flat-square&logo=polar)](https://buy.polar.sh/polar_cl_H2APhJzqleLe4Z7FjOmFQ2yGColjaWTqqzhyr2oN5K1)
[![Created by abteilung83](https://img.shields.io/badge/Crafted%20by-abteilung83-black.svg)](https://github.com/aeon022)

**TermCast** is a CLI tool engineered by **abteilung83**. It captures terminal outputs or shell commands, applies modern developer aesthetics (macOS glassmorphism window frame with traffic-light buttons, vibrant gradient backgrounds, syntax themes), and exports crisp, scalable vector SVGs and interactive HTML embeds for GitHub READMEs, ProductHunt launches, and X/Twitter demos.

![TermCast demo](docs/demo.svg)

*This image was made with `termcast render`.*

---

## 🔥 Ultra-Cool Features

- ⌨️ **Pure CSS Typing Animation (`--animated`)**: Generates SVGs where text types out line-by-line with a blinking cursor without any JavaScript!
- 🌈 **7 Gradient Canvas Presets (`-g default / cyberpunk / sunset / matrix / hyper / neon / midnight`)**: Instant vibrant gradient backgrounds.
- ✂️ **Fits the content**: the window is cropped to the lines your command printed, not drawn as a fixed 24-row terminal.
- 💡 **Interactive HTML Embeds (`--format html`)**: Standalone HTML component with a **Copy Code** button, line numbers, and hover effects.
- ⚡ **Instant Live Preview Web Server (`termcast serve`)**: Launches a local web server to preview your rendered terminal graphics in real-time in your browser!
- 🤖 **ZSH & Starship Prompt Generators (`demo --prompt zsh / starship`)**: Renders ZSH or Starship shell badges (`main 🌿`, `📁 my-app`).

---

## 🚀 Quickstart & Tutorial

### 1. Installation
Needs Node 18+. Try it without installing:

```bash
npx github:aeon022/TermCast demo
```

Install it (keep the cloned folder: the global command links to it):

```bash
git clone https://github.com/aeon022/TermCast.git
cd TermCast
npm install --omit=dev
npm install -g .
```

> **Do not run `npm install -g termcast`:** that name on npm belongs to a different project ("Raycast for the terminal"), not to this tool.

### 2. Generate Animated Demo SVG & HTML Embed
Generate animated graphics with custom gradient background:

```bash
termcast demo --animated --gradient cyberpunk --format both
```

### 3. Render Any Shell Command Output with Starship Prompt
Render the output of any command (e.g. `ls -la`, `git status`, `npm test`):

```bash
termcast render "git status" --animated --theme tokyonight --format both --output git-status
```

### 4. Launch Instant Live Preview in Browser
Preview any command output live in your default browser:

```bash
termcast serve "npm test"
```

The preview is served on `127.0.0.1` only (command output can contain secrets); if port 3333 is taken the next free port is used.

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

👉 **[Support & Unlock Pro on Polar](https://buy.polar.sh/polar_cl_H2APhJzqleLe4Z7FjOmFQ2yGColjaWTqqzhyr2oN5K1)**

---

## 🏢 About abteilung83

**TermCast** is engineered and maintained by **abteilung83** — specializing in developer tools, CLI utilities, workflow automation, and open-source integrations.

- **GitHub**: [@aeon022](https://github.com/aeon022)

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
