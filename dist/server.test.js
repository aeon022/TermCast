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
const node_test_1 = require("node:test");
const assert = __importStar(require("node:assert"));
const http = __importStar(require("http"));
const server_1 = require("./server");
function get(port, host = '127.0.0.1') {
    return new Promise((resolve, reject) => {
        http.get({ host, port, path: '/', agent: false, headers: { Connection: 'close' } }, (res) => {
            let body = '';
            res.on('data', (d) => (body += d));
            res.on('end', () => resolve({ status: res.statusCode || 0, type: String(res.headers['content-type']), body }));
        }).on('error', reject);
    });
}
(0, node_test_1.test)('the preview serves the SVG on loopback only, and moves on when the port is taken', async () => {
    const log = console.log;
    console.log = () => { }; // the preview announces itself on stdout, which the test runner reads
    const first = (0, server_1.startPreviewServer)('<svg id="one"/>', 39333, false);
    await new Promise((r) => first.once('listening', r));
    const second = (0, server_1.startPreviewServer)('<svg id="two"/>', 39333, false);
    await new Promise((r) => second.once('listening', r));
    try {
        const a1 = first.address();
        const a2 = second.address();
        assert.strictEqual(a1.address, '127.0.0.1', 'bound to loopback, not to every interface');
        assert.strictEqual(a2.port, a1.port + 1, 'the next free port is used');
        const res = await get(a1.port);
        assert.strictEqual(res.status, 200);
        assert.strictEqual(res.type, 'image/svg+xml');
        assert.strictEqual(res.body, '<svg id="one"/>');
        assert.strictEqual((await get(a2.port)).body, '<svg id="two"/>');
    }
    finally {
        console.log = log;
        for (const srv of [first, second]) {
            srv.closeAllConnections?.();
            srv.close();
        }
    }
});
(0, node_test_1.test)('watch mode: the root is a viewer page and update() pushes a reload event', async () => {
    const log = console.log;
    console.log = () => { };
    const srv = (0, server_1.startPreviewServer)('<svg id="a"/>', 39433, false, true);
    await new Promise((r) => srv.once('listening', r));
    try {
        const port = srv.address().port;
        assert.match((await get(port)).body, /EventSource\('\/events'\)/);
        const img = await new Promise((resolve, reject) => {
            http.get({ host: '127.0.0.1', port, path: '/image.svg', agent: false }, (res) => { let b = ''; res.on('data', (d) => (b += d)); res.on('end', () => resolve(b)); }).on('error', reject);
        });
        assert.equal(img, '<svg id="a"/>');
        const got = await new Promise((resolve, reject) => {
            const req = http.get({ host: '127.0.0.1', port, path: '/events', agent: false }, (res) => {
                let buf = '';
                res.on('data', (d) => {
                    buf += d;
                    if (buf.includes('connected'))
                        srv.update('<svg id="b"/>');
                    if (buf.includes('data: reload')) {
                        req.destroy();
                        resolve(buf);
                    }
                });
            });
            req.on('error', (e) => { if (e.code !== 'ECONNRESET')
                reject(e); });
            setTimeout(() => reject(new Error('no reload event')), 4000);
        });
        assert.match(got, /data: reload/);
        const img2 = await new Promise((resolve, reject) => {
            http.get({ host: '127.0.0.1', port, path: '/image.svg?t=1', agent: false }, (res) => { let b = ''; res.on('data', (d) => (b += d)); res.on('end', () => resolve(b)); }).on('error', reject);
        });
        assert.equal(img2, '<svg id="b"/>', 'the new image is served after the update');
    }
    finally {
        console.log = log;
        srv.closeAllConnections?.();
        srv.close();
    }
});
