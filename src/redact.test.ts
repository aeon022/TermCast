import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findSecretRanges, redactFrames, redactAnsiText, MASK } from './redact';
import { Frame, Cell } from './types';

const masked = (s: string, opts = {}) => {
  const chars = Array.from(s);
  for (const [a, b] of findSecretRanges(s, opts)) for (let i = a; i < b; i++) chars[i] = MASK;
  return chars.join('');
};

const m = MASK;

test('well-known token formats are masked entirely', () => {
  const gh = 'ghp_' + 'a'.repeat(36);
  assert.equal(masked(`token ${gh} ok`), `token ${m.repeat(gh.length)} ok`);
  const sk = 'sk-ant-api03-' + 'x'.repeat(30);
  assert.equal(masked(sk), m.repeat(sk.length));
  assert.equal(masked('AKIAIOSFODNN7EXAMPLE'), m.repeat(20));
  assert.equal(masked('xoxb-123456789012-abcdefghij'), m.repeat('xoxb-123456789012-abcdefghij'.length));
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk';
  assert.equal(masked(jwt), m.repeat(jwt.length));
  assert.equal(masked('key A83-1A2B3C4D-1234-5678-9ABC-DEF012345678'), 'key ' + m.repeat('A83-1A2B3C4D-1234-5678-9ABC-DEF012345678'.length));
});

test('key=value keeps the name and masks only the value', () => {
  assert.equal(masked('export API_TOKEN=abcdef123456'), `export API_TOKEN=${m.repeat(12)}`);
  assert.equal(masked('password: "hunter2hunter2"'), `password: "${m.repeat(14)}"`);
  assert.equal(masked('Authorization: Bearer abcdefghijklmnop1234'), `Authorization: Bearer ${m.repeat(20)}`);
  assert.equal(masked('git clone https://bob:s3cr3tpass@example.com/x.git'), `git clone https://bob:${m.repeat(10)}@example.com/x.git`);
});

test('ordinary output is left alone', () => {
  for (const s of [
    'commit 3f2a9c1d8e7b6a5f4e3d2c1b0a9f8e7d6c5b4a39',
    'id 123e4567-e89b-12d3-a456-426614174000',
    'token expired, please log in again',
    'the secret to good code is tests',
    'export PATH=/usr/bin:/bin',
    'password: x',
    'sk-short'
  ]) assert.equal(masked(s), s, s);
});

test('extra patterns are masked completely, and the built-in ones can be switched off', () => {
  assert.equal(masked('user=gerwin id=42', { extra: [/gerwin/] }), `user=${m.repeat(6)} id=42`);
  const gh = 'ghp_' + 'a'.repeat(36);
  assert.equal(masked(gh, { auto: false }), gh);
});

function frame(rows: string[]): Frame {
  const cell = (c: string): Cell => ({ char: c, fg: '#fff', bg: '#000' });
  return { grid: rows.map((r) => Array.from(r.padEnd(60)).map(cell)), cursorX: 0, cursorY: 0, cursorVisible: false, timestampMs: 0 };
}
const text = (f: Frame, y: number) => f.grid[y].map((c) => c.char).join('').trimEnd();

test('frames: secrets are masked in every frame and counted once each', () => {
  const secret = 'ghp_' + 'b'.repeat(36);
  const { frames, count } = redactFrames([frame([`token=${secret}`, 'next line']), frame([`token=${secret}`, 'next line', 'more'])]);
  assert.equal(count, 1);
  assert.equal(text(frames[0], 0), `token=${m.repeat(secret.length)}`);
  assert.equal(text(frames[1], 0), `token=${m.repeat(secret.length)}`);
  assert.equal(text(frames[1], 2), 'more');
});

test('frames: a whole private key block is masked', () => {
  const { frames } = redactFrames([frame(['-----BEGIN OPENSSH PRIVATE KEY-----', 'b3BlbnNzaC1rZXk', '-----END OPENSSH PRIVATE KEY-----', 'after'])]);
  assert.ok(!text(frames[0], 1).includes('b3Blbn'));
  assert.ok(!text(frames[0], 0).includes('BEGIN'));
  assert.equal(text(frames[0], 3), 'after');
});

test('ansi text: colour codes survive, the secret does not', () => {
  const secret = 'ghp_' + 'c'.repeat(36);
  const { text: out, count } = redactAnsiText(`\x1b[32mtoken\x1b[0m=\x1b[33m${secret.slice(0, 10)}\x1b[0m${secret.slice(10)}\nplain\n`);
  assert.equal(count, 1);
  assert.ok(out.includes('\x1b[32mtoken\x1b[0m='));
  assert.ok(!out.includes('ghp_'));
  assert.ok(out.includes(m.repeat(10)));
  assert.ok(out.endsWith('\nplain\n'));
});

import { redactString } from './redact';

test('strings (window titles) are masked too', () => {
  const secret = 'ghp_' + 'f'.repeat(36);
  assert.equal(redactString(`zsh — curl -H "Authorization: Bearer ${secret}"`), `zsh — curl -H "Authorization: Bearer ${m.repeat(secret.length)}"`);
  assert.equal(redactString('zsh — ls -la'), 'zsh — ls -la');
});

test('frames: a token that wraps onto the next row is masked on both rows', () => {
  const cell = (c: string): Cell => ({ char: c, fg: '#fff', bg: '#000' });
  const secret = 'ghp_' + 'g'.repeat(36);
  const line = `GITHUB_TOKEN=${secret}`;
  const width = 24;
  const rows = [line.slice(0, width), line.slice(width, width * 2), line.slice(width * 2).padEnd(width), 'plain'.padEnd(width)];
  const f: Frame = { grid: rows.map((r) => Array.from(r).map(cell)), cursorX: 0, cursorY: 0, cursorVisible: false, timestampMs: 0 };
  const { frames, count } = redactFrames([f]);
  const text = frames[0].grid.map((r) => r.map((c) => c.char).join('').trimEnd());
  assert.equal(count, 1);
  assert.ok(!text.join('').includes('ggg'), text.join('|'));
  assert.ok(text[0].startsWith('GITHUB_TOKEN='));
  assert.equal(text[3], 'plain');
});
