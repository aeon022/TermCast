import * as readline from 'readline';
import { spawnSync } from 'child_process';
import { THEMES, GRADIENTS } from './themes';

const de = /^de/i.test(process.env.LC_ALL || process.env.LANG || '');
const t = (en: string, d: string) => (de ? d : en);
const q = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

const FORMATS = ['svg', 'gif', 'png', 'html'];

/** Step-by-step helper for beginners: asks, shows the exact command, runs it. */
export async function wizard(): Promise<void> {
  const lines = readline.createInterface({ input: process.stdin, output: process.stderr })[Symbol.asyncIterator]();
  const ask = async (question: string, def = ''): Promise<string> => {
    process.stderr.write(`${question}${def ? ` [${def}]` : ''} › `);
    const { value, done } = await lines.next();
    if (done) throw new Error('end');
    return String(value).trim() || def;
  };
  const pick = async (question: string, options: string[], def = 1): Promise<number> => {
    console.error(`\n${question}`);
    options.forEach((o, i) => console.error(`  ${i + 1}) ${o}`));
    for (;;) {
      const a = await ask(t('Number or name', 'Nummer oder Name'), String(def));
      const hit = options[Number(a) - 1] !== undefined ? Number(a) - 1 : options.indexOf(a);
      if (hit >= 0) return hit;
      console.error(t('  Please type one of the numbers above.', '  Bitte eine der Nummern oben eingeben.'));
    }
  };
  const run = (args: string[]) => {
    console.error(t('\nThe same thing as a command (copy it for next time):\n', '\nDasselbe als Befehl (zum Merken/Kopieren):\n'));
    console.error(`  ttyreel ${args.map((a) => (/^[\w.,#:/-]+$/.test(a) ? a : q(a))).join(' ')}\n`);
    spawnSync(process.execPath, [process.argv[1], ...args], { stdio: 'inherit' });
  };
  const yes = async (question: string, def: 'y' | 'n') => /^[yj]/i.test(await ask(`${question} (${t('y/n', 'j/n')})`, def));

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
      if (n === 'q') return;
      if (n === 'd') {
        run(['demo']);
      } else {
        const what = n === 'p' ? await ask(t('Path of the script (.yml or .json)', 'Pfad der Skript-Datei (.yml oder .json)'))
          : n === 'c' ? await ask(t('Path of the .cast file', 'Pfad der .cast-Datei'))
          : await ask(t('Which command?', 'Welcher Befehl?'), 'ls -la');
        const args = [{ r: 'render', p: 'play', c: 'cast', s: 'serve' }[n]!, what];
        args.push('--theme', Object.keys(THEMES)[await pick(t('Colour theme?', 'Farb-Theme?'), Object.keys(THEMES))]);
        const grads = ['(theme default)', ...Object.keys(GRADIENTS)];
        const g = await pick(t('Background gradient?', 'Hintergrund-Verlauf?'), grads);
        if (g > 0) args.push('-g', grads[g]);
        if (n === 'r' || n === 's') {
          if (await yes(t('Show a prompt and type the command (looks like a video)?', 'Prompt zeigen und den Befehl "tippen" (wirkt wie ein Video)?'), 'y')) args.push('--type');
        }
        if (n !== 's') {
          const f = FORMATS[await pick(t('File format? (gif = moving picture, svg = sharp, png = still)', 'Dateiformat? (gif = bewegt, svg = scharf, png = Standbild)'), FORMATS)];
          args.push('--format', f);
          if (f === 'svg' && args.includes('--type')) args.push('--animated');
          if (f === 'gif' || f === 'png') args.push('--scale', '2');
          const out = await ask(t('File name (without ending)', 'Dateiname (ohne Endung)'), 'terminal-output');
          args.push('-o', out);
        }
        run(args);
        if (n !== 's') console.error(t('Done. Open the file from the folder you are in now.', 'Fertig. Die Datei liegt in dem Ordner, in dem du gerade bist.'));
      }
      if (!(await yes(t('Do something else?', 'Noch etwas machen?'), 'n'))) return;
    }
  } catch (e: any) {
    if (e.message !== 'end') throw e;
  }
}
