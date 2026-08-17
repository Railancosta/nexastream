const http = require('node:http');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
const core = new DatabaseSync(path.join(ROOT, 'database', 'nexastream.db'), { readOnly: true });
let social = null;
try { social = new DatabaseSync(path.join(ROOT, 'database', 'social.db'), { readOnly: true }); } catch (e) {}

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}

function feed(user) {
  const videos = core.prepare("SELECT v.id, v.title, v.views, v.created_at, c.name AS channel FROM videos v LEFT JOIN channels c ON c.id=v.channel_id WHERE v.status='ready'").all();
  let subs = [];
  let commented = {};
  if (user && social) {
    try {
      subs = social.prepare('SELECT channel FROM subscriptions WHERE subscriber=?').all(user).map(r => r.channel);
      commented = Object.fromEntries(social.prepare('SELECT video_id, COUNT(*) n FROM comments WHERE username=? GROUP BY video_id').all(user).map(r => [r.video_id, r.n]));
    } catch (e) {}
  }
  const now = Date.now();
  const scored = videos.map(v => {
    let score = Math.log10(1 + (v.views || 0)) * 2;
    if (subs.includes(v.channel)) score += 5;
    if (commented[v.id]) score += 2 * commented[v.id];
    const ageH = (now - new Date(String(v.created_at).replace(' ', 'T') + 'Z').getTime()) / 3600000;
    score += Math.max(0, 3 - ageH / 24);
    return { ...v, score: +score.toFixed(2) };
  });
  scored.sort((a, b) => b.score - a.score);
  const out = []; const per = {};
  for (const v of scored) {
    per[v.channel] = (per[v.channel] || 0) + 1;
    if (per[v.channel] <= 2) out.push(v);
    if (out.length >= 10) break;
  }
  return { user: user || null, signals: { subscriptions: subs.length, comments: Object.keys(commented).length }, feed: out };
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/api/reco/feed') return json(res, 200, feed(u.searchParams.get('user')));
  if (u.pathname === '/api/reco/health') return json(res, 200, { ok: true });
  json(res, 404, { error: 'rota nao encontrada' });
});
server.listen(3012, () => console.log('Recommendation Service: http://localhost:3012'));
