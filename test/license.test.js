const test = require('node:test');
const assert = require('node:assert');
const os = require('os');
const fs = require('fs');
const path = require('path');

process.env.HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-'));
delete process.env.POLAR_LICENSE_KEY;

let reply = { status: 200, ok: true, body: { valid: false } };
const fake = async () => ({ status: reply.status, ok: reply.ok, json: async () => reply.body });
require.cache[require.resolve('node-fetch')] = { id: 'x', filename: 'x', loaded: true, exports: Object.assign(fake, { default: fake, __esModule: true }) };
const { validatePolarLicense, maskKey } = require('../dist/license');

test('the old offline dev key is no longer special', async () => {
  const r = await validatePolarLicense('A83-OFFLINE-DEV');
  assert.strictEqual(r.valid, false);
});

test('a server error is not reported as an invalid key', async () => {
  reply = { status: 502, ok: false, body: {} };
  const r = await validatePolarLicense('some-key');
  assert.strictEqual(r.valid, false);
  assert.match(r.message, /unavailable/);
});

test('a valid answer unlocks Pro and keys are masked', async () => {
  reply = { status: 200, ok: true, body: { valid: true } };
  assert.strictEqual((await validatePolarLicense('some-key')).valid, true);
  assert.strictEqual(maskKey('abcd-efgh-ijkl-mnop'), 'abcd…mnop');
  assert.strictEqual(maskKey('short'), '****');
});
