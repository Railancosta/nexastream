// apps/web is a static PWA shell (index.html + app.js + style.css), not a Next
// app: there is no app/ or pages/ directory, so `next build` can never succeed.
// CI and the deploy workflows all consume apps/web/out/, so assemble that
// directory here instead. Run with --serve for a zero-dependency dev server.
import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const out = join(root, 'out');
const ASSETS = ['index.html', 'app.js', 'style.css', 'manifest.webmanifest'];

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const f of ASSETS) await cp(join(root, f), join(out, f));
await cp(join(root, 'public'), out, { recursive: true });
console.log(`apps/web -> out/ (${ASSETS.length} files + public/)`);

if (!process.argv.includes('--serve')) process.exit(0);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};
const port = Number(process.env.PORT) || 3000;

createServer(async (req, res) => {
  const rel = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(out, rel);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(out, 'index.html');
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404');
  }
}).listen(port, () => console.log(`apps/web: http://localhost:${port}`));
