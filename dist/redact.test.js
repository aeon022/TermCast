"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const redact_1 = require("./redact");
const masked = (s, opts = {}) => {
    const chars = Array.from(s);
    for (const [a, b] of (0, redact_1.findSecretRanges)(s, opts))
        for (let i = a; i < b; i++)
            chars[i] = redact_1.MASK;
    return chars.join('');
};
const m = redact_1.MASK;
(0, node_test_1.test)('well-known token formats are masked entirely', () => {
    const gh = 'ghp_' + 'a'.repeat(36);
    strict_1.default.equal(masked(`token ${gh} ok`), `token ${m.repeat(gh.length)} ok`);
    const sk = 'sk-ant-api03-' + 'x'.repeat(30);
    strict_1.default.equal(masked(sk), m.repeat(sk.length));
    strict_1.default.equal(masked('AKIAIOSFODNN7EXAMPLE'), m.repeat(20));
    strict_1.default.equal(masked('xoxb-123456789012-abcdefghij'), m.repeat('xoxb-123456789012-abcdefghij'.length));
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    strict_1.default.equal(masked(jwt), m.repeat(jwt.length));
    strict_1.default.equal(masked('key A83-1A2B3C4D-1234-5678-9ABC-DEF012345678'), 'key ' + m.repeat('A83-1A2B3C4D-1234-5678-9ABC-DEF012345678'.length));
});
(0, node_test_1.test)('key=value keeps the name and masks only the value', () => {
    strict_1.default.equal(masked('export API_TOKEN=abcdef123456'), `export API_TOKEN=${m.repeat(12)}`);
    strict_1.default.equal(masked('password: "hunter2hunter2"'), `password: "${m.repeat(14)}"`);
    strict_1.default.equal(masked('Authorization: Bearer abcdefghijklmnop1234'), `Authorization: Bearer ${m.repeat(20)}`);
    strict_1.default.equal(masked('git clone https://bob:s3cr3tpass@example.com/x.git'), `git clone https://bob:${m.repeat(10)}@example.com/x.git`);
});
(0, node_test_1.test)('ordinary output is left alone', () => {
    for (const s of [
        'commit 3f2a9c1d8e7b6a5f4e3d2c1b0a9f8e7d6c5b4a39',
        'id 123e4567-e89b-12d3-a456-426614174000',
        'token expired, please log in again',
        'the secret to good code is tests',
        'export PATH=/usr/bin:/bin',
        'password: x',
        'sk-short'
    ])
        strict_1.default.equal(masked(s), s, s);
});
(0, node_test_1.test)('extra patterns are masked completely, and the built-in ones can be switched off', () => {
    strict_1.default.equal(masked('user=gerwin id=42', { extra: [/gerwin/] }), `user=${m.repeat(6)} id=42`);
    const gh = 'ghp_' + 'a'.repeat(36);
    strict_1.default.equal(masked(gh, { auto: false }), gh);
});
function frame(rows) {
    const cell = (c) => ({ char: c, fg: '#fff', bg: '#000' });
    return { grid: rows.map((r) => Array.from(r.padEnd(60)).map(cell)), cursorX: 0, cursorY: 0, cursorVisible: false, timestampMs: 0 };
}
const text = (f, y) => f.grid[y].map((c) => c.char).join('').trimEnd();
(0, node_test_1.test)('frames: secrets are masked in every frame and counted once each', () => {
    const secret = 'ghp_' + 'b'.repeat(36);
    const { frames, count } = (0, redact_1.redactFrames)([frame([`token=${secret}`, 'next line']), frame([`token=${secret}`, 'next line', 'more'])]);
    strict_1.default.equal(count, 1);
    strict_1.default.equal(text(frames[0], 0), `token=${m.repeat(secret.length)}`);
    strict_1.default.equal(text(frames[1], 0), `token=${m.repeat(secret.length)}`);
    strict_1.default.equal(text(frames[1], 2), 'more');
});
(0, node_test_1.test)('frames: a whole private key block is masked', () => {
    const { frames } = (0, redact_1.redactFrames)([frame(['-----BEGIN OPENSSH PRIVATE KEY-----', 'b3BlbnNzaC1rZXk', '-----END OPENSSH PRIVATE KEY-----', 'after'])]);
    strict_1.default.ok(!text(frames[0], 1).includes('b3Blbn'));
    strict_1.default.ok(!text(frames[0], 0).includes('BEGIN'));
    strict_1.default.equal(text(frames[0], 3), 'after');
});
(0, node_test_1.test)('ansi text: colour codes survive, the secret does not', () => {
    const secret = 'ghp_' + 'c'.repeat(36);
    const { text: out, count } = (0, redact_1.redactAnsiText)(`\x1b[32mtoken\x1b[0m=\x1b[33m${secret.slice(0, 10)}\x1b[0m${secret.slice(10)}\nplain\n`);
    strict_1.default.equal(count, 1);
    strict_1.default.ok(out.includes('\x1b[32mtoken\x1b[0m='));
    strict_1.default.ok(!out.includes('ghp_'));
    strict_1.default.ok(out.includes(m.repeat(10)));
    strict_1.default.ok(out.endsWith('\nplain\n'));
});
const redact_2 = require("./redact");
(0, node_test_1.test)('strings (window titles) are masked too', () => {
    const secret = 'ghp_' + 'f'.repeat(36);
    strict_1.default.equal((0, redact_2.redactString)(`zsh — curl -H "Authorization: Bearer ${secret}"`), `zsh — curl -H "Authorization: Bearer ${m.repeat(secret.length)}"`);
    strict_1.default.equal((0, redact_2.redactString)('zsh — ls -la'), 'zsh — ls -la');
});
(0, node_test_1.test)('frames: a token that wraps onto the next row is masked on both rows', () => {
    const cell = (c) => ({ char: c, fg: '#fff', bg: '#000' });
    const secret = 'ghp_' + 'g'.repeat(36);
    const line = `GITHUB_TOKEN=${secret}`;
    const width = 24;
    const rows = [line.slice(0, width), line.slice(width, width * 2), line.slice(width * 2).padEnd(width), 'plain'.padEnd(width)];
    const f = { grid: rows.map((r) => Array.from(r).map(cell)), cursorX: 0, cursorY: 0, cursorVisible: false, timestampMs: 0 };
    const { frames, count } = (0, redact_1.redactFrames)([f]);
    const text = frames[0].grid.map((r) => r.map((c) => c.char).join('').trimEnd());
    strict_1.default.equal(count, 1);
    strict_1.default.ok(!text.join('').includes('ggg'), text.join('|'));
    strict_1.default.ok(text[0].startsWith('GITHUB_TOKEN='));
    strict_1.default.equal(text[3], 'plain');
});
