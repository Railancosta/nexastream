const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const nano = require('nanocurrency');

const ROOT = path.resolve(__dirname, '../..');
const WALLET = path.join(ROOT, 'database', 'nano.wallet.json');
const ANCHORS = path.join(ROOT, 'database', 'nano_anchors.json');

let w;
if (fs.existsSync(WALLET)) w = JSON.parse(fs.readFileSync(WALLET, 'utf8'));
else {
  const seed = nano.generateSeed();
  const secretKey = nano.deriveSecretKey(seed, { index: 0 });
  const publicKey = nano.derivePublicKey(secretKey);
  w = { seed, secretKey, publicKey, address: nano.getAddress(publicKey) };
  fs.writeFileSync(WALLET, JSON.stringify(w, null, 2));
  try { fs.chmodSync(WALLET, 0o600); } catch (e) {}
  console.log('carteira Nano criada (seed em database/nano.wallet.json — NUNCA commite)');
}
const load = () => { try { return JSON.parse(fs.readFileSync(ANCHORS, 'utf8')); } catch (e) { return []; } };
const save = a => fs.writeFileSync(ANCHORS, JSON.stringify(a, null, 2));

const RPCS = (process.env.NANO_RPC || 'https://mynano.ninja/api/node,https://nanoverse.cc/api/node').split(',');
async function rpc(body) {
  for (const url of RPCS) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) { const j = await r.json(); if (!j.error) return j; }
    } catch (e) {}
  }
  return null;
}
async function info() {
  const r = await rpc({ action: 'account_info', account: w.address });
  return r && r.frontier ? r : null;
}

// Item 10: VIDEO -> HASH -> CONTENT ID -> ANCORADO NA MAINNET (taxa zero)
async function anchor(contentHash, title) {
  if (!/^[0-9a-f]{64}$/.test(contentHash)) throw new Error('contentHash deve ser 32 bytes hex');
  const acc = await info();
  const entry = { contentHash, title: title || '', ts: new Date().toISOString(), account: w.address };
  if (!acc) {
    // MODO SIGN-ONLY: bloco assinado offline, broadcast quando houver funding (honesto, Item 61)
    const signed = nano.signBlock({ balance: '0', link: contentHash, previous: '0'.repeat(64), representative: w.address, secretKey: w.secretKey });
    entry.status = 'signed-awaiting-funding';
    entry.blockHash = signed.hash;
    entry.signature = signed.signature;
  } else {
    const work = await rpc({ action: 'work_generate', hash: acc.frontier });
    if (!work || !work.work) throw new Error('work_generate indisponivel nos RPCs publicos');
    const rep = acc.representative_account || w.address;
    const signed = nano.signBlock({ balance: acc.balance, link: contentHash, previous: acc.frontier, representative: rep, secretKey: w.secretKey });
    const proc = await rpc({ action: 'process', json_block: 'true', block: { type: 'state', account: w.address, previous: acc.frontier, representative: rep, balance: acc.balance, link: contentHash, signature: signed.signature, work: work.work } });
    if (!proc || !proc.hash) throw new Error('broadcast falhou: ' + JSON.stringify(proc));
    entry.status = 'on-mainnet';
    entry.blockHash = proc.hash;
    entry.signature = signed.signature;
  }
  const a = load(); a.unshift(entry); save(a);
  return entry;
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

const server = http.createServer(async (req, res) => {
  const p = new URL(req.url, 'http://localhost').pathname;
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const body = req.method === 'POST' ? JSON.parse(await readBody(req) || '{}') : {};

  if (p === '/api/nano/status') {
    const acc = await info();
    return json(res, 200, {
      network: 'nano-mainnet', fees: '0 (feeless por design)',
      address: w.address,
      funded: !!acc, balanceRaw: acc ? acc.balance : '0',
      mode: acc ? 'broadcast' : 'sign-only (aguardando >= 1 raw de funding)',
      anchors: load().length,
      explorers: ['https://www.nanolooker.com/account/' + w.address, 'https://nanexplorer.com/nano/account/' + w.address]
    });
  }

  if (p === '/api/nano/anchor' && req.method === 'POST') {
    try { return json(res, 200, await anchor(body.contentHash, body.title)); }
    catch (e) { return json(res, 400, { error: e.message }); }
  }

  if (p === '/api/nano/anchors') return json(res, 200, { anchors: load() });

  json(res, 404, { error: 'rota nao encontrada' });
});
server.listen(3019, () => console.log('Nano Anchor Service: http://localhost:3019 (mainnet, taxa zero)'));
