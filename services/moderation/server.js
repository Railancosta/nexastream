const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
const db = new DatabaseSync(path.join(ROOT, 'database', 'moderation.db'));

db.exec(`CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY, target_type TEXT, target_id TEXT, reason TEXT, reporter TEXT, status TEXT DEFAULT 'open', created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS video_status(video_id TEXT PRIMARY KEY, status TEXT DEFAULT 'ok', updated_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY, action TEXT, actor TEXT, target_type TEXT, target_id TEXT, note TEXT, created_at TEXT DEFAULT (datetime('now')));`);

const AUTO_REVIEW = 3;
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
function log(action, actor, targetType, targetId, note) {
  db.prepare('INSERT INTO audit (id, action, actor, target_type, target_id, note) VALUES (?,?,?,?,?,?)').run(crypto.randomUUID(), action, actor, targetType, targetId, note || '');
}
function setStatus(videoId, status) {
  db.prepare("INSERT INTO video_status (video_id, status) VALUES (?,?) ON CONFLICT(video_id) DO UPDATE SET status=excluded.status, updated_at=datetime('now')").run(videoId, status);
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const body = req.method === 'POST' ? JSON.parse(await readBody(req) || '{}') : {};

  // USER REPORTS (Item 31)
  if (p === '/api/mod/report' && req.method === 'POST') {
    const { targetType, targetId, reason, reporter } = body;
    if (!targetType || !targetId || !reason) return json(res, 400, { error: 'campos obrigatorios' });
    if (limited('r:' + (reporter || 'anon'), 10, 60000)) return json(res, 429, { error: 'rate limit de denuncias' });
    db.prepare('INSERT INTO reports (id, target_type, target_id, reason, reporter) VALUES (?,?,?,?,?)').run(crypto.randomUUID(), targetType, targetId, String(reason).slice(0, 500), reporter || 'anon');
    log('report', reporter || 'anon', targetType, targetId, reason);
    // AUTOMATED CLASSIFICATION: 3 denuncias => auto-review
    const c = db.prepare("SELECT COUNT(*) c FROM reports WHERE target_id=? AND target_type=? AND status IN ('open','review')").get(targetId, targetType).c;
    let autoReview = false;
    if (targetType === 'video' && c >= AUTO_REVIEW) {
      const cur = db.prepare('SELECT status FROM video_status WHERE video_id=?').get(targetId);
      if (!cur || cur.status === 'ok') { setStatus(targetId, 'review'); autoReview = true; log('auto_review', 'system', 'video', targetId, 'threshold ' + AUTO_REVIEW + ' atingido'); }
    }
    return json(res, 200, { ok: true, reports: c, autoReview });
  }

  // HUMAN REVIEW + ENFORCEMENT (approve/remove)
  if (p === '/api/mod/action' && req.method === 'POST') {
    const { targetId, action, moderator } = body;
    if (!targetId || !action || !moderator) return json(res, 400, { error: 'campos obrigatorios' });
    if (action === 'approve') {
      setStatus(targetId, 'ok');
      db.prepare("UPDATE reports SET status='resolved' WHERE target_id=? AND status IN ('open','review')").run(targetId);
      log('approve', moderator, 'video', targetId, '');
      return json(res, 200, { ok: true, status: 'ok' });
    }
    if (action === 'remove') {
      setStatus(targetId, 'removed');
      db.prepare("UPDATE reports SET status='resolved' WHERE target_id=? AND status IN ('open','review')").run(targetId);
      log('remove', moderator, 'video', targetId, 'conteudo removido');
      return json(res, 200, { ok: true, status: 'removed' });
    }
    return json(res, 400, { error: 'acao invalida (use approve ou remove)' });
  }

  // MODERATION QUEUE
  if (p === '/api/mod/queue') {
    return json(res, 200, { reports: db.prepare("SELECT r.*, COALESCE(v.status,'ok') AS vstatus FROM reports r LEFT JOIN video_status v ON v.video_id=r.target_id WHERE r.status IN ('open','review') ORDER BY r.created_at DESC LIMIT 50").all() });
  }

  // AUDIT TRAILS
  if (p === '/api/mod/audit') {
    return json(res, 200, { audit: db.prepare('SELECT * FROM audit ORDER BY created_at DESC LIMIT 50').all() });
  }

  // STATUS + LISTA DE REMOVIDOS (para o frontend ocultar)
  if (p === '/api/mod/removed') {
    return json(res, 200, { removed: db.prepare("SELECT video_id FROM video_status WHERE status='removed'").all().map(r => r.video_id) });
  }
  const mSt = p.match(/^\/api\/mod\/status\/([\w-]+)$/);
  if (mSt) {
    const r = db.prepare('SELECT status FROM video_status WHERE video_id=?').get(mSt[1]);
    return json(res, 200, { status: r ? r.status : 'ok' });
  }

  json(res, 404, { error: 'rota nao encontrada' });
});

server.listen(3014, () => console.log('Moderation Service: http://localhost:3014'));
