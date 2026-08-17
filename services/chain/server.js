const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
const db = new DatabaseSync(path.join(ROOT, 'database', 'nexastream.db'));

db.exec(`CREATE TABLE IF NOT EXISTS blocks(idx INTEGER PRIMARY KEY, hash TEXT, prev TEXT, ts INTEGER, miner TEXT, nonce INTEGER, txs TEXT);
CREATE TABLE IF NOT EXISTS wallets(address TEXT PRIMARY KEY, pubkey TEXT, privkey TEXT);
CREATE TABLE IF NOT EXISTS balances(address TEXT PRIMARY KEY, amount REAL);
CREATE TABLE IF NOT EXISTS mempool(id TEXT PRIMARY KEY, payload TEXT, sig TEXT);
CREATE TABLE IF NOT EXISTS usedtx(id TEXT PRIMARY KEY);`);

const MAX_SUPPLY = 55000000, DIFF = 2, REWARD = 10;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const sign = (pem, d) => crypto.createSign('SHA256').update(d).sign(pem, 'base64');
const verify = (pub, d, sig) => { try { return crypto.createVerify('SHA256').update(d).verify(pub, sig, 'base64'); } catch { return false; } };

function newWallet() {
  const kp = crypto.generateKeyPairSync('ec', { namedCurve: 'secp256k1' });
  const pub = kp.publicKey.export({ type: 'spki', format: 'pem' });
  const priv = kp.privateKey.export({ type: 'pkcs8', format: 'pem' });
  const address = sha(pub).slice(0, 40);
  db.prepare('INSERT OR IGNORE INTO wallets VALUES (?,?,?)').run(address, pub, priv);
  db.prepare('INSERT OR IGNORE INTO balances VALUES (?,0)').run(address);
  return { address, publicKey: pub, privateKey: priv };
}

function makeTx(from, to, amount, priv, nonce) {
  const payload = JSON.stringify({ from, to, amount, nonce, ts: Date.now() });
  return { id: sha(payload), payload, sig: sign(priv, payload) };
}

let TREASURY_ADDR;
const g0 = db.prepare('SELECT txs FROM blocks WHERE idx=0').get();
if (!g0) {
  const t = newWallet();
  TREASURY_ADDR = t.address;
  db.prepare('UPDATE balances SET amount=? WHERE address=?').run(MAX_SUPPLY, t.address);
  const txs = JSON.stringify([{ type: 'genesis', to: t.address, amount: MAX_SUPPLY }]);
  const base = { idx: 0, prev: '0'.repeat(64), ts: Date.now(), miner: 'genesis', txs };
  db.prepare('INSERT INTO blocks VALUES (?,?,?,?,?,?,?)').run(0, sha(JSON.stringify(base)), base.prev, base.ts, base.miner, 0, txs);
  console.log('GENESIS OK (55M NST)');
} else {
  TREASURY_ADDR = JSON.parse(g0.txs)[0].to;
}

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
function submitTx(body) {
  const { from, to, amount, privateKey } = body;
  const w = db.prepare('SELECT * FROM wallets WHERE address=?').get(from);
  if (!w) return { error: 'carteira nao existe' };
  const t = makeTx(from, to, amount, privateKey, db.prepare('SELECT COUNT(*) c FROM usedtx').get().c + 1);
  if (!verify(w.pubkey, t.payload, t.sig)) return { error: 'chave invalida' };
  if (db.prepare('SELECT id FROM usedtx WHERE id=?').get(t.id) || db.prepare('SELECT id FROM mempool WHERE id=?').get(t.id)) return { error: 'replay detectado' };
  db.prepare('INSERT INTO mempool VALUES (?,?,?)').run(t.id, t.payload, t.sig);
  return { txId: t.id, status: 'mempool' };
}

