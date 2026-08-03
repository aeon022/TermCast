#!/usr/bin/env node
import { Command } from 'commander';
import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';
import { renderSvgFrame } from './renderer/svg';
import { renderHtmlEmbed } from './renderer/html';
import { startPreviewServer } from './server';
import { validatePolarLicense } from './license';
import { RenderOptions, TerminalFrame, ThemeName, GradientPreset, PromptStyle } from './types';

const program = new Command();

program
  .name('termcast')
  .description('Pretty Terminal SVG & GIF Studio CLI for GitHub READMEs and Demos')
  .version('0.1.0');

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
      const licenseCheck = await validatePolarLicense(options.license);
      console.log(`[TermCast] License Status: ${licenseCheck.message}`);

      const sampleFrames: TerminalFrame[] = [
        { text: '\x1b[32m✔\x1b[0m \x1b[1mJoplinBridge\x1b[0m initialized successfully', delayMs: 100 },
        { text: '\x1b[36mℹ\x1b[0m Watching local directory: \x1b[34m/Users/gweiher/Projects/docs\x1b[0m', delayMs: 200 },
        { text: '\x1b[33m⚡\x1b[0m Synced \x1b[1m184 notes\x1b[0m in 42ms (0 errors)', delayMs: 300 },
        { text: '\x1b[32m✔\x1b[0m Output saved to \x1b[35mtermcast-demo.svg\x1b[0m', delayMs: 400 }
      ];

      const renderOpts: RenderOptions = {
        theme: options.theme as ThemeName,
        gradient: options.gradient as GradientPreset,
        title: 'termcast — zsh (demo)',
        watermark: !licenseCheck.valid,
        animated: options.animated,
        prompt: options.prompt as PromptStyle
      };

      const format = options.format || 'svg';
      const baseOutput = options.output.replace(/\.(svg|html)$/, '');

      if (format === 'svg' || format === 'both') {
        const svgContent = renderSvgFrame(sampleFrames, renderOpts);
        const svgPath = path.resolve(`${baseOutput}.svg`);
        await fs.writeFile(svgPath, svgContent, 'utf8');
        console.log(`  ✨ Created SVG: ${svgPath}`);
      }

      if (format === 'html' || format === 'both') {
        const htmlContent = renderHtmlEmbed(sampleFrames, renderOpts);
        const htmlPath = path.resolve(`${baseOutput}.html`);
        await fs.writeFile(htmlPath, htmlContent, 'utf8');
        console.log(`  ✨ Created HTML Embed: ${htmlPath}`);
      }

      console.log('\n[TermCast] Execution finished successfully.\n');
      if (!licenseCheck.valid) {
        console.log('💡 Remove watermark & unlock custom gradients: https://buy.polar.sh/polar_cl_BN6xwyJH2Drn6WuzvV49E2KCGauvtoTHixD3w1hCpSH');
      }
    } catch (err: any) {
      console.error(`[TermCast] Error generating demo: ${err.message}`);
    }
  });

// Render Command
program
  .command('render <cmd>')
  .description('Run shell command and render terminal output as pretty SVG or HTML')
  .option('-t, --theme <name>', 'Theme: dracula, tokyonight, nord, catppuccin, monokai', 'dracula')
  .option('-g, --gradient <name>', 'Gradient: default, cyberpunk, sunset, matrix, hyper, neon, midnight', 'cyberpunk')
  .option('-o, --output <path>', 'Output filepath', 'terminal-output')
  .option('--title <title>', 'Window title bar text', 'termcast — zsh')
  .option('--animated', 'Enable CSS typing keyframe animation')
  .option('--prompt <style>', 'Prompt style: zsh, starship, bash, none', 'zsh')
  .option('--format <type>', 'Output format: svg, html, both', 'svg')
  .option('-l, --license <key>', 'Polar.sh Pro License Key')
  .action(async (cmdString, options) => {
    try {
      const licenseCheck = await validatePolarLicense(options.license);
      console.log(`[TermCast] License Status: ${licenseCheck.message}`);
      console.log(`[TermCast] Executing command: "${cmdString}"...`);

      let outputText = '';
      try {
        outputText = execSync(cmdString, { encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '1' } });
      } catch (execErr: any) {
        outputText = execErr.stdout || execErr.stderr || execErr.message;
      }

      const frames: TerminalFrame[] = [
        { text: `${cmdString}`, delayMs: 100 },
        { text: outputText, delayMs: 500 }
      ];

      const renderOpts: RenderOptions = {
        theme: options.theme as ThemeName,
        gradient: options.gradient as GradientPreset,
        title: options.title || `zsh — ${cmdString}`,
        watermark: !licenseCheck.valid,
        animated: options.animated,
        prompt: options.prompt as PromptStyle
      };

      const format = options.format || 'svg';
      const baseOutput = options.output.replace(/\.(svg|html)$/, '');

      if (format === 'svg' || format === 'both') {
        const svgContent = renderSvgFrame(frames, renderOpts);
        const svgPath = path.resolve(`${baseOutput}.svg`);
        await fs.writeFile(svgPath, svgContent, 'utf8');
        console.log(`  ✨ Created SVG: ${svgPath}`);
      }

      if (format === 'html' || format === 'both') {
        const htmlContent = renderHtmlEmbed(frames, renderOpts);
        const htmlPath = path.resolve(`${baseOutput}.html`);
        await fs.writeFile(htmlPath, htmlContent, 'utf8');
        console.log(`  ✨ Created HTML Embed: ${htmlPath}`);
      }

      console.log('\n[TermCast] Execution finished successfully.\n');
      if (!licenseCheck.valid) {
        console.log('💡 Remove watermark & unlock custom gradients: https://buy.polar.sh/polar_cl_BN6xwyJH2Drn6WuzvV49E2KCGauvtoTHixD3w1hCpSH');
      }
    } catch (err: any) {
      console.error(`[TermCast] Error: ${err.message}`);
    }
  });

// Serve (Preview) Command
program
  .command('serve <cmd>')
  .description('Run command and launch instant live web preview in browser')
  .option('-t, --theme <name>', 'Theme: dracula, tokyonight, nord, catppuccin, monokai', 'dracula')
  .option('-g, --gradient <name>', 'Gradient: default, cyberpunk, sunset, matrix, hyper, neon, midnight', 'cyberpunk')
  .option('--prompt <style>', 'Prompt style: zsh, starship, bash, none', 'zsh')
  .option('--animated', 'Enable CSS typing keyframe animation')
  .action((cmdString, options) => {
    try {
      console.log(`[TermCast] Executing: "${cmdString}" for live preview...`);
      let outputText = '';
      try {
        outputText = execSync(cmdString, { encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '1' } });
      } catch (execErr: any) {
        outputText = execErr.stdout || execErr.stderr || execErr.message;
      }

      const frames: TerminalFrame[] = [
        { text: `${cmdString}`, delayMs: 100 },
        { text: outputText, delayMs: 500 }
      ];

      const renderOpts: RenderOptions = {
        theme: options.theme as ThemeName,
        gradient: options.gradient as GradientPreset,
        title: `zsh — ${cmdString}`,
        animated: options.animated,
        prompt: options.prompt as PromptStyle
      };

      startPreviewServer(frames, renderOpts, 3333);
    } catch (err: any) {
      console.error(`[TermCast] Preview Error: ${err.message}`);
    }
  });

program.parse(process.argv);
