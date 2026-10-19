import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parseScript, loadScript } from './script';

test('a script with strings and mappings as steps, defaults filled in', () => {
  const s = parseScript({ title: 'demo', steps: ['ls', { cmd: 'git status', pause: 500, type: false }] });
  assert.equal(s.typing, true);
  assert.deepEqual(s.steps, [{ cmd: 'ls', show: undefined, type: undefined, pause: undefined }, { cmd: 'git status', show: undefined, type: false, pause: 500 }]);
  assert.equal(s.title, 'demo');
});

test('mistakes are reported with the step number', () => {
  assert.throws(() => parseScript({}), /non-empty list/);
  assert.throws(() => parseScript({ steps: [] }), /non-empty list/);
  assert.throws(() => parseScript({ steps: [{ cmd: 'ok' }, { pause: 5 }] }), /step 2 needs a "cmd"/);
  assert.throws(() => parseScript({ steps: [{ cmd: 'x', pause: -1 }] }), /step 1: "pause" must be a number between 0 and 60000/);
  assert.throws(() => parseScript({ steps: [{ cmd: 'x', type: 'yes' }] }), /step 1: "type" must be true or false/);
  assert.throws(() => parseScript({ steps: ['x'], cols: 5 }), /"cols" must be a number between 20 and 300/);
  assert.throws(() => parseScript([1, 2]), /expected a mapping/);
});

test('loadScript reads YAML and JSON and explains unreadable files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ttyreel-'));
  fs.writeFileSync(path.join(dir, 'a.yml'), 'theme: nord\nprompt: starship\ncols: 60\nsteps:\n  - echo one\n  - cmd: echo two\n    pause: 100\n');
  const y = loadScript(path.join(dir, 'a.yml'));
  assert.equal(y.theme, 'nord');
  assert.equal(y.cols, 60);
  assert.equal(y.steps.length, 2);
  fs.writeFileSync(path.join(dir, 'b.json'), JSON.stringify({ steps: [{ cmd: 'ls' }], typing: false }));
  assert.equal(loadScript(path.join(dir, 'b.json')).typing, false);
  fs.writeFileSync(path.join(dir, 'bad.yml'), 'steps: [unclosed');
  assert.throws(() => loadScript(path.join(dir, 'bad.yml')), /Cannot parse script .*bad\.yml/);
  assert.throws(() => loadScript(path.join(dir, 'missing.yml')), /Cannot read script/);
});
