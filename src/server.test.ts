import { test } from 'node:test';
import * as assert from 'node:assert';
import * as http from 'http';
import { startPreviewServer } from './server';

function get(port: number, host = '127.0.0.1'): Promise<{ status: number; type: string; body: string }> {
  return new Promise((resolve, reject) => {
    http.get({ host, port, path: '/', agent: false, headers: { Connection: 'close' } }, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ status: res.statusCode || 0, type: String(res.headers['content-type']), body }));
    }).on('error', reject);
  });
}

test('the preview serves the SVG on loopback only, and moves on when the port is taken', async () => {
  const log = console.log;
  console.log = () => {}; // the preview announces itself on stdout, which the test runner reads
  const first = startPreviewServer('<svg id="one"/>', 39333, false);
  await new Promise((r) => first.once('listening', r));
  const second = startPreviewServer('<svg id="two"/>', 39333, false);
  await new Promise((r) => second.once('listening', r));
  try {
    const a1 = (first.address() as any);
    const a2 = (second.address() as any);
    assert.strictEqual(a1.address, '127.0.0.1', 'bound to loopback, not to every interface');
    assert.strictEqual(a2.port, a1.port + 1, 'the next free port is used');
    const res = await get(a1.port);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.type, 'image/svg+xml');
    assert.strictEqual(res.body, '<svg id="one"/>');
    assert.strictEqual((await get(a2.port)).body, '<svg id="two"/>');
  } finally {
    console.log = log;
    for (const srv of [first, second]) {
      srv.closeAllConnections?.();
      srv.close();
    }
  }
});

test('watch mode: the root is a viewer page and update() pushes a reload event', async () => {
  const log = console.log;
  console.log = () => {};
  const srv = startPreviewServer('<svg id="a"/>', 39433, false, true);
  await new Promise((r) => srv.once('listening', r));
  try {
    const port = (srv.address() as any).port;
    assert.match((await get(port)).body, /EventSource\('\/events'\)/);
    const img = await new Promise<string>((resolve, reject) => {
      http.get({ host: '127.0.0.1', port, path: '/image.svg', agent: false }, (res) => { let b = ''; res.on('data', (d) => (b += d)); res.on('end', () => resolve(b)); }).on('error', reject);
    });
    assert.equal(img, '<svg id="a"/>');
    const got = await new Promise<string>((resolve, reject) => {
      const req = http.get({ host: '127.0.0.1', port, path: '/events', agent: false }, (res) => {
        let buf = '';
        res.on('data', (d) => {
          buf += d;
          if (buf.includes('connected')) srv.update('<svg id="b"/>');
          if (buf.includes('data: reload')) { req.destroy(); resolve(buf); }
        });
      });
      req.on('error', (e: any) => { if (e.code !== 'ECONNRESET') reject(e); });
      setTimeout(() => reject(new Error('no reload event')), 4000);
    });
    assert.match(got, /data: reload/);
    const img2 = await new Promise<string>((resolve, reject) => {
      http.get({ host: '127.0.0.1', port, path: '/image.svg?t=1', agent: false }, (res) => { let b = ''; res.on('data', (d) => (b += d)); res.on('end', () => resolve(b)); }).on('error', reject);
    });
    assert.equal(img2, '<svg id="b"/>', 'the new image is served after the update');
  } finally {
    console.log = log;
    srv.closeAllConnections?.();
    srv.close();
  }
});
