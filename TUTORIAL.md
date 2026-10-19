# 🎬 ttyreel — Comprehensive Tutorial & How-To Guide

Welcome to the **ttyreel** tutorial! This guide covers real-world workflows, command-line recipes, and customization options for generating beautiful terminal vector SVGs and interactive HTML embeds.

---

## 📚 Table of Contents

1. [Quick Installation](#1-quick-installation)
2. [Workflow 1: Generating Animated Demo SVGs for GitHub READMEs](#workflow-1-generating-animated-demo-svgs-for-github-readmes)
3. [Workflow 2: Rendering Real Terminal Command Output](#workflow-2-rendering-real-terminal-command-output)
4. [Workflow 3: Using Interactive HTML Embeds with Copy Button](#workflow-3-using-interactive-html-embeds-with-copy-button)
5. [Workflow 4: Live Web Preview Server](#workflow-4-live-web-preview-server)
6. [Workflow 5: Customizing Themes, Gradients & Shell Prompts](#workflow-5-customizing-themes-gradients--shell-prompts)
7. [Pro License Activation](#pro-license-activation)

---

## 1. Quick Installation

Install ttyreel globally via npm:

```bash
git clone https://github.com/aeon022/ttyreel.git && cd ttyreel && npm install --omit=dev && npm install -g .
```

Or run any command without installing via `npx`:

```bash
npx github:aeon022/ttyreel demo
```

---

## Workflow 1: Generating Animated Demo SVGs for GitHub READMEs

To create an animated vector SVG showcasing a demo session with a blinking cursor:

```bash
ttyreel demo --animated --gradient cyberpunk --format svg --output demo-showcase.svg
```

This generates `demo-showcase.svg` which can be directly embedded into your GitHub `README.md`:

```markdown
![ttyreel Demo](./demo-showcase.svg)
```

---

## Workflow 2: Rendering Real Terminal Command Output

You can render the output of any shell command (such as `git status`, `ls -la`, or `npm test`):

```bash
ttyreel render "git status" --animated --prompt starship --theme tokyonight --output git-status
```

This captures the output, formats ANSI color codes, and exports `git-status.svg`.

---

## Workflow 3: Using Interactive HTML Embeds with Copy Button

To generate a standalone HTML snippet featuring a **Copy Code** button, line numbers, and glassmorphism styling for your website or documentation site:

```bash
ttyreel render "npm test" --format html --output npm-test
```

This generates `npm-test.html` which you can embed directly into your documentation site or web page.

---

## Workflow 4: Live Web Preview Server

Want to tweak options and see the rendered terminal graphic live in your browser? Use `ttyreel serve`:

```bash
ttyreel serve "ls -la" --animated --theme dracula
```

This spins up a local web server at `http://localhost:3333` and automatically opens your default browser with live SVG preview!

---

## Workflow 5: Customizing Themes, Gradients & Shell Prompts

### Themes (`-t` / `--theme`)
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

### Shell Prompt Badges (`--prompt`)
- `zsh`: `user@macbook:~/Projects/my-app git:(main) ❯`
- `starship`: `📁 my-app on 🌿 main [⚡ 42ms] ❯`

### Recipe Example:
```bash
ttyreel render "npm run build" \
  --theme catppuccin \
  --gradient hyper \
  --prompt starship \
  --animated \
  --format both \
  --output build-showcase
```

---

## Pro License Activation

Unlock watermark removal and custom styling by activating your Polar license key:

```bash
ttyreel render "git status" --license polar_cl_YOUR_POLAR_KEY
```

👉 **[Get Pro License on Polar](https://buy.polar.sh/polar_cl_H2APhJzqleLe4Z7FjOmFQ2yGColjaWTqqzhyr2oN5K1)**

---

Crafted with 💜 by **abteilung83**.
