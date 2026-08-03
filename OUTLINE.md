# 🎬 TermCast: Pretty Terminal GIF & SVG Studio (CLI)

**TermCast** is a zero-dependency CLI tool that captures terminal output, applies modern developer aesthetics (macOS glassmorphism window frames, vibrant gradient backgrounds, syntax highlighting themes), and exports crisp animated SVGs or GIFs for GitHub READMEs, ProductHunt launches, and X/Twitter demos.

---

## 🏗️ Architecture & Component Breakdown

```
TermCast/
├── src/
│   ├── index.ts          # CLI entry point (Commander)
│   ├── recorder.ts       # ANSI process capture & timing engine
│   ├── parser.ts         # ANSI color code & sequence parser
│   ├── renderer/
│   │   ├── svg.ts        # Animated SVG generator (pure vector)
│   │   └── themes.ts     # Theme definitions (Dracula, Nord, Tokyo Night, Catppuccin)
│   ├── exporter.ts       # Output formatter (SVG, GIF, HTML)
│   └── license.ts        # Polar.sh license key validator
├── tests/
│   └── recorder.test.ts
├── package.json
├── tsconfig.json
├── README.md
└── OUTLINE.md
```

---

## ⚡ Core Features

1. **CLI Process Capture**: Run `termcast record "npm test"` to capture commands and output with real-time delays.
2. **Beautiful Themes**: Built-in dark modes, glassmorphism shadows, macOS window buttons, custom gradients.
3. **Pure SVG Animations**: Lightweight CSS keyframe SVGs (scalable, sharp text, tiny file size).
4. **Polar License Key Integration**: Free tier includes watermark; Pro tier unlocked via Polar checkout key (`--license-key=...`).

---

## 💰 Monetization Plan (Polar.sh Integration)

- **Free Version**: Renders SVG with `--watermarked=true` badge.
- **Pro License ($15 One-time via Polar)**:
  - `--no-watermark` option.
  - Custom font selection & custom background gradients.
  - High-fps GIF / MP4 export.