function mine(miner) {
  db.prepare('INSERT OR IGNORE INTO balances VALUES (?,0)').run(miner);
  const last = db.prepare('SELECT * FROM blocks ORDER BY idx DESC LIMIT 1').get();
  const rows = db.prepare('SELECT * FROM mempool').all();
  const txs = [];
  for (const r of rows) {
    db.prepare('DELETE FROM mempool WHERE id=?').run(r.id);
    const p = JSON.parse(r.payload);
    const w = db.prepare('SELECT pubkey FROM wallets WHERE address=?').get(p.from);
    const bal = db.prepare('SELECT amount FROM balances WHERE address=?').get(p.from);
    if (!w || !verify(w.pubkey, r.payload, r.sig)) continue;
    if (!bal || bal.amount < p.amount) continue;
    db.prepare('UPDATE balances SET amount=amount-? WHERE address=?').run(p.amount, p.from);
    db.prepare('INSERT OR IGNORE INTO balances VALUES (?,0)').run(p.to);
    db.prepare('UPDATE balances SET amount=amount+? WHERE address=?').run(p.amount, p.to);
    db.prepare('INSERT OR IGNORE INTO usedtx VALUES (?)').run(r.id);
    txs.push({ ...p, sig: r.sig });
  }
  const tr = db.prepare('SELECT * FROM wallets WHERE address=?').get(TREASURY_ADDR);
  const rw = makeTx(TREASURY_ADDR, miner, REWARD, tr.privkey, 1000000 + last.idx);
  db.prepare('UPDATE balances SET amount=amount-? WHERE address=?').run(REWARD, TREASURY_ADDR);
  db.prepare('UPDATE balances SET amount=amount+? WHERE address=?').run(REWARD, miner);
  db.prepare('INSERT OR IGNORE INTO usedtx VALUES (?)').run(rw.id);
  txs.push({ ...JSON.parse(rw.payload), sig: rw.sig, type: 'reward' });

  const txsStr = JSON.stringify(txs);
  let nonce = 0, hash;
  const base = { idx: last.idx + 1, prev: last.hash, ts: Date.now(), miner, txs: txsStr };
  do { nonce++; hash = sha(JSON.stringify(base) + ':' + nonce); } while (!hash.startsWith('0'.repeat(DIFF)));
  db.prepare('INSERT INTO blocks VALUES (?,?,?,?,?,?,?)').run(base.idx, hash, base.prev, base.ts, miner, nonce, txsStr);
  return { block: base.idx, hash, txs: txs.length, nonce };
}

function verifyChain() {
  const blocks = db.prepare('SELECT * FROM blocks ORDER BY idx').all();
  let prev = '0'.repeat(64), checked = 0;
  for (const b of blocks) {
    if (b.prev !== prev) return { valid: false, reason: 'link quebrado no bloco ' + b.idx };
    const obj = { idx: b.idx, prev: b.prev, ts: b.ts, miner: b.miner, txs: b.txs };
    const h = b.idx === 0 ? sha(JSON.stringify(obj)) : sha(JSON.stringify(obj) + ':' + b.nonce);
    if (h !== b.hash) return { valid: false, reason: 'hash invalido no bloco ' + b.idx };
    if (b.idx > 0 && !h.startsWith('0'.repeat(DIFF))) return { valid: false, reason: 'PoW invalido no bloco ' + b.idx };
    for (const tx of JSON.parse(b.txs)) {
      if (tx.type === 'genesis') continue;
      const w = db.prepare('SELECT pubkey FROM wallets WHERE address=?').get(tx.from);
      const canon = JSON.stringify({ from: tx.from, to: tx.to, amount: tx.amount, nonce: tx.nonce, ts: tx.ts });
      if (!w || !verify(w.pubkey, canon, tx.sig)) return { valid: false, reason: 'assinatura invalida no bloco ' + b.idx };
      checked++;
    }
    prev = b.hash;
  }
  return { valid: true, height: blocks.length - 1, assinaturasVerificadas: checked };
}

const server = http.createServer(async (req, res) => {
  const p = new URL(req.url, 'http://localhost').pathname;
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const body = req.method === 'POST' ? JSON.parse(await readBody(req) || '{}') : {};

  if (p === '/api/chain/wallet' && req.method === 'POST') return json(res, 200, newWallet());
  if (p === '/api/chain/faucet' && req.method === 'POST') {
    const tr = db.prepare('SELECT * FROM wallets WHERE address=?').get(TREASURY_ADDR);
    return json(res, 200, submitTx({ from: TREASURY_ADDR, to: body.to, amount: body.amount || 100, privateKey: tr.privkey }));
  }
  if (p === '/api/chain/tx' && req.method === 'POST') return json(res, 200, submitTx(body));
  if (p === '/api/chain/mine' && req.method === 'POST') return json(res, 200, mine(body.miner || 'validator-1'));
  if (p === '/api/chain/verify') return json(res, 200, verifyChain());
  if (p === '/api/chain') return json(res, 200, { height: db.prepare('SELECT MAX(idx) h FROM blocks').get().h, blocks: db.prepare('SELECT idx,hash,miner,ts FROM blocks ORDER BY idx DESC LIMIT 10').all() });
  if (p === '/api/chain/balances') return json(res, 200, db.prepare('SELECT * FROM balances WHERE amount>0 ORDER BY amount DESC LIMIT 20').all());
  json(res, 404, { error: 'rota nao encontrada' });
});

server.listen(3008, () => console.log('NST Chain Testnet: http://localhost:3008'));
