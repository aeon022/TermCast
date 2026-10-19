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
exports.wizard = wizard;
const readline = __importStar(require("readline"));
const child_process_1 = require("child_process");
const themes_1 = require("./themes");
const de = /^de/i.test(process.env.LC_ALL || process.env.LANG || '');
const t = (en, d) => (de ? d : en);
const q = (s) => `'${s.replace(/'/g, `'\\''`)}'`;
const FORMATS = ['svg', 'gif', 'png', 'html'];
/** Step-by-step helper for beginners: asks, shows the exact command, runs it. */
async function wizard() {
    const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
    const lines = rl[Symbol.asyncIterator]();
    const ask = async (question, def = '') => {
        process.stderr.write(`${question}${def ? ` [${def}]` : ''} › `);
        const { value, done } = await lines.next();
        if (done)
            throw new Error('end');
        return String(value).trim() || def;
    };
    const pick = async (question, options, def = 1) => {
        console.error(`\n${question}`);
        options.forEach((o, i) => console.error(`  ${i + 1}) ${o}`));
        for (;;) {
            const a = await ask(t('Number or name', 'Nummer oder Name'), String(def));
            const hit = options[Number(a) - 1] !== undefined ? Number(a) - 1 : options.indexOf(a);
            if (hit >= 0)
                return hit;
            console.error(t('  Please type one of the numbers above.', '  Bitte eine der Nummern oben eingeben.'));
        }
    };
    const run = (args) => {
        console.error(t('\nThe same thing as a command (copy it for next time):\n', '\nDasselbe als Befehl (zum Merken/Kopieren):\n'));
        console.error(`  ttyreel ${args.map((a) => (/^[\w.,#:/-]+$/.test(a) ? a : q(a))).join(' ')}\n`);
        (0, child_process_1.spawnSync)(process.execPath, [process.argv[1], ...args], { stdio: 'inherit' });
    };
    const yes = async (question, def) => /^[yj]/i.test(await ask(`${question} (${t('y/n', 'j/n')})`, def));
    console.error(t('\n🎬 ttyreel assistant — I ask, you answer. Press Enter to accept [the default]. Ctrl+C quits.', '\n🎬 ttyreel-Assistent — ich frage, du antwortest. Enter nimmt den [Vorschlag]. Strg+C beendet.'));
    try {
        for (;;) {
            const n = 'rpcsdq'[await pick(t('What do you want to do?', 'Was möchtest du machen?'), [
                t('Make a picture/animation of a command (e.g. "ls -la")', 'Ein Bild/eine Animation von einem Befehl machen (z. B. "ls -la")'),
                t('Make a demo from a script file (several commands)', 'Eine Demo aus einer Skript-Datei machen (mehrere Befehle)'),
                t('Convert an asciinema recording (.cast)', 'Eine asciinema-Aufnahme (.cast) umwandeln'),
                t('Live preview in the browser while I tweak a command', 'Live-Vorschau im Browser, während ich einen Befehl anpasse'),
                t('Just show me a demo', 'Zeig mir einfach eine Demo'),
                t('Quit', 'Beenden'),
            ])];
            if (n === 'q')
                return;
            if (n === 'd') {
                run(['demo']);
            }
            else {
                const what = n === 'p' ? await ask(t('Path of the script (.yml or .json)', 'Pfad der Skript-Datei (.yml oder .json)'))
                    : n === 'c' ? await ask(t('Path of the .cast file', 'Pfad der .cast-Datei'))
                        : await ask(t('Which command?', 'Welcher Befehl?'), 'ls -la');
                const args = [{ r: 'render', p: 'play', c: 'cast', s: 'serve' }[n], what];
                args.push('--theme', Object.keys(themes_1.THEMES)[await pick(t('Colour theme?', 'Farb-Theme?'), Object.keys(themes_1.THEMES))]);
                const grads = ['(theme default)', ...Object.keys(themes_1.GRADIENTS)];
                const g = await pick(t('Background gradient?', 'Hintergrund-Verlauf?'), grads);
                if (g > 0)
                    args.push('-g', grads[g]);
                if (n === 'r' || n === 's') {
                    if (await yes(t('Show a prompt and type the command (looks like a video)?', 'Prompt zeigen und den Befehl "tippen" (wirkt wie ein Video)?'), 'y'))
                        args.push('--type');
                }
                if (n !== 's') {
                    const f = FORMATS[await pick(t('File format? (gif = moving picture, svg = sharp, png = still)', 'Dateiformat? (gif = bewegt, svg = scharf, png = Standbild)'), FORMATS)];
                    args.push('--format', f);
                    if (f === 'svg' && args.includes('--type'))
                        args.push('--animated');
                    if (f === 'gif' || f === 'png')
                        args.push('--scale', '2');
                    const out = await ask(t('File name (without ending)', 'Dateiname (ohne Endung)'), 'terminal-output');
                    args.push('-o', out);
                }
                run(args);
                if (n !== 's')
                    console.error(t('Done. Open the file from the folder you are in now.', 'Fertig. Die Datei liegt in dem Ordner, in dem du gerade bist.'));
            }
            if (!(await yes(t('Do something else?', 'Noch etwas machen?'), 'n')))
                return void console.error(t('Bye! Run `ttyreel wizard` any time.', 'Tschüss! `ttyreel wizard` startet den Assistenten jederzeit wieder.'));
        }
    }
    catch (e) {
        if (e.message !== 'end')
            throw e;
    }
    finally {
        rl.close();
    }
}
