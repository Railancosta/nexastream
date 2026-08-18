const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
const db = new DatabaseSync(path.join(ROOT, 'database', 'bounty.db'));
let chainDb = null;
try { chainDb = new DatabaseSync(path.join(ROOT, 'database', 'nexastream.db'), { readOnly: true }); } catch (e) {}

db.exec(`CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY, reporter TEXT, reporter_nst TEXT, title TEXT, description TEXT, poc_url TEXT, severity TEXT DEFAULT 'unrated', reward_nst REAL DEFAULT 0, status TEXT DEFAULT 'open', timelock_until INTEGER DEFAULT 0, created_at INTEGER);
CREATE TABLE IF NOT EXISTS approvals(id TEXT PRIMARY KEY, report_id TEXT, approver TEXT, ts INTEGER, UNIQUE(report_id, approver));
CREATE TABLE IF NOT EXISTS treasury(id INTEGER PRIMARY KEY CHECK (id=1), balance REAL);
INSERT OR IGNORE INTO treasury VALUES (1, 100000);
CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY, action TEXT, actor TEXT, target TEXT, note TEXT, ts INTEGER);`);

const REWARDS = { critical: 5000, high: 2000, medium: 500, low: 100 };
const TIMELOCK_H = Number(process.env.BOUNTY_TIMELOCK_H ?? 48);
const REQUIRED_APPROVALS = 2;
const rate = new Map();
function limited(k, max, win) { const n = Date.now(); const a = (rate.get(k) || []).filter(t => n - t < win); a.push(n); rate.set(k, a); return a.length > max; }
function log(a, who, t, note) { db.prepare('INSERT INTO audit VALUES (?,?,?,?,?,?)').run(crypto.randomUUID(), a, who, t, note || '', Date.now()); }
function approvalsOf(id) { return db.prepare('SELECT COUNT(*) c FROM approvals WHERE report_id=?').get(id).c; }
function json(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }); res.end(JSON.stringify(obj)); }
function readBody(req) { return new Promise((res, rej) => { const c = []; let n = 0; req.on('data', d => { n += d.length; if (n > 1e6) req.destroy(); else c.push(d); }); req.on('end', () => res(Buffer.concat(c).toString())); req.on('error', rej); }); }

async function payout(r) {
  const t = db.prepare('SELECT balance FROM treasury WHERE id=1').get();
  if (t.balance < r.reward_nst) return { error: 'tesouraria insuficiente' };
  db.prepare('UPDATE treasury SET balance=balance-? WHERE id=1').run(r.reward_nst);
  let chain_tx = null;
  try {
    const g = chainDb.prepare('SELECT txs FROM blocks WHERE idx=0').get();
    const treasuryAddr = JSON.parse(g.txs)[0].to;
    const w = chainDb.prepare('SELECT privkey FROM wallets WHERE address=?').get(treasuryAddr);
    if (w) {
      const resp = await fetch('http://localhost:3008/api/chain/tx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: treasuryAddr, to: r.reporter_nst, amount: r.reward_nst, privateKey: w.privkey }) });
      const j = await resp.json();
      if (j.txId) { await fetch('http://localhost:3008/api/chain/mine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ miner: 'bounty-treasury' }) }); chain_tx = j.txId; }
    }
  } catch (e) {}
  db.prepare("UPDATE reports SET status='paid' WHERE id=?").run(r.id);
  log('payout', 'bounty-bot', r.id, (chain_tx || 'ledger_only') + ' ' + r.reward_nst + ' NST testnet');
  return { ok: true, chain_tx };
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const body = req.method === 'POST' ? JSON.parse(await readBody(req) || '{}') : {};

  if (p === '/api/bounty/report' && req.method === 'POST') {
    if (!body.reporter || !body.title || !body.reporter_nst) return json(res, 400, { error: 'reporter, title e reporter_nst obrigatorios' });
    if (limited('b:' + body.reporter, 5, 3600000)) return json(res, 429, { error: 'rate limit' });
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO reports VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id, body.reporter, body.reporter_nst, body.title, body.description || '', body.poc_url || '', 'unrated', 0, 'open', 0, Date.now());
    log('report', body.reporter, id, body.title);
    return json(res, 200, { id, status: 'open' });
  }

  if (p === '/api/bounty/triage' && req.method === 'POST') {
    const r = db.prepare('SELECT * FROM reports WHERE id=?').get(body.report_id);
    if (!r) return json(res, 404, { error: 'report nao encontrado' });
    if (!REWARDS[body.severity]) return json(res, 400, { error: 'severity invalida' });
    db.prepare("UPDATE reports SET severity=?, reward_nst=?, status='approved', timelock_until=? WHERE id=?").run(body.severity, REWARDS[body.severity], Date.now() + TIMELOCK_H * 3600000, body.report_id);
    db.prepare('INSERT OR IGNORE INTO approvals VALUES (?,?,?,?)').run(crypto.randomUUID(), body.report_id, body.approver || 'triage', Date.now());
    log('triage', body.approver || 'triage', body.report_id, body.severity + ' -> ' + REWARDS[body.severity] + ' NST');
    return json(res, 200, { ok: true, reward_nst: REWARDS[body.severity], timelock_h: TIMELOCK_H });
  }

  if (p === '/api/bounty/approve' && req.method === 'POST') {
    db.prepare('INSERT OR IGNORE INTO approvals VALUES (?,?,?,?)').run(crypto.randomUUID(), body.report_id, body.approver, Date.now());
    return json(res, 200, { approvals: approvalsOf(body.report_id), required: REQUIRED_APPROVALS });
  }

  if (p === '/api/bounty/release' && req.method === 'POST') {
    const r = db.prepare('SELECT * FROM reports WHERE id=?').get(body.report_id);
    if (!r) return json(res, 404, { error: 'report nao encontrado' });
    if (r.status !== 'approved') return json(res, 403, { error: 'status nao aprovado' });
    if (approvalsOf(r.id) < REQUIRED_APPROVALS) return json(res, 403, { error: 'aprovacoes insuficientes (2-de-3)' });
    if (Date.now() < r.timelock_until) return json(res, 425, { error: 'timelock ativo (48h)' });
    return json(res, 200, await payout(r));
  }

  if (p === '/api/bounty/reports') return json(res, 200, { reports: db.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT 50').all() });
  if (p === '/api/bounty/stats') return json(res, 200, { treasury: db.prepare('SELECT balance FROM treasury WHERE id=1').get().balance, paid: db.prepare("SELECT COUNT(*) c FROM reports WHERE status='paid'").get().c, open: db.prepare("SELECT COUNT(*) c FROM reports WHERE status IN ('open','approved')").get().c });
  json(res, 404, { error: 'rota nao encontrada' });
});
server.listen(3022, () => console.log('Bug Bounty (testnet NST, 2-de-3 + timelock): http://localhost:3022'));
