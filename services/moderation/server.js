const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
const db = new DatabaseSync(path.join(ROOT, 'database', 'moderation.db'));
db.exec(`CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY, target_type TEXT, target_id TEXT, reason TEXT, reporter TEXT, status TEXT DEFAULT 'open', created_at INTEGER);
CREATE TABLE IF NOT EXISTS video_status(video_id TEXT PRIMARY KEY, status TEXT DEFAULT 'ok', updated_at INTEGER);
CREATE TABLE IF NOT EXISTS appeals(id TEXT PRIMARY KEY, video_id TEXT, creator TEXT, reason TEXT, status TEXT DEFAULT 'open', created_at INTEGER);
CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY, action TEXT, actor TEXT, target TEXT, note TEXT, created_at INTEGER);`);

const AUTO_REVIEW = 3;
const rate = new Map();
function limited(k, max, win) { const n = Date.now(); const a = (rate.get(k) || []).filter(t => n - t < win); a.push(n); rate.set(k, a); return a.length > max; }
function json(res, c, o) { res.writeHead(c, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }); res.end(JSON.stringify(o)); }
function readBody(req) { return new Promise((res, rej) => { const c = []; let n = 0; req.on('data', d => { n += d.length; if (n > 1e6) req.destroy(); else c.push(d); }); req.on('end', () => res(Buffer.concat(c).toString())); req.on('error', rej); }); }
function log(action, actor, target, note) { db.prepare('INSERT INTO audit VALUES (?,?,?,?,?,?)').run(crypto.randomUUID(), action, actor, target, note || '', Date.now()); }
function setStatus(videoId, status) { db.prepare("INSERT INTO video_status (video_id, status, updated_at) VALUES (?,?,?) ON CONFLICT(video_id) DO UPDATE SET status=excluded.status, updated_at=excluded.updated_at").run(videoId, status, Date.now()); }
function getStatus(videoId) { const r = db.prepare('SELECT status FROM video_status WHERE video_id=?').get(videoId); return r ? r.status : 'ok'; }

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const body = req.method === 'POST' ? JSON.parse(await readBody(req) || '{}') : {};

  if (p === '/api/mod/report' && req.method === 'POST') {
    const { targetType, targetId, reason, reporter } = body;
    if (!targetType || !targetId || !reason) return json(res, 400, { error: 'campos obrigatorios' });
    if (limited('r:' + (reporter || 'anon'), 10, 60000)) return json(res, 429, { error: 'rate limit' });
    db.prepare('INSERT INTO reports VALUES (?,?,?,?,?,?,?)').run(crypto.randomUUID(), targetType, targetId, String(reason).slice(0, 500), reporter || 'anon', 'open', Date.now());
    log('report', reporter || 'anon', targetId, reason);
    const c = db.prepare("SELECT COUNT(*) c FROM reports WHERE target_id=? AND status='open'").get(targetId).c;
    if (targetType === 'video' && c >= AUTO_REVIEW && getStatus(targetId) === 'ok') { setStatus(targetId, 'review'); log('auto_review', 'system', targetId, 'threshold ' + AUTO_REVIEW); }
    return json(res, 200, { ok: true, reports: c });
  }

  if (p === '/api/mod/action' && req.method === 'POST') {
    const { targetId, action, moderator } = body;
    if (action === 'approve') { setStatus(targetId, 'ok'); db.prepare("UPDATE reports SET status='resolved' WHERE target_id=? AND status='open'").run(targetId); log('approve', moderator || 'mod', targetId, ''); return json(res, 200, { ok: true, status: 'ok' }); }
    if (action === 'remove') { setStatus(targetId, 'removed'); db.prepare("UPDATE reports SET status='resolved' WHERE target_id=? AND status='open'").run(targetId); log('remove', moderator || 'mod', targetId, ''); return json(res, 200, { ok: true, status: 'removed' }); }
    return json(res, 400, { error: 'acao invalida' });
  }

  // APPEALS (Item 31)
  if (p === '/api/mod/appeal' && req.method === 'POST') {
    const { videoId, creator, reason } = body;
    if (!videoId || !reason) return json(res, 400, { error: 'campos obrigatorios' });
    if (getStatus(videoId) !== 'removed') return json(res, 400, { error: 'so videos removidos podem apelar' });
    if (db.prepare("SELECT id FROM appeals WHERE video_id=? AND status='open'").get(videoId)) return json(res, 409, { error: 'apelacao ja aberta' });
    if (limited('a:' + (creator || 'anon'), 5, 3600000)) return json(res, 429, { error: 'rate limit de apelacoes' });
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO appeals VALUES (?,?,?,?,?,?)').run(id, videoId, creator || 'anon', String(reason).slice(0, 500), 'open', Date.now());
    log('appeal', creator || 'anon', videoId, reason);
    return json(res, 200, { id, status: 'open' });
  }

  if (p === '/api/mod/appeal/resolve' && req.method === 'POST') {
    const { videoId, action, moderator } = body;
    const ap = db.prepare("SELECT * FROM appeals WHERE video_id=? AND status='open'").get(videoId);
    if (!ap) return json(res, 404, { error: 'apelacao nao encontrada' });
    if (action === 'restore') { setStatus(videoId, 'ok'); db.prepare("UPDATE appeals SET status='restored' WHERE id=?").run(ap.id); log('appeal_restore', moderator || 'mod', videoId, ''); return json(res, 200, { ok: true, status: 'ok' }); }
    if (action === 'uphold') { db.prepare("UPDATE appeals SET status='upheld' WHERE id=?").run(ap.id); log('appeal_uphold', moderator || 'mod', videoId, ''); return json(res, 200, { ok: true, status: 'removed' }); }
    return json(res, 400, { error: 'acao invalida' });
  }

  if (p === '/api/mod/queue') return json(res, 200, { reports: db.prepare("SELECT r.*, COALESCE(v.status,'ok') AS vstatus FROM reports r LEFT JOIN video_status v ON v.video_id=r.target_id WHERE r.status='open' ORDER BY r.created_at DESC LIMIT 50").all() });
  if (p === '/api/mod/appeals') return json(res, 200, { appeals: db.prepare("SELECT * FROM appeals WHERE status='open' ORDER BY created_at DESC LIMIT 50").all() });
  if (p === '/api/mod/audit') return json(res, 200, { audit: db.prepare('SELECT * FROM audit ORDER BY created_at DESC LIMIT 50').all() });
  if (p === '/api/mod/removed') return json(res, 200, { removed: db.prepare("SELECT video_id FROM video_status WHERE status='removed'").all().map(r => r.video_id) });
  const m = p.match(/^\/api\/mod\/status\/([\w-]+)$/);
  if (m) return json(res, 200, { status: getStatus(m[1]) });

  json(res, 404, { error: 'rota nao encontrada' });
});
server.listen(3014, () => console.log('Moderation v2 (com appeals): http://localhost:3014'));
