#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const license_1 = require("./license");
const recorder_1 = require("./recorder");
const themes_1 = require("./themes");
const script_1 = require("./script");
const cast_1 = require("./cast");
const pipeline_1 = require("./pipeline");
const server_1 = require("./server");
const svg_1 = require("./renderer/svg");
const crop_1 = require("./crop");
const redact_1 = require("./redact");
const wizard_1 = require("./wizard");
const BUY_URL = 'https://buy.polar.sh/polar_cl_H2APhJzqleLe4Z7FjOmFQ2yGColjaWTqqzhyr2oN5K1';
const shellName = path.basename(process.env.SHELL || 'sh');
const program = new commander_1.Command();
program
    .name('ttyreel')
    .description('Turn terminal output into polished SVG, GIF, PNG and HTML: recorded, typed, scripted or imported from asciinema')
    .version('0.2.2');
const fail = (err, what = 'Error') => {
    process.exitCode = 1;
    console.error(`[ttyreel] ${what}: ${err.message || err}`);
};
// ── shared options ────────────────────────────────────────────────────────────
function styleOptions(cmd) {
    return cmd
        .option('-t, --theme <name>', `Theme: ${Object.keys(themes_1.THEMES).join(', ')}`, 'dracula')
        .option('--theme-file <path>', 'Use your own theme from a JSON file (see the README)')
        .option('--light-theme <name>', 'SVG only: also draw this theme and switch to it when the viewer prefers a light colour scheme')
        .option('-g, --gradient <name>', `Background gradient: ${Object.keys(themes_1.GRADIENTS).join(', ')} (default: the theme's own)`)
        .option('--title <title>', 'Window title bar text')
        .option('--font <family>', 'Font family for the terminal text (SVG/HTML; GIF and PNG use the installed monospace font)')
        .option('--font-size <px>', 'Font size in pixels', '14')
        .option('--padding <px>', 'Space around the window in pixels', '35')
        .option('--no-window', 'No title bar and traffic lights: just the terminal');
}
function outputOptions(cmd, defaultOutput) {
    return cmd
        .option('-o, --output <path>', 'Output path without extension (an extension is ignored)', defaultOutput)
        .option('--format <list>', 'svg, html, gif, png, both (svg+html), all; comma-separated to combine', 'svg')
        .option('--animated', 'SVG: play back the recorded frames as an animation')
        .option('--no-loop', 'Animations (SVG, GIF) play once instead of repeating')
        .option('--scale <n>', 'Pixel scale for GIF and PNG (2 = sharp on retina screens)', '1')
        .option('--speed <n>', 'Playback speed: 2 = twice as fast, 0.5 = half speed', '1')
        .option('--lines <from-to>', 'Only draw these lines of the screen, e.g. 3-8')
        .option('--redact <regex...>', 'Also mask everything matching these regular expressions')
        .option('--no-redact', 'Do not mask tokens, keys and passwords automatically')
        .option('--markdown', 'Print a Markdown image line for the first file written')
        .option('-l, --license <key>', 'Polar.sh Pro License Key');
}
function recordingOptions(cmd) {
    return cmd
        .option('--fps <n>', 'Frames sampled per second while recording', '10')
        .option('--max-duration <seconds>', 'Stop recording after this many seconds', '30')
        .option('--cols <n>', 'Terminal columns', '80')
        .option('--rows <n>', 'Terminal rows', '24')
        .option('--type', 'Show the prompt and type the command before running it')
        .option('--type-speed <ms>', 'Milliseconds per typed character', '45')
        .option('--prompt <style>', 'Prompt for typed commands: zsh, bash, starship, none, or your own text', 'zsh');
}
const int = (v, name, min, max) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max)
        throw new Error(`--${name} must be a number between ${min} and ${max}`);
    return n;
};
/** Everything the look of the output depends on, validated. `scriptDefaults` fill what the flags left at their defaults. */
function renderSettings(opts, cmd, licensed, scriptDefaults = {}) {
    const fromCli = (name) => cmd.getOptionValueSource(name) === 'cli';
    const themeFile = opts.themeFile ?? scriptDefaults.themeFile;
    let theme = fromCli('theme') || !scriptDefaults.theme ? opts.theme : scriptDefaults.theme;
    if (themeFile)
        theme = (0, themes_1.registerThemeFile)(themeFile);
    if (!themes_1.THEMES[theme])
        throw new Error(`Unknown theme "${theme}". Available: ${Object.keys(themes_1.THEMES).join(', ')}`);
    const lightTheme = opts.lightTheme;
    if (lightTheme && !themes_1.THEMES[lightTheme])
        throw new Error(`Unknown light theme "${lightTheme}". Available: ${Object.keys(themes_1.THEMES).join(', ')}`);
    const gradient = opts.gradient ?? scriptDefaults.gradient;
    if (gradient && !(gradient in themes_1.GRADIENTS))
        throw new Error(`Unknown gradient "${gradient}". Available: ${Object.keys(themes_1.GRADIENTS).join(', ')}`);
    return {
        theme,
        lightTheme,
        gradient: gradient,
        title: opts.title ?? scriptDefaults.title,
        fontFamily: opts.font,
        fontSize: int(opts.fontSize, 'font-size', 8, 40),
        padding: int(opts.padding, 'padding', 0, 200),
        windowless: opts.window === false,
        watermark: !licensed
    };
}
function outputSettings(opts, render, fps) {
    const extra = (opts.redact === true ? [] : opts.redact || []);
    return {
        output: opts.output,
        formats: (0, pipeline_1.parseFormats)(opts.format),
        animated: Boolean(opts.animated),
        scale: int(opts.scale, 'scale', 0.25, 8),
        loop: opts.loop !== false,
        speed: Number(opts.speed),
        lines: opts.lines ? (0, pipeline_1.parseLineRange)(opts.lines) : undefined,
        fps,
        redact: { auto: opts.redact !== false, extra: extra.map((p) => new RegExp(p, 'g')) },
        render
    };
}
async function finish(frames, rawText, settings, opts, licensed) {
    const result = await (0, pipeline_1.writeOutputs)(frames, rawText, settings);
    for (const file of result.files)
        console.log(`  ✨ Created ${path.extname(file).slice(1).toUpperCase()}: ${file}`);
    if (result.redacted > 0)
        console.error(`[ttyreel] ${result.redacted} secret${result.redacted === 1 ? '' : 's'} masked in the output (--no-redact turns this off).`);
    if (opts.markdown)
        console.log(`![${settings.render.title || 'terminal'}](${path.relative(process.cwd(), result.files[0]) || result.files[0]})`);
    if (!licensed)
        console.error(`\n💡 Support development and remove the watermark: ${BUY_URL}`);
}
async function license(opts) {
    const check = await (0, license_1.validatePolarLicense)(opts.license);
    console.error(`[ttyreel] License Status: ${check.message}`);
    return check.valid;
}
// ── license ───────────────────────────────────────────────────────────────────
program
    .command('license [key]')
    .description('Activate, check, or clear Polar.sh Pro license key')
    .option('--clear', 'Clear stored license key')
    .option('--status', 'Check active license status')
    .action(async (key, options) => {
    try {
        if (options.clear) {
            await (0, license_1.clearSavedLicense)();
            console.log('[ttyreel] Saved license key cleared. Switched to Free Tier.');
            return;
        }
        if (key) {
            console.log('[ttyreel] Validating license key...');
            const result = await (0, license_1.saveLicenseKey)(key);
            if (result.valid) {
                console.log(`\n✨ ${result.message}`);
                console.log('   License successfully activated and saved locally!\n');
            }
            else {
                process.exitCode = 1;
                console.error(`\n❌ ${result.message}`);
                console.error(`   Please verify your key at ${BUY_URL}\n`);
            }
            return;
        }
        const activeKey = await (0, license_1.getSavedLicenseKey)();
        const result = await (0, license_1.validatePolarLicense)(activeKey);
        console.log('\n[ttyreel] License Status:');
        console.log(`  State : ${result.valid ? 'PRO ACTIVE ✓' : 'FREE TIER'}`);
        console.log(`  Key   : ${activeKey ? (0, license_1.maskKey)(activeKey) : 'None'}`);
        console.log(`  Info  : ${result.message}`);
        if (!result.valid)
            console.log(`\n💡 Buy Pro License: ${BUY_URL}\n`);
    }
    catch (err) {
        fail(err, 'License error');
    }
});
// ── render ────────────────────────────────────────────────────────────────────
recordingOptions(outputOptions(styleOptions(program.command('render <cmd>').description('Run a command and record its real terminal output as SVG, GIF, PNG or HTML')), 'terminal-output')).action(async (cmdString, opts, cmd) => {
    try {
        const licensed = await license(opts);
        const render = renderSettings(opts, cmd, licensed, { title: undefined });
        render.title = render.title || `${shellName} — ${cmdString}`;
        const fps = int(opts.fps, 'fps', 1, 60);
        console.error(`[ttyreel] Recording: "${cmdString}"...`);
        const rec = await (0, recorder_1.recordSession)([{ cmd: cmdString }], {
            cols: int(opts.cols, 'cols', 20, 300), rows: int(opts.rows, 'rows', 3, 100), fps,
            maxDurationMs: int(opts.maxDuration, 'max-duration', 1, 600) * 1000, theme: render.theme,
            typing: Boolean(opts.type), typeSpeedMs: int(opts.typeSpeed, 'type-speed', 0, 1000), prompt: opts.prompt
        });
        await finish(rec.frames, rec.rawText, outputSettings(opts, render, fps), opts, licensed);
    }
    catch (err) {
        fail(err);
    }
});
// ── play ──────────────────────────────────────────────────────────────────────
recordingOptions(outputOptions(styleOptions(program.command('play <script>').description('Record several commands from a YAML or JSON script (prompt, typing, pauses) into one demo')), 'demo')).action(async (file, opts, cmd) => {
    try {
        const licensed = await license(opts);
        const script = (0, script_1.loadScript)(file);
        const render = renderSettings(opts, cmd, licensed, { theme: script.theme, themeFile: script.themeFile, gradient: script.gradient, title: script.title });
        render.title = render.title || script.title || path.basename(file, path.extname(file));
        const fromCli = (n) => cmd.getOptionValueSource(n) === 'cli';
        const fps = int(opts.fps, 'fps', 1, 60);
        console.error(`[ttyreel] Playing ${script.steps.length} step${script.steps.length === 1 ? '' : 's'} from ${file}...`);
        const rec = await (0, recorder_1.recordSession)(script.steps, {
            cols: fromCli('cols') || !script.cols ? int(opts.cols, 'cols', 20, 300) : script.cols,
            rows: fromCli('rows') || !script.rows ? int(opts.rows, 'rows', 3, 100) : script.rows,
            fps, maxDurationMs: int(opts.maxDuration, 'max-duration', 1, 600) * 1000, theme: render.theme,
            typing: fromCli('type') ? Boolean(opts.type) : script.typing,
            typeSpeedMs: fromCli('typeSpeed') || script.typeSpeed === undefined ? int(opts.typeSpeed, 'type-speed', 0, 1000) : script.typeSpeed,
            prompt: fromCli('prompt') || !script.prompt ? opts.prompt : script.prompt
        });
        const settings = outputSettings(opts, render, fps);
        if (cmd.getOptionValueSource('output') !== 'cli')
            settings.output = path.join(path.dirname(path.resolve(file)), path.basename(file, path.extname(file)));
        await finish(rec.frames, rec.rawText, settings, opts, licensed);
    }
    catch (err) {
        fail(err);
    }
});
// ── cast ──────────────────────────────────────────────────────────────────────
outputOptions(styleOptions(program.command('cast <file>').description('Convert an asciinema recording (.cast, format v2 or v3) to SVG, GIF, PNG or HTML')), 'cast-output')
    .option('--fps <n>', 'Frames sampled per second', '10')
    .option('--idle-limit <seconds>', 'Shorten pauses longer than this (0 = keep real timing)', '2')
    .action(async (file, opts, cmd) => {
    try {
        const licensed = await license(opts);
        const render = renderSettings(opts, cmd, licensed);
        render.title = render.title || path.basename(file, path.extname(file));
        const fps = int(opts.fps, 'fps', 1, 60);
        const { frames } = await (0, cast_1.loadCastFrames)(file, { fps, theme: render.theme, idleLimit: int(opts.idleLimit, 'idle-limit', 0, 3600) });
        await finish(frames, undefined, outputSettings(opts, render, fps), opts, licensed);
    }
    catch (err) {
        fail(err);
    }
});
// ── demo ──────────────────────────────────────────────────────────────────────
const DEMO_STEPS = [
    { cmd: "printf '\\033[32m✔\\033[0m \\033[1mmy-app\\033[0m initialized successfully\\n'", show: 'my-app init', type: true, pause: 300 },
    { cmd: "printf '\\033[36m›\\033[0m Watching \\033[34m~/projects/my-app/docs\\033[0m\\n'", show: 'my-app watch docs', type: true, pause: 400 },
    { cmd: "printf '\\033[33m⚡\\033[0m Synced \\033[1m184 notes\\033[0m in 42ms (0 errors)\\n'", show: 'my-app sync', type: true, pause: 600 }
];
recordingOptions(outputOptions(styleOptions(program.command('demo').description('Generate a quick typed demo to see what ttyreel looks like')), 'ttyreel-demo')).action(async (opts, cmd) => {
    try {
        const licensed = await license(opts);
        const render = renderSettings(opts, cmd, licensed);
        render.title = render.title || 'ttyreel — demo';
        const fps = int(opts.fps, 'fps', 1, 60);
        const rec = await (0, recorder_1.recordSession)(DEMO_STEPS, { cols: 64, rows: 8, fps, theme: render.theme, typing: true, typeSpeedMs: int(opts.typeSpeed, 'type-speed', 0, 1000), prompt: opts.prompt });
        const settings = outputSettings({ ...opts, animated: opts.animated }, render, fps);
        await finish(rec.frames, rec.rawText, settings, opts, licensed);
    }
    catch (err) {
        fail(err);
    }
});
// ── serve ─────────────────────────────────────────────────────────────────────
styleOptions(program.command('serve <cmd>').description('Record a command and open a live preview in the browser (only reachable from this computer)'))
    .option('--animated', 'Play back the real recorded frames as an animated SVG')
    .option('--port <n>', 'Port to listen on (the next free one is used if it is taken)', '3333')
    .option('--no-open', 'Do not open the browser')
    .option('--watch <paths...>', 'Record again whenever a file in these folders or files changes; the browser reloads by itself')
    .option('--cols <n>', 'Terminal columns', '80')
    .option('--rows <n>', 'Terminal rows', '24')
    .option('--no-redact', 'Do not mask tokens, keys and passwords automatically')
    .action(async (cmdString, opts, cmd) => {
    try {
        const render = renderSettings(opts, cmd, true);
        render.title = render.title || `${shellName} — ${cmdString}`;
        const cols = int(opts.cols, 'cols', 20, 300);
        const rows = int(opts.rows, 'rows', 3, 100);
        const record = async () => {
            console.error(`[ttyreel] Recording: "${cmdString}" for live preview...`);
            const rec = await (0, recorder_1.recordSession)([{ cmd: cmdString }], { cols, rows, fps: 10, maxDurationMs: 30000, theme: render.theme, typing: false, prompt: 'none' });
            const frames = (0, redact_1.redactFrames)((0, crop_1.cropBlankRows)(rec.frames), { auto: opts.redact !== false }).frames;
            return opts.animated ? (0, svg_1.renderAnimatedGridFrames)(frames, render) : (0, svg_1.renderGridFrame)(frames[frames.length - 1], render);
        };
        const watching = opts.watch;
        const server = (0, server_1.startPreviewServer)(await record(), int(opts.port, 'port', 1, 65535), opts.open !== false, Boolean(watching));
        if (watching && watching.length) {
            let busy = false;
            let again = false;
            let timer;
            const rerun = async () => {
                if (busy) {
                    again = true;
                    return;
                }
                busy = true;
                try {
                    server.update(await record());
                }
                catch (err) {
                    console.error(`[ttyreel] ${err.message}`);
                }
                busy = false;
                if (again) {
                    again = false;
                    void rerun();
                }
            };
            for (const p of watching) {
                fs.watch(p, { recursive: true }, (_evt, name) => {
                    if (name && /(^|[\\/])(node_modules|\.git)([\\/]|$)/.test(String(name)))
                        return;
                    clearTimeout(timer);
                    timer = setTimeout(() => void rerun(), 400);
                });
                console.error(`[ttyreel] Watching ${p}`);
            }
        }
    }
    catch (err) {
        fail(err, 'Preview Error');
    }
});
program
    .command('wizard')
    .description('Step-by-step assistant: answers a few questions, shows the command and runs it')
    .action(() => (0, wizard_1.wizard)().catch((err) => { process.exitCode = 1; console.error(`[ttyreel] ${err.message || err}`); }));
program.parse(process.argv);
