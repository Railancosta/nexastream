const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
let nano;
try { nano = require('nanocurrency'); } catch (e) { console.error('FATAL: npm i nanocurrency'); process.exit(1); }

const ROOT = path.resolve(__dirname, '../..');
const WALLET_F = path.join(ROOT, 'database', 'nano-settle.wallet.json');
const ANCHORS_F = path.join(ROOT, 'database', 'nano-anchors.json');
const NETWORK = process.env.NANO_NETWORK || 'testnet';
const RPCS = (process.env.NANO_RPC || '').split(',').filter(Boolean);

function loadWallet() {
  if (fs.existsSync(WALLET_F)) return JSON.parse(fs.readFileSync(WALLET_F, 'utf8'));
  const seed = nano.generateSeed();
  const sk = nano.deriveSecretKey(seed, { index: 0 });
  const pk = nano.derivePublicKey(sk);
  const w = { seed, sk, pk, address: nano.getAddress(pk), network: NETWORK };
  fs.mkdirSync(path.dirname(WALLET_F), { recursive: true });
  fs.writeFileSync(WALLET_F, JSON.stringify(w, null, 2));
  try { fs.chmodSync(WALLET_F, 0o600); } catch (e) {}
  return w;
}
const loadAnchors = () => { try { return JSON.parse(fs.readFileSync(ANCHORS_F, 'utf8')); } catch (e) { return []; } };
const saveAnchors = a => fs.writeFileSync(ANCHORS_F, JSON.stringify(a, null, 2));
const pushAnchor = rec => { const a = loadAnchors(); a.unshift(rec); saveAnchors(a); return rec; };

async function rpc(body) {
  for (const url of RPCS) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) { const j = await r.json(); if (!j.error) return j; }
    } catch (e) {}
  }
  return null;
}

async function anchor(contentHash) {
  if (!/^[0-9a-f]{64}$/.test(contentHash)) return { error: 'contentHash deve ser 64 hex' };
  const w = loadWallet();
  const dest = nano.getAddress(contentHash); // endereco derivado do hash (burn-like)
  const rec = { contentHash, dest, network: NETWORK, ts: Date.now() };
  const info = await rpc({ action: 'account_info', account: w.address });
  if (!info) { // offline-first: assina local e enfileira (honesto)
    const block = { type: 'state', account: w.address, previous: '0'.repeat(64), representative: w.address, balance: '0', link: dest };
    const signed = nano.signBlock(block, w.sk);
    rec.status = 'queued-network-offline'; rec.blockHash = signed.hash; rec.signature = signed.signature;
    return pushAnchor(rec);
  }
  const bal = BigInt(info.balance || '0');
  if (bal < 1n) { rec.status = 'needs-funding'; return pushAnchor(rec); }
  const previous = info.frontier || '0'.repeat(64);
  const block = { type: 'state', account: w.address, previous, representative: w.address, balance: (bal - 1n).toString(), link: dest };
  const signed = nano.signBlock(block, w.sk);
  const work = await rpc({ action: 'work_generate', hash: previous === '0'.repeat(64) ? w.pk : previous });
  if (!work || !work.work) { rec.status = 'needs-work'; rec.blockHash = signed.hash; return pushAnchor(rec); }
  const proc = await rpc({ action: 'process', subtype: 'send', block: JSON.stringify({ ...block, signature: signed.signature, work: work.work }) });
  if (proc && proc.hash) { rec.status = 'on-network'; rec.blockHash = proc.hash; }
  else { rec.status = 'broadcast-failed'; rec.blockHash = signed.hash; rec.error = proc ? proc.error : 'rpc'; }
  return pushAnchor(rec);
}

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
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
  const p = new URL(req.url, 'http://localhost').pathname;
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (p === '/api/nano/status') {
    const w = loadWallet();
    const info = await rpc({ action: 'account_info', account: w.address });
    return json(res, 200, { network: NETWORK, rpc_configured: RPCS.length > 0, rpc_online: !!info, address: w.address, balance_raw: info ? info.balance : null, anchors: loadAnchors().length });
  }
  if (p === '/api/nano/anchor' && req.method === 'POST') {
    const b = JSON.parse(await readBody(req) || '{}');
    return json(res, 200, await anchor(b.contentHash || ''));
  }
  if (p === '/api/nano/anchors') return json(res, 200, { anchors: loadAnchors() });
  json(res, 404, { error: 'rota nao encontrada' });
});
server.listen(3020, () => console.log('Nano Settlement (' + NETWORK + ') :3020 | RPCs: ' + (RPCS.length || 'nenhum (offline-first)')));
