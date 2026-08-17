const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
const db = new DatabaseSync(path.join(ROOT, 'database', 'social.db'));
let coreDb = null;
try { coreDb = new DatabaseSync(path.join(ROOT, 'database', 'nexastream.db'), { readOnly: true }); } catch (e) {}

db.exec(`CREATE TABLE IF NOT EXISTS comments(id TEXT PRIMARY KEY, video_id TEXT, username TEXT, content TEXT, created_at TEXT DEFAULT (datetime('now')));
CREATE TABLE IF NOT EXISTS subscriptions(id TEXT PRIMARY KEY, subscriber TEXT, channel TEXT, created_at TEXT DEFAULT (datetime('now')), UNIQUE(subscriber, channel));
CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY, recipient TEXT, type TEXT, text TEXT, read INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));`);

const rate = new Map();
function limited(key, max, windowMs) {
  const now = Date.now();
  const arr = (rate.get(key) || []).filter(t => now - t < windowMs);
  arr.push(now);
  rate.set(key, arr);
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
function channelOf(videoId) {
  if (!coreDb) return null;
  try {
    const r = coreDb.prepare('SELECT c.name AS channel_name FROM videos v LEFT JOIN channels c ON c.id=v.channel_id WHERE v.id=?').get(videoId);
    return r ? r.channel_name : null;
  } catch (e) { return null; }
}
function notify(recipient, type, text) {
  db.prepare('INSERT INTO notifications (id, recipient, type, text) VALUES (?,?,?,?)').run(crypto.randomUUID(), recipient, type, text);
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const body = req.method === 'POST' ? JSON.parse(await readBody(req) || '{}') : {};

  if (p === '/api/social/health') return json(res, 200, { ok: true });

  if (p === '/api/social/channel') return json(res, 200, { channel: channelOf(u.searchParams.get('videoId')) });

  if (p === '/api/social/comment' && req.method === 'POST') {
    const { videoId, username, content } = body;
    if (!videoId || !username || !content) return json(res, 400, { error: 'campos obrigatorios' });
    if (limited('c:' + username, 10, 60000)) return json(res, 429, { error: 'rate limit: max 10 comentarios/min' });
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO comments (id, video_id, username, content) VALUES (?,?,?,?)').run(id, videoId, username, String(content).slice(0, 2000));
    const ch = channelOf(videoId);
    if (ch && ch !== username) notify(ch, 'comment', username + ' comentou: ' + String(content).slice(0, 80));
    return json(res, 200, { id, status: 'publicado' });
  }

  if (p === '/api/social/comments') {
    return json(res, 200, db.prepare('SELECT * FROM comments WHERE video_id=? ORDER BY created_at DESC LIMIT 100').all(u.searchParams.get('videoId')));
  }

  if (p === '/api/social/subscribe' && req.method === 'POST') {
    const { subscriber, channel } = body;
    if (!subscriber || !channel) return json(res, 400, { error: 'campos obrigatorios' });
    if (subscriber === channel) return json(res, 400, { error: 'voce nao pode seguir a si mesmo' });
    const r = db.prepare('INSERT OR IGNORE INTO subscriptions (id, subscriber, channel) VALUES (?,?,?)').run(crypto.randomUUID(), subscriber, channel);
    if (r.changes > 0) notify(channel, 'subscribe', subscriber + ' se inscreveu no seu canal');
    return json(res, 200, { subscribed: true });
  }

  if (p === '/api/social/unsubscribe' && req.method === 'POST') {
    db.prepare('DELETE FROM subscriptions WHERE subscriber=? AND channel=?').run(body.subscriber, body.channel);
    return json(res, 200, { subscribed: false });
  }

  if (p === '/api/social/subscribed') {
    const r = db.prepare('SELECT id FROM subscriptions WHERE subscriber=? AND channel=?').get(u.searchParams.get('subscriber'), u.searchParams.get('channel'));
    return json(res, 200, { subscribed: !!r });
  }

  if (p === '/api/social/subscribers') {
    const rows = db.prepare('SELECT subscriber, created_at FROM subscriptions WHERE channel=? ORDER BY created_at DESC LIMIT 100').all(u.searchParams.get('channel'));
    return json(res, 200, { count: rows.length, list: rows });
  }

  if (p === '/api/social/notifications') {
    return json(res, 200, db.prepare('SELECT * FROM notifications WHERE recipient=? ORDER BY created_at DESC LIMIT 50').all(u.searchParams.get('to')));
  }

  if (p === '/api/social/notifications/read' && req.method === 'POST') {
    db.prepare('UPDATE notifications SET read=1 WHERE recipient=?').run(body.to);
    return json(res, 200, { ok: true });
  }

  json(res, 404, { error: 'rota nao encontrada' });
});

server.listen(3011, () => console.log('Social Service: http://localhost:3011'));
