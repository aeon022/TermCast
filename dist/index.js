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
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const svg_1 = require("./renderer/svg");
const html_1 = require("./renderer/html");
const crop_1 = require("./crop");
const server_1 = require("./server");
const license_1 = require("./license");
const recorder_1 = require("./recorder");
const gif_1 = require("./gif");
const shellName = path.basename(process.env.SHELL || 'sh');
const program = new commander_1.Command();
program
    .name('termcast')
    .description('Pretty Terminal SVG & GIF Studio CLI for GitHub READMEs and Demos')
    .version('0.1.0');
// License Management Command
program
    .command('license [key]')
    .description('Activate, check, or clear Polar.sh Pro license key')
    .option('--clear', 'Clear stored license key')
    .option('--status', 'Check active license status')
    .action(async (key, options) => {
    try {
        if (options.clear) {
            await (0, license_1.clearSavedLicense)();
            console.log('[TermCast] Saved license key cleared. Switched to Free Tier.');
            return;
        }
        if (key) {
            console.log('[TermCast] Validating license key...');
            const result = await (0, license_1.saveLicenseKey)(key);
            if (result.valid) {
                console.log(`\n✨ ${result.message}`);
                console.log('   License successfully activated and saved locally!\n');
            }
            else {
                console.error(`\n❌ ${result.message}`);
                console.error('   Please verify your key at https://buy.polar.sh/polar_cl_H2APhJzqleLe4Z7FjOmFQ2yGColjaWTqqzhyr2oN5K1\n');
            }
            return;
        }
        // Check current status
        const activeKey = await (0, license_1.getSavedLicenseKey)();
        const result = await (0, license_1.validatePolarLicense)(activeKey);
        console.log('\n[TermCast] License Status:');
        console.log(`  State : ${result.valid ? 'PRO ACTIVE ✓' : 'FREE TIER'}`);
        console.log(`  Key   : ${activeKey ? (0, license_1.maskKey)(activeKey) : 'None'}`);
        console.log(`  Info  : ${result.message}`);
        if (!result.valid) {
            console.log('\n💡 Buy Pro License: https://buy.polar.sh/polar_cl_H2APhJzqleLe4Z7FjOmFQ2yGColjaWTqqzhyr2oN5K1\n');
        }
    }
    catch (err) {
        process.exitCode = 1;
        console.error(`[TermCast] License error: ${err.message}`);
    }
});
// Demo Command
program
    .command('demo')
    .description('Generate a quick demo SVG showcasing TermCast styling and animation')
    .option('-t, --theme <name>', 'Theme: dracula, tokyonight, nord, catppuccin, monokai', 'dracula')
    .option('-g, --gradient <name>', 'Gradient: default, cyberpunk, sunset, matrix, hyper, neon, midnight', 'cyberpunk')
    .option('-o, --output <path>', 'Output filepath', 'termcast-demo')
    .option('--animated', 'Enable CSS typing keyframe animation')
    .option('--prompt <style>', 'Prompt style: zsh, starship, bash, none', 'zsh')
    .option('--format <type>', 'Output format: svg, html, both', 'svg')
    .option('-l, --license <key>', 'Polar.sh Pro License Key')
    .action(async (options) => {
    try {
        const licenseCheck = await (0, license_1.validatePolarLicense)(options.license);
        console.log(`[TermCast] License Status: ${licenseCheck.message}`);
        const sampleFrames = [
            { text: '\x1b[32m✔\x1b[0m \x1b[1mmy-app\x1b[0m initialized successfully', delayMs: 100 },
            { text: '\x1b[36mℹ\x1b[0m Watching local directory: \x1b[34m~/projects/my-app/docs\x1b[0m', delayMs: 200 },
            { text: '\x1b[33m⚡\x1b[0m Synced \x1b[1m184 notes\x1b[0m in 42ms (0 errors)', delayMs: 300 },
            { text: '\x1b[32m✔\x1b[0m Output saved to \x1b[35mtermcast-demo.svg\x1b[0m', delayMs: 400 }
        ];
        const renderOpts = {
            theme: options.theme,
            gradient: options.gradient,
            title: 'termcast — zsh (demo)',
            watermark: !licenseCheck.valid,
            animated: options.animated,
            prompt: options.prompt
        };
        const format = options.format || 'svg';
        const baseOutput = options.output.replace(/\.(svg|html)$/, '');
        if (format === 'svg' || format === 'both') {
            const svgContent = (0, svg_1.renderSvgFrame)(sampleFrames, renderOpts);
            const svgPath = path.resolve(`${baseOutput}.svg`);
            await fs.writeFile(svgPath, svgContent, 'utf8');
            console.log(`  ✨ Created SVG: ${svgPath}`);
        }
        if (format === 'html' || format === 'both') {
            const htmlContent = (0, html_1.renderHtmlEmbed)(sampleFrames, renderOpts);
            const htmlPath = path.resolve(`${baseOutput}.html`);
            await fs.writeFile(htmlPath, htmlContent, 'utf8');
            console.log(`  ✨ Created HTML Embed: ${htmlPath}`);
        }
        console.log('\n[TermCast] Execution finished successfully.\n');
        if (!licenseCheck.valid) {
            console.log('💡 Support development and remove the watermark: https://buy.polar.sh/polar_cl_H2APhJzqleLe4Z7FjOmFQ2yGColjaWTqqzhyr2oN5K1');
        }
    }
    catch (err) {
        process.exitCode = 1;
        console.error(`[TermCast] Error generating demo: ${err.message}`);
    }
});
// Render Command
program
    .command('render <cmd>')
    .description('Run a command and record its real terminal output as SVG, GIF, or HTML')
    .option('-t, --theme <name>', 'Theme: dracula, tokyonight, nord, catppuccin, monokai', 'dracula')
    .option('-g, --gradient <name>', 'Gradient: default, cyberpunk, sunset, matrix, hyper, neon, midnight', 'cyberpunk')
    .option('-o, --output <path>', 'Output filepath', 'terminal-output')
    .option('--title <title>', 'Window title bar text (default: the shell and the command)')
    .option('--animated', 'Play back the real recorded frames as an animated SVG')
    .option('--format <type>', 'Output format: svg, html, gif, both', 'svg')
    .option('--fps <n>', 'Frames sampled per second while recording', '10')
    .option('--max-duration <seconds>', 'Stop recording after this many seconds', '30')
    .option('--cols <n>', 'Terminal columns to record at', String(process.stdout.columns || 80))
    .option('--rows <n>', 'Terminal rows to record at', String(process.stdout.rows || 24))
    .option('-l, --license <key>', 'Polar.sh Pro License Key')
    .action(async (cmdString, options) => {
    try {
        const licenseCheck = await (0, license_1.validatePolarLicense)(options.license);
        console.log(`[TermCast] License Status: ${licenseCheck.message}`);
        console.log(`[TermCast] Recording: "${cmdString}"...`);
        const fps = parseInt(options.fps, 10) || 10;
        const cols = parseInt(options.cols, 10) || 80;
        const rows = parseInt(options.rows, 10) || 24;
        const maxDurationMs = (parseInt(options.maxDuration, 10) || 30) * 1000;
        const recorded = await (0, recorder_1.recordCommand)(cmdString, {
            cols, rows, fps, maxDurationMs, theme: options.theme
        });
        const { rawText } = recorded;
        const frames = (0, crop_1.cropBlankRows)(recorded.frames);
        const renderOpts = {
            theme: options.theme,
            gradient: options.gradient,
            title: options.title || `${shellName} — ${cmdString}`,
            watermark: !licenseCheck.valid
        };
        const format = options.format || 'svg';
        const baseOutput = options.output.replace(/\.(svg|html|gif)$/, '');
        if (format === 'svg' || format === 'both') {
            const svgContent = options.animated
                ? (0, svg_1.renderAnimatedGridFrames)(frames, renderOpts)
                : (0, svg_1.renderGridFrame)(frames[frames.length - 1], renderOpts);
            const svgPath = path.resolve(`${baseOutput}.svg`);
            await fs.writeFile(svgPath, svgContent, 'utf8');
            console.log(`  ✨ Created SVG: ${svgPath}`);
        }
        if (format === 'html' || format === 'both') {
            // HTML output stays on the original text-based renderer for now —
            // recordCommand's rawText accumulator exists specifically so this
            // path keeps working unchanged (see plan Global Constraints).
            const htmlContent = (0, html_1.renderHtmlEmbed)([{ text: rawText, delayMs: 0 }], renderOpts);
            const htmlPath = path.resolve(`${baseOutput}.html`);
            await fs.writeFile(htmlPath, htmlContent, 'utf8');
            console.log(`  ✨ Created HTML Embed: ${htmlPath}`);
        }
        if (format === 'gif') {
            const gifBuffer = await (0, gif_1.encodeGif)(frames, renderOpts, fps);
            const gifPath = path.resolve(`${baseOutput}.gif`);
            await fs.writeFile(gifPath, gifBuffer);
            console.log(`  ✨ Created GIF: ${gifPath}`);
        }
        console.log('\n[TermCast] Recording finished successfully.\n');
        if (!licenseCheck.valid) {
            console.log('💡 Support development and remove the watermark: https://buy.polar.sh/polar_cl_H2APhJzqleLe4Z7FjOmFQ2yGColjaWTqqzhyr2oN5K1');
        }
    }
    catch (err) {
        process.exitCode = 1;
        console.error(`[TermCast] Error: ${err.message}`);
    }
});
// Serve (Preview) Command
program
    .command('serve <cmd>')
    .description('Record a command and launch an instant live web preview in the browser')
    .option('-t, --theme <name>', 'Theme: dracula, tokyonight, nord, catppuccin, monokai', 'dracula')
    .option('-g, --gradient <name>', 'Gradient: default, cyberpunk, sunset, matrix, hyper, neon, midnight', 'cyberpunk')
    .option('--animated', 'Play back the real recorded frames as an animated SVG')
    .action(async (cmdString, options) => {
    try {
        console.log(`[TermCast] Recording: "${cmdString}" for live preview...`);
        const cols = process.stdout.columns || 80;
        const rows = process.stdout.rows || 24;
        const frames = (0, crop_1.cropBlankRows)((await (0, recorder_1.recordCommand)(cmdString, {
            cols, rows, fps: 10, maxDurationMs: 30000, theme: options.theme
        })).frames);
        const renderOpts = {
            theme: options.theme,
            gradient: options.gradient,
            title: `${shellName} — ${cmdString}`
        };
        const svg = options.animated
            ? (0, svg_1.renderAnimatedGridFrames)(frames, renderOpts)
            : (0, svg_1.renderGridFrame)(frames[frames.length - 1], renderOpts);
        (0, server_1.startPreviewServer)(svg, 3333);
    }
    catch (err) {
        process.exitCode = 1;
        console.error(`[TermCast] Preview Error: ${err.message}`);
    }
});
program.parse(process.argv);
