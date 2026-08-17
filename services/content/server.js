const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
const DB_PATH = path.join(ROOT, 'database', 'nexastream.db');
const MANIFESTS = path.join(ROOT, 'storage', 'manifests');
fs.mkdirSync(MANIFESTS, { recursive: true });

const db = new DatabaseSync(DB_PATH);
try { db.exec('ALTER TABLE videos ADD COLUMN content_id TEXT'); } catch (e) {}

const CHUNK = 256 * 1024;

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}

function buildManifest(videoId, filePath) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const full = crypto.createHash('sha256');
    let buf = Buffer.alloc(0);
    let i = 0;
    const rs = fs.createReadStream(filePath);
    rs.on('data', (d) => {
      full.update(d);
      buf = Buffer.concat([buf, d]);
      while (buf.length >= CHUNK) {
        const c = buf.subarray(0, CHUNK);
        chunks.push({ index: i++, size: CHUNK, hash: crypto.createHash('sha256').update(c).digest('hex') });
        buf = buf.subarray(CHUNK);
      }
    });
    rs.on('end', () => {
      if (buf.length) chunks.push({ index: i, size: buf.length, hash: crypto.createHash('sha256').update(buf).digest('hex') });
      const contentId = full.digest('hex');
      const manifest = { videoId, contentId, chunkSize: CHUNK, totalChunks: chunks.length, chunks, createdAt: new Date().toISOString() };
      fs.writeFileSync(path.join(MANIFESTS, videoId + '.json'), JSON.stringify(manifest, null, 2));
      db.prepare('UPDATE videos SET content_id = ? WHERE id = ?').run(contentId, videoId);
      resolve(manifest);
    });
    rs.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const p = new URL(req.url, 'http://localhost').pathname;

  const mIndex = p.match(/^\/api\/content\/index\/([\w-]+)$/);
  if (mIndex && req.method === 'POST') {
    const v = db.prepare('SELECT video_path FROM videos WHERE id = ?').get(mIndex[1]);
    if (!v) return json(res, 404, { error: 'video nao encontrado' });
    const file = path.join(ROOT, v.video_path.replace(/^\//, ''));
    if (!fs.existsSync(file)) return json(res, 404, { error: 'arquivo nao encontrado' });
    const mf = await buildManifest(mIndex[1], file);
    return json(res, 200, { contentId: mf.contentId, totalChunks: mf.totalChunks });
  }

  const mVer = p.match(/^\/api\/content\/verify\/([\w-]+)$/);
  if (mVer) {
    const v = db.prepare('SELECT video_path, content_id FROM videos WHERE id = ?').get(mVer[1]);
    if (!v) return json(res, 404, { error: 'video nao encontrado' });
    const h = crypto.createHash('sha256');
    const rs = fs.createReadStream(path.join(ROOT, v.video_path.replace(/^\//, '')));
    rs.on('data', (d) => h.update(d));
    rs.on('end', () => {
      const now = h.digest('hex');
      json(res, 200, { stored: v.content_id, current: now, integrity: now === v.content_id });
    });
    return;
  }

  const mChunk = p.match(/^\/api\/content\/([\w-]+)\/chunks\/(\d+)$/);
  if (mChunk) {
    const mfPath = path.join(MANIFESTS, mChunk[1] + '.json');
    if (!fs.existsSync(mfPath)) return json(res, 404, { error: 'manifest nao encontrado' });
    const mf = JSON.parse(fs.readFileSync(mfPath, 'utf8'));
    const ch = mf.chunks[parseInt(mChunk[2], 10)];
    if (!ch) return json(res, 404, { error: 'chunk nao encontrado' });
    const v = db.prepare('SELECT video_path FROM videos WHERE id = ?').get(mChunk[1]);
    const file = path.join(ROOT, v.video_path.replace(/^\//, ''));
    const start = parseInt(mChunk[2], 10) * CHUNK;
    const end = Math.min(start + CHUNK, fs.statSync(file).size) - 1;
    res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'X-Chunk-Hash': ch.hash });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }

  const mGet = p.match(/^\/api\/content\/([\w-]+)$/);
  if (mGet) {
    const mfPath = path.join(MANIFESTS, mGet[1] + '.json');
    if (!fs.existsSync(mfPath)) return json(res, 404, { error: 'manifest nao encontrado' });
    return json(res, 200, JSON.parse(fs.readFileSync(mfPath, 'utf8')));
  }

  if (p === '/api/content/dedup') {
    const rows = db.prepare('SELECT content_id, COUNT(*) AS n FROM videos WHERE content_id IS NOT NULL GROUP BY content_id HAVING n > 1').all();
    return json(res, 200, { duplicates: rows });
  }

  json(res, 404, { error: 'rota nao encontrada' });
});

server.listen(3004, () => console.log('Content Addressing Service: http://localhost:3004'));
