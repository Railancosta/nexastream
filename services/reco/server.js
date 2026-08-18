const http = require('node:http');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
function openRo(name) { try { return new DatabaseSync(path.join(ROOT, 'database', name), { readOnly: true }); } catch (e) { return null; } }
const core = openRo('nexastream.db');
const social = openRo('social.db');
const analytics = openRo('analytics.db');
function all(db, sql, args) { try { return db ? db.prepare(sql).all(...(args || [])) : []; } catch (e) { return []; } }

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname !== '/api/reco/feed') { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'rota nao encontrada' })); }
  const user = u.searchParams.get('user') || '';
  const videos = all(core, "SELECT v.id, v.title, v.thumbnail_path, v.views, v.created_at, v.channel_id, c.name AS channel, c.name AS channel_name FROM videos v LEFT JOIN channels c ON c.id=v.channel_id WHERE v.status='ready'");
  const subs = new Set(all(social, 'SELECT channel FROM subscriptions WHERE subscriber=?', [user]).map(r => r.channel));
  const cmtMap = Object.fromEntries(all(social, 'SELECT video_id, COUNT(*) n FROM comments WHERE username=? GROUP BY video_id', [user]).map(r => [r.video_id, r.n]));
  const watchTot = Object.fromEntries(all(analytics, 'SELECT video_id, COALESCE(SUM(seconds),0) s FROM watch GROUP BY video_id').map(r => [r.video_id, r.s]));
  const histChan = new Set(all(analytics, 'SELECT v.channel_id ch FROM watch w JOIN videos v ON v.id=w.video_id WHERE w.user=? AND w.seconds>5', [user]).map(r => r.ch));
  const now = Date.now();
  const scored = videos.map(v => {
    let score = Math.log10(1 + (v.views || 0)) * 2;
    if (subs.has(v.channel)) score += 5;
    if (cmtMap[v.id]) score += 2 * cmtMap[v.id];
    score += Math.min(5, Math.log10(1 + (watchTot[v.id] || 0)) * 1.2);
    if (histChan.has(v.channel_id)) score += 3;
    const ageH = (now - new Date(String(v.created_at || '').replace(' ', 'T') + 'Z').getTime()) / 3600000;
    if (!isNaN(ageH)) score += Math.max(0, 3 - ageH / 24);
    return { ...v, score: +score.toFixed(2) };
  });
  scored.sort((a, b) => b.score - a.score);
  const out = []; const per = {};
  for (const v of scored) { per[v.channel] = (per[v.channel] || 0) + 1; if (per[v.channel] <= 2) out.push(v); if (out.length >= 10) break; }
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({ user: user || null, signals: { subscriptions: subs.size, comments: Object.keys(cmtMap).length, watchSignals: Object.keys(watchTot).length, personalHistory: histChan.size }, feed: out }));
});
server.listen(3012, () => console.log('Recommendation Service: http://localhost:3012'));
