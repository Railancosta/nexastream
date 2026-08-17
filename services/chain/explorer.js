const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
const chain = new DatabaseSync(path.join(ROOT, 'database', 'nexastream.db'), { readOnly: true });
const exp = new DatabaseSync(path.join(ROOT, 'database', 'explorer.db'));

exp.exec(`CREATE TABLE IF NOT EXISTS binds(username TEXT PRIMARY KEY, address TEXT);
CREATE TABLE IF NOT EXISTS rewards(id TEXT PRIMARY KEY, video_id TEXT, viewer TEXT, creator TEXT, tx_id TEXT, created_at TEXT DEFAULT (datetime('now')));`);

const REWARD = 1;

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((res, rej) => {
    const c = []; let n = 0;
    req.on('data', (d) => { n += d.length; if (n > 1e6) req.destroy(); else c.push(d); });
    req.on('end', () => res(Buffer.concat(c).toString()));
    req.on('error', rej);
  });
}
function treasury() {
  const g = chain.prepare('SELECT txs FROM blocks WHERE idx=0').get();
  return JSON.parse(g.txs)[0].to;
}

const server = http.createServer(async (req, res) => {
  const p = new URL(req.url, 'http://localhost').pathname;
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const body = req.method === 'POST' ? JSON.parse(await readBody(req) || '{}') : {};

  if (p === '/api/explorer') {
    const blocks = chain.prepare('SELECT idx, hash, prev, miner, ts, txs FROM blocks ORDER BY idx DESC LIMIT 10').all();
    return json(res, 200, { height: blocks.length ? blocks[0].idx : 0, blocks: blocks.map(b => ({ ...b, txs: JSON.parse(b.txs) })) });
  }

  if (p === '/api/explorer/balances') {
    return json(res, 200, chain.prepare('SELECT * FROM balances WHERE amount>0 ORDER BY amount DESC LIMIT 50').all());
  }

  if (p === '/api/explorer/bind' && req.method === 'POST') {
    if (!body.username || !body.address) return json(res, 400, { error: 'username e address obrigatorios' });
    exp.prepare('INSERT OR REPLACE INTO binds (username, address) VALUES (?,?)').run(body.username, body.address);
    return json(res, 200, { ok: true, username: body.username, address: body.address });
  }

  if (p === '/api/explorer/reward' && req.method === 'POST') {
    const { videoId, viewerId } = body;
    if (!videoId || !viewerId) return json(res, 400, { error: 'videoId e viewerId obrigatorios' });
    if (exp.prepare('SELECT id FROM rewards WHERE video_id=? AND viewer=?').get(videoId, viewerId))
      return json(res, 429, { error: 'viewer ja recompensou este video (anti-fraud)' });
    if (exp.prepare('SELECT COUNT(*) c FROM rewards WHERE video_id=?').get(videoId).c >= 100)
      return json(res, 429, { error: 'teto de 100 recompensas do video atingido' });
    const video = chain.prepare('SELECT c.name FROM videos v LEFT JOIN channels c ON c.id=v.channel_id WHERE v.id=?').get(videoId);
    if (!video) return json(res, 404, { error: 'video nao encontrado' });
    const bind = exp.prepare('SELECT address FROM binds WHERE username=?').get(video.name);
    if (!bind) return json(res, 404, { error: 'criador ainda nao vinculou carteira NST' });
    const tAddr = treasury();
    const tr = chain.prepare('SELECT privkey FROM wallets WHERE address=?').get(tAddr);
    const r = await fetch('http://localhost:3008/api/chain/tx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: tAddr, to: bind.address, amount: REWARD, privateKey: tr.privkey }) });
    const d = await r.json();
    if (d.error) return json(res, 500, d);
    exp.prepare('INSERT INTO rewards (id, video_id, viewer, creator, tx_id) VALUES (?,?,?,?,?)').run(crypto.randomUUID(), videoId, viewerId, bind.address, d.txId);
    return json(res, 200, { reward: REWARD, to: bind.address, txId: d.txId, status: 'mempool (aguardando mineracao)' });
  }

  if (p === '/api/explorer/rewards') {
    return json(res, 200, exp.prepare('SELECT * FROM rewards ORDER BY created_at DESC LIMIT 50').all());
  }

  json(res, 404, { error: 'rota nao encontrada' });
});

server.listen(3009, () => console.log('Explorer + Creator Economy: http://localhost:3009'));
