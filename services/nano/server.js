const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const nano = require('nanocurrency');

const ROOT = path.resolve(__dirname, '../..');
const REG = path.join(ROOT, 'database', 'nano-registry.json');
const TREASURY_F = path.join(ROOT, 'database', 'nano-treasury.json');
const TIPS_F = path.join(ROOT, 'database', 'nano-tips.json');
const RPCS = (process.env.NANO_RPC || 'https://mynano.ninja/api/node').split(',');

const loadJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const saveJSON = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 2));

// Tesouraria da plataforma (endereco publico; chave fora do repo; producao = hardware/multisig)
// generateSeed() e async na nanocurrency v2 — inicializacao via promise
let treasury = loadJSON(TREASURY_F, null);
const treasuryReady = (async () => {
  if (treasury && treasury.address && typeof treasury.seed === 'string' && treasury.seed.length === 64) return;
  const seed = await nano.generateSeed();
  const sk = await nano.deriveSecretKey(seed, 0);
  treasury = { seed, address: nano.deriveAddress(sk).replace(/^xrb_/, 'nano_'), created: Date.now() };
  saveJSON(TREASURY_F, treasury);
  try { fs.chmodSync(TREASURY_F, 0o600); } catch (e) {}
})();

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
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;
  if (req.method === 'OPTIONS') return json(res, 204, {});

  await treasuryReady;
  if (p === '/api/nano/health') return json(res, 200, { ok: true, treasury: treasury.address, custodial: false });

  if (p === '/api/nano/treasury') {
    const bal = await rpc({ action: 'account_balance', account: treasury.address });
    return json(res, 200, { address: treasury.address, balance_raw: bal ? bal.balance : null, rpc_online: !!bal });
  }

  if (p === '/api/nano/validate') {
    const a = u.searchParams.get('address') || '';
    let ok = false; try { ok = nano.validateAddress(a); } catch (e) {}
    return json(res, 200, { valid: ok });
  }

  // NAO-CUSTODIAL: criador registra o PROPRIO endereco
  if (p === '/api/nano/register' && req.method === 'POST') {
    const b = JSON.parse(await readBody(req) || '{}');
    if (!b.username || !b.address) return json(res, 400, { error: 'username e address obrigatorios' });
    let valid = false; try { valid = nano.validateAddress(b.address); } catch (e) {}
    if (!valid) return json(res, 400, { error: 'endereco Nano invalido (checksum)' });
    const reg = loadJSON(REG, {});
    reg[b.username] = { address: b.address, updated: Date.now() };
    saveJSON(REG, reg);
    return json(res, 200, { ok: true, custodial: false });
  }

  const mC = p.match(/^\/api\/nano\/creator\/([\w-]+)$/);
  if (mC) {
    const reg = loadJSON(REG, {});
    const e = reg[mC[1]];
    return json(res, 200, e ? { username: mC[1], address: e.address } : { username: mC[1], address: null });
  }

  const mB = p.match(/^\/api\/nano\/balance\/(.+)$/);
  if (mB) {
    const bal = await rpc({ action: 'account_balance', account: decodeURIComponent(mB[1]) });
    return json(res, 200, bal ? { balance_raw: bal.balance } : { balance_raw: null, rpc_online: false });
  }

  if (p === '/api/nano/tip-log' && req.method === 'POST') {
    const b = JSON.parse(await readBody(req) || '{}');
    const tips = loadJSON(TIPS_F, []);
    tips.unshift({ id: crypto.randomUUID(), username: b.username || '', amount_raw: b.amount_raw || '0', ts: Date.now() });
    saveJSON(TIPS_F, tips.slice(0, 200));
    return json(res, 200, { ok: true });
  }

  if (p === '/api/nano/tips') return json(res, 200, { tips: loadJSON(TIPS_F, []) });

  json(res, 404, { error: 'rota nao encontrada' });
});
server.listen(3021, () => console.log('Nano Settlement (feeless, nao-custodial): http://localhost:3021'));
