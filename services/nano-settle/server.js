const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
let nano;
try { nano = require('nanocurrency'); } catch (e) { console.error('npm i nanocurrency'); process.exit(1); }

const ROOT = path.resolve(__dirname, '../..');
const WALLET = path.join(ROOT, 'database', 'nano-settle.wallet.json');
const ANCHORS = path.join(ROOT, 'database', 'nano-anchors.json');
const RPCS = (process.env.NANO_RPC || 'https://mynano.ninja/api/node')
  .split(',').map(s => s.trim()).filter(u => /^https?:\/\/[^\s]+$/.test(u) && !u.includes('SEU_'));

function loadWallet() {
  try {
    const w = JSON.parse(fs.readFileSync(WALLET, 'utf8'));
    nano.deriveSecretKey(w.seed, { index: 0 }); // valida; lança se inválida
    return w;
  } catch (e) {
    try { if (fs.existsSync(WALLET)) fs.renameSync(WALLET, WALLET + '.invalid'); } catch (_) {}
    const seed = nano.generateSeed();
    const sk = nano.deriveSecretKey(seed, { index: 0 });
    const pk = nano.derivePublicKey(sk);
    const w = { seed, publicKey: pk, address: nano.getAddress(pk), created: new Date().toISOString() };
    fs.mkdirSync(path.dirname(WALLET), { recursive: true });
    fs.writeFileSync(WALLET, JSON.stringify(w, null, 2));
    try { fs.chmodSync(WALLET, 0o600); } catch (_) {}
    console.log('carteira regenerada (anterior invalida -> .invalid)');
    return w;
  }
}
const wallet = loadWallet();
const loadAnchors = () => { try { return JSON.parse(fs.readFileSync(ANCHORS, 'utf8')); } catch (e) { return []; } };
const saveAnchors = a => fs.writeFileSync(ANCHORS, JSON.stringify(a, null, 2));

async function rpc(body) {
  for (const url of RPCS) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) { const j = await r.json(); if (!j.error) return j; }
    } catch (e) {}
  }
  return null;
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
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;
  if (req.method === 'OPTIONS') return json(res, 204, {});

  if (p === '/api/nano/status') {
    const online = (await rpc({ action: 'version' })) != null;
    return json(res, 200, {
      address: wallet.address,
      rpcs: RPCS.length, rpc_online: online,
      anchors: loadAnchors().length,
      nst: { ticker: 'NST', maxSupply: 55000000, status: 'TESTNET (mainnet gateada - Item 40)' },
      note: 'Nano nao tem tokens/smart contracts: NST nao e um token Nano. Nano = trilho de liquidacao feeless.'
    });
  }

  if (p === '/api/nano/anchor' && req.method === 'POST') {
    const b = JSON.parse(await readBody(req) || '{}');
    if (!/^[0-9a-f]{64}$/.test(b.contentHash || '')) return json(res, 400, { error: 'contentHash invalido' });
    const a = loadAnchors();
    const rec = { id: a.length + 1, contentHash: b.contentHash, ts: new Date().toISOString() };
    a.push(rec); saveAnchors(a);
    return json(res, 200, rec);
  }

  if (p === '/api/nano/anchors') return json(res, 200, { anchors: loadAnchors() });

  if (p === '/api/nano/balance') {
    const addr = u.searchParams.get('address') || wallet.address;
    const j = await rpc({ action: 'account_balance', account: addr });
    return json(res, 200, j ? { address: addr, balance_raw: j.balance } : { address: addr, error: 'rpc offline' });
  }

  if (p === '/api/nano/export') {
    return json(res, 200, { generatedAt: new Date().toISOString(), address: wallet.address, anchors: loadAnchors() });
  }

  json(res, 404, { error: 'rota nao encontrada' });
});
server.listen(3020, () => console.log('Nano Settlement :3020 | RPCs validos: ' + RPCS.length));
