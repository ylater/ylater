import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const preview = process.argv.includes('--preview');
const directories = preview ? ['dist'] : ['src', 'public'];
const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : process.env.PORT || 5173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port');
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};
const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
  catch { response.writeHead(400); response.end('Bad request'); return; }
  for (const directory of directories) {
    const base = resolve(root, directory);
    const file = resolve(base, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(base + sep)) continue;
    try {
      if (!(await stat(file)).isFile()) continue;
      const body = await readFile(file);
      response.writeHead(200, {
        'Content-Type': types[extname(file)] || 'application/octet-stream',
        'Content-Length': body.length, 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(request.method === 'HEAD' ? undefined : body);
      return;
    } catch (error) {
      if (!['ENOENT', 'ENOTDIR'].includes(error.code)) {
        console.error(error);
        response.writeHead(500); response.end('Internal server error'); return;
      }
    }
  }
  response.writeHead(404); response.end('Not found');
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => {
  console.log(`${preview ? 'Preview' : 'Development'}: http://127.0.0.1:${port}`);
  if (!preview) console.log('Edit src/ or public/ and refresh the page to see changes.');
});
