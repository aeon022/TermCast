const test = require('node:test');
const assert = require('node:assert');
const os = require('os');
const fs = require('fs');
const path = require('path');

process.env.HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'tc-'));
delete process.env.POLAR_LICENSE_KEY;

let reply = { status: 200, ok: true, body: { status: 'revoked' } };
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
  reply = { status: 200, ok: true, body: { status: 'granted', benefit_id: '0f534979-c9f8-4423-aa4d-6b6583a7e2aa' } };
  assert.strictEqual((await validatePolarLicense('some-key')).valid, true);
  assert.strictEqual(maskKey('abcd-efgh-ijkl-mnop'), 'abcd…mnop');
  assert.strictEqual(maskKey('short'), '****');
});

test('a saved key validated today needs no network, an offline check keeps a recent key alive', async () => {
  const fs2 = require('fs'), os2 = require('os'), path2 = require('path');
  const dir = path2.join(os2.homedir(), '.config', 'ttyreel'); fs2.mkdirSync(dir, { recursive: true });
  const write = (iso) => fs2.writeFileSync(path2.join(dir, 'config.json'), JSON.stringify({ licenseKey: 'k-1234567890', validatedAt: iso }));
  reply = { status: 500, ok: false, body: {} };
  write(new Date().toISOString());
  assert.strictEqual((await validatePolarLicense()).valid, true); // fresh: no network call needed
  write(new Date(Date.now() - 3 * 86400000).toISOString());
  assert.strictEqual((await validatePolarLicense()).valid, true); // stale, Polar down: grace period
  write(new Date(Date.now() - 40 * 86400000).toISOString());
  assert.strictEqual((await validatePolarLicense()).valid, false); // beyond the grace period
});

test('a key of another product does not unlock this tool', async () => {
  reply = { status: 200, ok: true, body: { status: 'granted', benefit_id: '00000000-0000-0000-0000-000000000000' } };
  const r = await validatePolarLicense('some-key');
  assert.strictEqual(r.valid, false);
  assert.match(r.message, /does not include/);
});
