import * as http from 'http';
import { exec } from 'child_process';

export function startPreviewServer(svg: string, port: number = 3333): void {
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

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`\n🚀 TermCast Live Preview running at: ${url}`);
    console.log('   (Press Ctrl+C to stop preview server)\n');

    const startCmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${startCmd} ${url}`);
  });
}
