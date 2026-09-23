// Minimal dependency-free static server for the built app, with SPA fallback.
// Used by `npm run serve:dist` and by Playwright's webServer in CI.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../dist/qa-sandbox/browser/', import.meta.url));
const port = Number(process.env.PORT) || 4300;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.txt': 'text/plain; charset=utf-8',
};

async function tryFile(path) {
  try {
    const s = await stat(path);
    if (s.isFile()) return path;
  } catch {}
  return null;
}

const server = createServer(async (req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const safe = normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(root, safe);

  let resolved = await tryFile(filePath);
  // SPA fallback: any unknown, extension-less route serves index.html
  if (!resolved) resolved = await tryFile(join(root, 'index.html'));

  if (!resolved) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  try {
    const body = await readFile(resolved);
    res.writeHead(200, { 'Content-Type': MIME[extname(resolved)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(500);
    res.end('Server error');
  }
});

server.listen(port, () => {
  console.log(`qa-sandbox serving ${root} at http://localhost:${port}`);
});
