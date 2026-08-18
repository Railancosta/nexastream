const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
let nano = null; try { nano = require('nanocurrency'); } catch (e) {}

const ROOT = path.resolve(__dirname, '../..');
const NET = process.env.NANO_NETWORK || 'testnet';
const GATE = path.join(ROOT, 'run', 'mainnet-gate-unlocked');
// GATE EM CODIGO (Item 40): mainnet so se arquivo de desbloqueio existir
const EFFECTIVE = (NET === 'mainnet' && fs.existsSync(GATE)) ? 'mainnet' : 'testnet';
const RPCS = (process.env.NANO_RPC || '').split(',').filter(Boolean);
const WALLET_F = path.join(ROOT, 'database', 'nano-settle.wallet.json');
const ANCHORS_F = path.join(ROOT, 'database', 'nano-anchors.json');

const load = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const save = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 2));

function wallet() {
  if (fs.existsSync(WALLET_F)) return load(WALLET_F, null);
  if (!nano) return null;
  const seed = nano.generateSeed();
  const sk = nano.deriveSecretKey(seed, { index: 0 });
  const pk = nano.derivePublicKey(sk);
  const w = { seed, sk, pk, address: nano.getAddress(pk), network: EFFECTIVE, created: Date.now() };
  fs.writeFileSync(WALLET_F, JSON.stringify(w, null, 2));
  try { fs.chmodSync(WALLET_F, 0o600); } catch (e) {}
  return w;
}
async function rpc(body) {
  for (const url of RPCS) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) { const j = await r.json(); if (!j.error) return j; }
    } catch (e) {}
  }
  return null;
}
function signSend(w, dest, previous, balanceOut) {
  const block = { type: 'state', account: w.address, previous, representative: w.address, balance: balanceOut, link: dest };
  try {
    const hash = nano.hashBlock ? nano.hashBlock(block) : null;
    let sig = null;
    if (nano.signBlock) { const r = nano.signBlock(block, w.sk); sig = (typeof r === 'string') ? r : (r && r.signature) || null; }
    return { hash, signature: sig };
  } catch (e) { return { error: String(e.message || e) }; }
}
async function anchor(contentHash) {
  const w = wallet();
  if (!w) return { error: 'nanocurrency indisponivel' };
  if (!/^[0-9a-f]{64}$/.test(contentHash)) return { error: 'contentHash invalido (64 hex)' };
  const dest = nano.getAddress(contentHash); // ancora: destino derivado do hash do conteudo
  const bal = await rpc({ action: 'account_balance', account: w.address });
  const list = load(ANCHORS_F, []);
  if (!bal) {
    const s = signSend(w, dest, '0'.repeat(64), '0');
    const rec = { contentHash, dest, network: EFFECTIVE, status: 'queued-network-offline', signed: s, ts: Date.now() };
    list.unshift(rec); save(ANCHORS_F, list);
    return { status: 'queued-network-offline', dest, note: 'RPC offline (configure NANO_RPC); bloco assinado localmente e enfileirado' };
  }
  const raw = BigInt(bal.balance || '0');
  if (raw < 1n) {
    return { status: 'needs-funding', address: w.address, note: 'depositar >= 1 raw (testnet: faucet oficial Nano, custo zero) para ancorar on-network' };
  }
  const info = await rpc({ action: 'account_info', account: w.address });
  const previous = info && info.frontier ? info.frontier : '0'.repeat(64);
  const balanceOut = (raw - 1n).toString();
  const work = await rpc({ action: 'work_generate', hash: previous === '0'.repeat(64) ? w.pk : previous });
  const s = signSend(w, dest, previous, balanceOut);
  const rec = { contentHash, dest, network: EFFECTIVE, status: work ? 'ready-to-broadcast' : 'queued-no-work', signed: s, work: work ? work.work : null, ts: Date.now() };
  list.unshift(rec); save(ANCHORS_F, list);
  return rec;
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
    const w = wallet();
    const bal = w ? await rpc({ action: 'account_balance', account: w.address }) : null;
    return json(res, 200, {
      network_requested: NET, network_effective: EFFECTIVE,
      mainnet_gate: EFFECTIVE === 'mainnet' ? 'ABERTO' : 'FECHADO (Item 40)',
      rpc_configured: RPCS.length > 0, rpc_online: !!bal,
      address: w ? w.address : null, balance_raw: bal ? bal.balance : null,
      anchors: load(ANCHORS_F, []).length, fees: '0 (Nano e feeless em qualquer rede)'
    });
  }
  if (p === '/api/nano/anchor' && req.method === 'POST') {
    const b = JSON.parse(await readBody(req) || '{}');
    return json(res, 200, await anchor(b.contentHash || ''));
  }
  if (p === '/api/nano/anchors') return json(res, 200, { anchors: load(ANCHORS_F, []) });
  json(res, 404, { error: 'rota nao encontrada' });
});
server.listen(3020, () => console.log('Nano Settlement (testnet, zero taxas): http://localhost:3020 | gate mainnet: ' + (EFFECTIVE === 'mainnet' ? 'ABERTO' : 'FECHADO')));
