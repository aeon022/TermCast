const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const bin = path.join(__dirname, '..', 'dist', 'index.js');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'ttr-cli-'));
const run = (args, extra = {}) => spawnSync('node', [bin, ...args], { env: { ...process.env, HOME: home, POLAR_LICENSE_KEY: '' }, encoding: 'utf8', cwd: home, ...extra });
const read = (f) => fs.readFileSync(path.join(home, f));

test('render writes svg+png, masks a token and says so on stderr', () => {
  const secret = 'ghp_' + 'z'.repeat(36);
  const r = run(['render', `echo "token=${secret}"`, '--format', 'svg,png', '-o', 'r', '--scale', '2']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /Created SVG: .*r\.svg/);
  assert.match(r.stdout, /Created PNG: .*r\.png/);
  assert.match(r.stderr, /1 secret masked/);
  assert.ok(!read('r.svg').toString().includes(secret));
  assert.strictEqual(read('r.png').subarray(0, 4).toString('hex'), '89504e47');
});

test('--no-redact keeps the text; --redact adds patterns', () => {
  const secret = 'ghp_' + 'y'.repeat(36);
  run(['render', `echo ${secret} host-one`, '-o', 'n', '--no-redact']);
  assert.ok(read('n.svg').toString().includes(secret));
  run(['render', 'echo host-two', '-o', 'x', '--redact', 'host-two']);
  assert.ok(!read('x.svg').toString().includes('host-two'));
});

