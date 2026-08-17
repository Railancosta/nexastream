const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
const db = new DatabaseSync(path.join(ROOT, 'database', 'dao.db'));
let chain = null;
try { chain = new DatabaseSync(path.join(ROOT, 'database', 'nexastream.db'), { readOnly: true }); } catch (e) {}

db.exec(`CREATE TABLE IF NOT EXISTS proposals(id TEXT PRIMARY KEY, title TEXT, description TEXT, proposer TEXT, type TEXT DEFAULT 'general', amount REAL DEFAULT 0, to_addr TEXT, status TEXT DEFAULT 'active', yes REAL DEFAULT 0, no REAL DEFAULT 0, created_at INTEGER, ends_at INTEGER, timelock_h REAL DEFAULT 24, execute_after INTEGER, result TEXT);
CREATE TABLE IF NOT EXISTS votes(id TEXT PRIMARY KEY, proposal_id TEXT, voter TEXT, weight REAL, choice TEXT, created_at INTEGER, UNIQUE(proposal_id, voter));
CREATE TABLE IF NOT EXISTS treasury(id INTEGER PRIMARY KEY CHECK (id=1), balance REAL);
INSERT OR IGNORE INTO treasury VALUES (1, 1000000);
CREATE TABLE IF NOT EXISTS dao_audit(id TEXT PRIMARY KEY, action TEXT, actor TEXT, target TEXT, note TEXT, created_at INTEGER);`);

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
function nst(addr) {
  if (!chain) return 1;
  try { const r = chain.prepare('SELECT amount FROM balances WHERE address=?').get(addr); return r ? r.amount : 0; } catch (e) { return 0; }
}
function log(a, who, t, note) { db.prepare('INSERT INTO dao_audit VALUES (?,?,?,?,?,?)').run(crypto.randomUUID(), a, who, t, note || '', Date.now()); }

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const body = req.method === 'POST' ? JSON.parse(await readBody(req) || '{}') : {};
  const now = Date.now();

  if (p === '/api/dao/proposal' && req.method === 'POST') {
    if (!body.title || !body.proposer) return json(res, 400, { error: 'title e proposer obrigatorios' });
    const id = crypto.randomUUID();
    const durH = body.durationH ?? 24;
    db.prepare('INSERT INTO proposals (id,title,description,proposer,type,amount,to_addr,created_at,ends_at,timelock_h) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run(id, body.title, body.description || '', body.proposer, body.type || 'general', body.amount || 0, body.to_addr || '', now, now + durH * 3600000, body.timelockH ?? 24);
    log('propose', body.proposer, id, body.title);
    return json(res, 200, { id, status: 'active' });
  }

  if (p === '/api/dao/vote' && req.method === 'POST') {
    const pr = db.prepare('SELECT * FROM proposals WHERE id=?').get(body.proposalId);
    if (!pr || pr.status !== 'active') return json(res, 404, { error: 'proposta inexistente ou encerrada' });
    if (now >= pr.ends_at) return json(res, 400, { error: 'votacao encerrada' });
    if (db.prepare('SELECT id FROM votes WHERE proposal_id=? AND voter=?').get(body.proposalId, body.voter)) return json(res, 409, { error: 'voto duplicado' });
    const w = nst(body.voter);
    if (!(w > 0)) return json(res, 403, { error: 'sem NST para votar (peso 0)' });
    if (body.choice !== 'yes' && body.choice !== 'no') return json(res, 400, { error: 'choice deve ser yes/no' });
    db.prepare('INSERT INTO votes VALUES (?,?,?,?,?,?)').run(crypto.randomUUID(), body.proposalId, body.voter, w, body.choice, now);
    db.prepare(`UPDATE proposals SET ${body.choice === 'yes' ? 'yes' : 'no'} = ${body.choice === 'yes' ? 'yes' : 'no'} + ? WHERE id=?`).run(w, body.proposalId);
    log('vote', body.voter, body.proposalId, body.choice + ' peso=' + w);
    return json(res, 200, { ok: true, weight: w });
  }

  if (p === '/api/dao/tally' && req.method === 'POST') {
    const pr = db.prepare('SELECT * FROM proposals WHERE id=?').get(body.proposalId);
    if (!pr || pr.status !== 'active') return json(res, 404, { error: 'proposta inexistente ou ja apurada' });
    if (now < pr.ends_at) return json(res, 400, { error: 'votacao ainda aberta' });
    const passed = pr.yes > pr.no;
    db.prepare('UPDATE proposals SET status=?, result=?, execute_after=? WHERE id=?')
      .run(passed ? 'passed' : 'rejected', 'yes=' + pr.yes + ' no=' + pr.no, now + pr.timelock_h * 3600000, pr.id);
    log('tally', 'system', pr.id, passed ? 'passed' : 'rejected');
    return json(res, 200, { status: passed ? 'passed' : 'rejected', yes: pr.yes, no: pr.no });
  }

  if (p === '/api/dao/execute' && req.method === 'POST') {
    const pr = db.prepare('SELECT * FROM proposals WHERE id=?').get(body.proposalId);
    if (!pr || pr.status !== 'passed') return json(res, 400, { error: 'proposta nao aprovada' });
    if (now < pr.execute_after) return json(res, 425, { error: 'timelock ativo (Item 18): aguarde execute_after' });
    if (pr.type === 'spend') {
      const t = db.prepare('SELECT balance FROM treasury WHERE id=1').get();
      if (pr.amount > t.balance) return json(res, 400, { error: 'tesouraria insuficiente' });
      db.prepare('UPDATE treasury SET balance=balance-? WHERE id=1').run(pr.amount);
      log('spend', 'dao', pr.id, pr.amount + ' -> ' + pr.to_addr);
    }
    db.prepare("UPDATE proposals SET status='executed' WHERE id=?").run(pr.id);
    log('execute', 'dao', pr.id, '');
    return json(res, 200, { status: 'executed' });
  }

  if (p === '/api/dao/proposals') return json(res, 200, { proposals: db.prepare('SELECT * FROM proposals ORDER BY created_at DESC LIMIT 50').all() });
  if (p === '/api/dao/treasury') return json(res, 200, db.prepare('SELECT balance FROM treasury WHERE id=1').get());
  if (p === '/api/dao/audit') return json(res, 200, { audit: db.prepare('SELECT * FROM dao_audit ORDER BY created_at DESC LIMIT 50').all() });
  if (p === '/api/dao/weight') return json(res, 200, { weight: nst(u.searchParams.get('addr')) });

  json(res, 404, { error: 'rota nao encontrada' });
});
server.listen(3015, () => console.log('DAO Governance: http://localhost:3015'));
