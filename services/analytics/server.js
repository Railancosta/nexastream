const http = require('node:http');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
const db = new DatabaseSync(path.join(ROOT, 'database', 'analytics.db'));
db.exec(`CREATE TABLE IF NOT EXISTS watch(id INTEGER PRIMARY KEY AUTOINCREMENT, video_id TEXT, viewer_id TEXT, user TEXT DEFAULT '', seconds REAL, completed INTEGER DEFAULT 0, ts INTEGER);`);

const rate = new Map();
function limited(key, max, win) {
  const now = Date.now();
  const arr = (rate.get(key) || []).filter(t => now - t < win);
  arr.push(now); rate.set(key, arr);
  return arr.length > max;
}
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

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;
  if (req.method === 'OPTIONS') return json(res, 204, {});

  if (p === '/api/analytics/watch' && req.method === 'POST') {
    const b = JSON.parse(await readBody(req) || '{}');
    const sec = Number(b.seconds);
    if (!b.videoId || !b.viewerId || !isFinite(sec) || sec < 0 || sec > 7200) return json(res, 400, { error: 'payload invalido' });
    if (limited('w:' + b.viewerId, 60, 60000)) return json(res, 429, { error: 'rate limit' });
    db.prepare('INSERT INTO watch (video_id, viewer_id, user, seconds, completed, ts) VALUES (?,?,?,?,?,?)')
      .run(String(b.videoId), String(b.viewerId), String(b.user || ''), sec, b.completed ? 1 : 0, Date.now());
    return json(res, 200, { ok: true });
  }

  const mV = p.match(/^\/api\/analytics\/video\/([\w-]+)$/);
  if (mV) {
    const r = db.prepare('SELECT COALESCE(SUM(seconds),0) total, COUNT(*) events, COALESCE(SUM(completed),0) completions FROM watch WHERE video_id=?').get(mV[1]);
    return json(res, 200, r);
  }

  if (p === '/api/analytics/totals') {
    const r = db.prepare('SELECT COALESCE(SUM(seconds),0) s, COUNT(DISTINCT viewer_id) uv FROM watch').get();
    return json(res, 200, { total_seconds: r.s, unique_viewers: r.uv, watch_hours: +(r.s / 3600).toFixed(2) });
  }

  json(res, 404, { error: 'rota nao encontrada' });
});
server.listen(3018, () => console.log('Analytics Service: http://localhost:3018'));