test('play: a YAML script is typed and run, the output name follows the script', () => {
  fs.writeFileSync(path.join(home, 'demo.yml'), 'title: Setup\ntheme: nord\nprompt: starship\ncols: 50\ntypeSpeed: 1\nsteps:\n  - echo one\n  - cmd: echo two\n    pause: 10\n');
  const r = run(['play', 'demo.yml', '--format', 'svg']);
  assert.strictEqual(r.status, 0, r.stderr);
  const svg = read('demo.svg').toString();
  assert.match(svg, /echo one/);
  assert.match(svg, /two/);
  assert.match(svg, /Setup/);
  assert.match(svg, /#2e3440/, 'the theme from the script (nord)');
});

test('cast: converts an asciinema file', () => {
  fs.writeFileSync(path.join(home, 't.cast'), '{"version": 2, "width": 30, "height": 4}\n[0.1, "o", "from cast\\r\\n"]\n');
  const r = run(['cast', 't.cast', '--format', 'svg', '-o', 'c']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(read('c.svg').toString(), /from cast/);
});

test('themes: built-ins, a theme file, and mistakes with precise messages', () => {
  fs.writeFileSync(path.join(home, 'my.json'), JSON.stringify({ name: 'Mine', background: '#101010', foreground: '#eeeeee', colors: { black: '#000000', red: '#ff0000', green: '#00ff00', yellow: '#ffff00', blue: '#0000ff', magenta: '#ff00ff', cyan: '#00ffff', white: '#ffffff' } }));
  assert.strictEqual(run(['render', 'echo hi', '--theme-file', 'my.json', '-o', 'th']).status, 0);
  assert.match(read('th.svg').toString(), /#101010/);
  assert.strictEqual(run(['render', 'echo hi', '-t', 'gruvbox', '-o', 'g']).status, 0);
  let r = run(['render', 'echo hi', '-t', 'nope']);
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /Unknown theme "nope"\. Available: .*gruvbox/);
  fs.writeFileSync(path.join(home, 'bad.json'), '{"background":"red"}');
  r = run(['render', 'echo hi', '--theme-file', 'bad.json']);
  assert.match(r.stderr, /Invalid theme file bad\.json: "background" must be a hex colour/);
});

test('option errors exit 1 with the option named', () => {
  for (const [args, msg] of [
    [['render', 'echo hi', '--format', 'mp4'], /Unknown format "mp4"/],
    [['render', 'echo hi', '--lines', '9-2'], /Invalid --lines/],
    [['render', 'echo hi', '--scale', '99'], /--scale must be a number between/],
    [['render', 'echo hi', '--speed', '0'], /--speed must be/],
    [['render', 'echo hi', '-g', 'rainbow'], /Unknown gradient "rainbow"/]
  ]) {
    const r = run(args);
    assert.strictEqual(r.status, 1, args.join(' '));
    assert.match(r.stderr, msg);
  }
});

test('--markdown prints an image line; the demo and light/dark SVG work', () => {
  let r = run(['render', 'echo hi', '-o', 'md', '--markdown']);
  assert.match(r.stdout, /^!\[.*\]\(md\.svg\)$/m);
  r = run(['demo', '--format', 'svg', '--animated', '--light-theme', 'github-light', '-o', 'dm', '--type-speed', '1']);
  assert.strictEqual(r.status, 0, r.stderr);
  const svg = read('dm.svg').toString();
  assert.match(svg, /prefers-color-scheme: light/);
  assert.match(svg, /my-app init/);
});

test('--no-window, --font-size, --padding change the geometry', () => {
  run(['render', 'echo hi', '-o', 'a']);
  run(['render', 'echo hi', '-o', 'b', '--no-window', '--padding', '10']);
  run(['render', 'echo hi', '-o', 'f', '--font-size', '18']);
  const dim = (f, k) => Number(new RegExp(`<svg[^>]* ${k}="(\\d+)"`).exec(read(f).toString())[1]);
  assert.strictEqual(dim('a.svg', 'width') - dim('b.svg', 'width'), 50, 'padding 35 -> 10 removes 25px on each side');
  assert.ok(dim('a.svg', 'height') - dim('b.svg', 'height') >= 36 + 50, 'no title bar and less padding');
  assert.ok(dim('f.svg', 'width') > dim('a.svg', 'width'), 'a larger font needs a wider image');
  assert.doesNotMatch(read('b.svg').toString(), /#FF5F56/);
});

const { spawn } = require('node:child_process');
const http = require('node:http');

test('serve --watch: viewer page, loopback only, and a file change re-records and reloads the browser', async () => {
  const watchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ttr-watch-'));
  fs.writeFileSync(path.join(watchDir, 'a.txt'), '1');
  const child = spawn('node', [bin, 'serve', `cat ${path.join(watchDir, 'a.txt')}`, '--watch', watchDir, '--port', '39611', '--no-open', '--cols', '30', '--rows', '4'], {
    env: { ...process.env, HOME: home }, cwd: home
  });
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (out += d));
  const waitFor = async (re, ms = 15000) => {
    const t0 = Date.now();
    while (!re.test(out)) {
      if (Date.now() - t0 > ms) throw new Error(`timeout waiting for ${re}; output so far:\n${out}`);
      await new Promise((r) => setTimeout(r, 50));
    }
  };
  const get = (p) => new Promise((resolve, reject) => http.get({ host: '127.0.0.1', port: 39611, path: p, agent: false }, (res) => { let b = ''; res.on('data', (d) => (b += d)); res.on('end', () => resolve(b)); }).on('error', reject));
  try {
    await waitFor(/Live Preview running at: http:\/\/127\.0\.0\.1:39611/);
    await waitFor(/Watching /);
    assert.match(await get('/'), /EventSource/);
    assert.match(await get('/image.svg'), /<svg/);
    assert.ok(!/localhost|0\.0\.0\.0/.test(out), 'only the loopback address is announced');
    const event = new Promise((resolve, reject) => {
      const req = http.get({ host: '127.0.0.1', port: 39611, path: '/events', agent: false }, (res) => {
        let b = '';
        res.on('data', (d) => { b += d; if (b.includes('connected')) fs.writeFileSync(path.join(watchDir, 'a.txt'), 'changed'); if (b.includes('data: reload')) { req.destroy(); resolve(b); } });
      });
      req.on('error', (e) => { if (e.code !== 'ECONNRESET') reject(e); });
      setTimeout(() => reject(new Error('no reload after the file changed')), 15000);
    });
    await event;
    assert.match(await get('/image.svg'), /changed/);
  } finally {
    child.kill();
  }
});
