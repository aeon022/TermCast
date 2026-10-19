import * as http from 'http';
import { exec } from 'child_process';

/**
 * Serves the rendered SVG on 127.0.0.1 only (the output of a command can contain secrets: it must not be
 * reachable from the network). If the port is taken, the next free one is used.
 */
export function startPreviewServer(svg: string, port: number = 3333, openBrowser: boolean = true): http.Server {
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
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE' && tries++ < 10) {
      port += 1;
      server.listen(port, '127.0.0.1');
      return;
    }
    throw err;
  });

  server.on('listening', () => {
    const url = `http://127.0.0.1:${(server.address() as any).port}`;
    console.log(`\n🚀 TermCast Live Preview running at: ${url}`);
    console.log('   (Press Ctrl+C to stop preview server)\n');

    if (openBrowser) {
      const open = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd /c start ""' : 'xdg-open';
      exec(`${open} ${url}`);
    }
  });

  server.listen(port, '127.0.0.1');
  return server;
}
