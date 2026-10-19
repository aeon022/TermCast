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
exports.startPreviewServer = startPreviewServer;
const http = __importStar(require("http"));
const child_process_1 = require("child_process");
/**
 * Serves the rendered SVG on 127.0.0.1 only (the output of a command can contain secrets: it must not be
 * reachable from the network). If the port is taken, the next free one is used.
 */
function startPreviewServer(svg, port = 3333, openBrowser = true) {
    const server = http.createServer((req, res) => {
        if (req.url === '/favicon.ico') {
            res.writeHead(404);
            res.end();
            return;
        }
        res.writeHead(200, {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'no-cache'
        });
        res.end(svg);
    });
    let tries = 0;
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE' && tries++ < 10) {
            port += 1;
            server.listen(port, '127.0.0.1');
            return;
        }
        throw err;
    });
    server.on('listening', () => {
        const url = `http://127.0.0.1:${server.address().port}`;
        console.log(`\n🚀 TermCast Live Preview running at: ${url}`);
        console.log('   (Press Ctrl+C to stop preview server)\n');
        if (openBrowser) {
            const open = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd /c start ""' : 'xdg-open';
            (0, child_process_1.exec)(`${open} ${url}`);
        }
    });
    server.listen(port, '127.0.0.1');
    return server;
}
