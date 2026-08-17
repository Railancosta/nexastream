const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
const db = new DatabaseSync(path.join(ROOT, 'database', 'nft.db'));

db.exec(`CREATE TABLE IF NOT EXISTS nfts(id TEXT PRIMARY KEY, token_id INTEGER UNIQUE, content_id TEXT, video_id TEXT, creator TEXT, owner TEXT, license TEXT, metadata TEXT, minted_at INTEGER);
CREATE TABLE IF NOT EXISTS transfers(id TEXT PRIMARY KEY, token_id INTEGER, from_addr TEXT, to_addr TEXT, price REAL DEFAULT 0, kind TEXT, ts INTEGER);
CREATE TABLE IF NOT EXISTS listings(token_id INTEGER PRIMARY KEY, seller TEXT, price REAL, status TEXT DEFAULT 'active');`);

const DEFAULT_LICENSE = 'TOKEN_OWNERSHIP_ONLY: possuir este token NAO concede copyright do conteudo (Item 19).';

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
function log(kind, tokenId, from, to, price) {
  db.prepare('INSERT INTO transfers VALUES (?,?,?,?,?,?,?)').run(crypto.randomUUID(), tokenId, from, to, price, kind, Date.now());
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const body = req.method === 'POST' ? JSON.parse(await readBody(req) || '{}') : {};

  // MINT (Item 19: digital assets com license explicita)
  if (p === '/api/nft/mint' && req.method === 'POST') {
    const { videoId, creator, contentId, license } = body;
    if (!videoId || !creator) return json(res, 400, { error: 'videoId e creator obrigatorios' });
    const tokenId = (db.prepare('SELECT MAX(token_id) m FROM nfts').get().m || 0) + 1;
    const lic = license || DEFAULT_LICENSE;
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO nfts VALUES (?,?,?,?,?,?,?,?,?)').run(id, tokenId, contentId || null, videoId, creator, creator, lic, JSON.stringify({ videoId, contentId: contentId || null, creator, license: lic, standard: 'NST-1' }), Date.now());
    log('mint', tokenId, 'mint', creator, 0);
    return json(res, 200, { id, tokenId, license: lic, notice: 'TOKEN OWNERSHIP ≠ COPYRIGHT OWNERSHIP' });
  }

  // LIST (anunciar no marketplace)
  if (p === '/api/nft/list' && req.method === 'POST') {
    const { tokenId, seller, price } = body;
    const n = db.prepare('SELECT * FROM nfts WHERE token_id=?').get(tokenId);
    if (!n) return json(res, 404, { error: 'nft nao existe' });
    if (n.owner !== seller) return json(res, 403, { error: 'somente o dono pode anunciar' });
    db.prepare('INSERT OR REPLACE INTO listings VALUES (?,?,?,?)').run(tokenId, seller, price || 0, 'active');
    return json(res, 200, { ok: true, tokenId, price });
  }

  // BUY (compra no marketplace)
  if (p === '/api/nft/buy' && req.method === 'POST') {
    const { tokenId, buyer } = body;
    const l = db.prepare('SELECT * FROM listings WHERE token_id=? AND status=?').get(tokenId, 'active');
    if (!l) return json(res, 404, { error: 'listing nao ativa' });
    if (buyer === l.seller) return json(res, 400, { error: 'comprador nao pode ser o vendedor' });
    db.prepare('UPDATE nfts SET owner=? WHERE token_id=?').run(buyer, tokenId);
    log('sale', tokenId, l.seller, buyer, l.price);
    db.prepare("UPDATE listings SET status='sold' WHERE token_id=?").run(tokenId);
    return json(res, 200, { ok: true, owner: buyer, price: l.price });
  }

  // TRANSFER direto
  if (p === '/api/nft/transfer' && req.method === 'POST') {
    const { tokenId, from, to } = body;
    const n = db.prepare('SELECT * FROM nfts WHERE token_id=?').get(tokenId);
    if (!n) return json(res, 404, { error: 'nft nao existe' });
    if (n.owner !== from) return json(res, 403, { error: 'somente o dono pode transferir' });
    db.prepare('UPDATE nfts SET owner=? WHERE token_id=?').run(to, tokenId);
    log('transfer', tokenId, from, to, 0);
    db.prepare('DELETE FROM listings WHERE token_id=?').run(tokenId);
    return json(res, 200, { ok: true, owner: to });
  }

  if (p === '/api/nft/market') return json(res, 200, { listings: db.prepare("SELECT l.*, n.video_id, n.creator, n.owner FROM listings l JOIN nfts n ON n.token_id=l.token_id WHERE l.status='active'").all() });
  if (p === '/api/nft/audit') return json(res, 200, { transfers: db.prepare('SELECT * FROM transfers ORDER BY ts DESC LIMIT 100').all() });
  const mV = p.match(/^\/api\/nft\/by-video\/([\w-]+)$/);
  if (mV) return json(res, 200, { nfts: db.prepare('SELECT * FROM nfts WHERE video_id=?').all(mV[1]) });
  const m1 = p.match(/^\/api\/nft\/(\d+)$/);
  if (m1) {
    const n = db.prepare('SELECT * FROM nfts WHERE token_id=?').get(Number(m1[1]));
    if (!n) return json(res, 404, { error: 'nft nao existe' });
    return json(res, 200, n);
  }

  json(res, 404, { error: 'rota nao encontrada' });
});
server.listen(3016, () => console.log('NFT + Marketplace: http://localhost:3016'));
