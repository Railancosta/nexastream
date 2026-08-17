const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const LIVE_DIR = path.join(ROOT, 'storage', 'live');
fs.mkdirSync(LIVE_DIR, { recursive: true });
const streams = new Map();

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((res, rej) => {
    const c = []; let n = 0;
    req.on('data', d => { n += d.length; if (n > 1e6) req.destroy(); else c.push(d); });
    req.on('end', () => res(Buffer.concat(c).toString()));
    req.on('error', rej);
  });
}
function serveFile(res, file) {
  if (!fs.existsSync(file)) return json(res, 404, { error: 'nao encontrado' });
  const ext = path.extname(file);
  const type = ext === '.m3u8' ? 'application/vnd.apple.mpegurl' : ext === '.ts' ? 'video/mp2t' : 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;
  if (req.method === 'OPTIONS') return json(res, 204, {});

  if (p.startsWith('/live/')) {
    const file = path.join(LIVE_DIR, p.replace(/^\/live\//, ''));
    if (!file.startsWith(LIVE_DIR)) return json(res, 403, { error: 'proibido' });
    return serveFile(res, file);
  }

  if (p === '/api/live/health') return json(res, 200, { ok: true });

  if (p === '/api/live/start' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req) || '{}');
    const id = crypto.randomUUID().slice(0, 8);
    const dir = path.join(LIVE_DIR, id);
    fs.mkdirSync(dir, { recursive: true });
    const proc = spawn('ffmpeg', [
      '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=15',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency',
      '-f', 'hls', '-hls_time', '2', '-hls_list_size', '6',
      '-hls_flags', 'delete_segments',
      '-hls_segment_filename', path.join(dir, 'seg%03d.ts'),
      path.join(dir, 'index.m3u8')
    ], { stdio: 'ignore' });
    const url = '/live/' + id + '/index.m3u8';
    streams.set(id, { id, title: body.title || 'Live ' + id, channel: body.channel || 'demo', status: 'live', startedAt: Date.now(), url, proc });
    proc.on('exit', () => { const s = streams.get(id); if (s && s.status === 'live') { s.status = 'ended'; s.endedAt = Date.now(); } });
    return json(res, 200, { id, status: 'live', url });
  }

  if (p === '/api/live/stop' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req) || '{}');
    const s = streams.get(body.id);
    if (!s) return json(res, 404, { error: 'stream nao encontrada' });
    try { s.proc.kill('SIGINT'); } catch (e) {}
    s.status = 'ended'; s.endedAt = Date.now();
    return json(res, 200, { id: body.id, status: 'ended', vod: s.url });
  }

  if (p === '/api/live/streams') {
    return json(res, 200, { streams: [...streams.values()].map(({ proc, ...rest }) => rest) });
  }

  json(res, 404, { error: 'rota nao encontrada' });
});

server.listen(3013, () => console.log('Live Service: http://localhost:3013'));
