import * as http from 'http';
import { exec } from 'child_process';

export type PreviewServer = http.Server & { update: (svg: string) => void };

const PAGE = `<!doctype html><meta charset="utf-8"><title>ttyreel preview</title>
<style>html,body{margin:0;background:#1b1b1f;display:flex;min-height:100vh;align-items:center;justify-content:center}img{max-width:96vw;max-height:96vh}</style>
<img id="i" src="/image.svg">
<script>
  const img = document.getElementById('i');
  new EventSource('/events').onmessage = () => { img.src = '/image.svg?t=' + Date.now(); };
</script>`;

/**
 * Serves the rendered SVG on 127.0.0.1 only (the output of a command can contain secrets: it must not be
 * reachable from the network). If the port is taken, the next free one is used. With `watch` the root page
 * is a small viewer that reloads the image whenever `update(svg)` is called; without it the root is the SVG.
 */
export function startPreviewServer(svg: string, port: number = 3333, openBrowser: boolean = true, watch: boolean = false): PreviewServer {
  let current = svg;
  const clients = new Set<http.ServerResponse>();

  const server = http.createServer((req, res) => {
    const url = (req.url || '/').split('?')[0];
    if (url === '/favicon.ico') {
      res.writeHead(404);
      res.end();
      return;
    }
    if (url === '/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(': connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    if (watch && url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
      res.end(PAGE);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-cache' });
    res.end(current);
  }) as PreviewServer;

  server.update = (next: string) => {
    current = next;
    for (const c of clients) c.write('data: reload\n\n');
  };

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
    console.log(`\n🚀 ttyreel Live Preview running at: ${url}`);
    console.log('   (Press Ctrl+C to stop preview server)\n');

    if (openBrowser) {
      const open = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd /c start ""' : 'xdg-open';
      exec(`${open} ${url}`);
    }
  });

  server.on('close', () => { for (const c of clients) c.end(); });
  server.listen(port, '127.0.0.1');
  return server;
}
