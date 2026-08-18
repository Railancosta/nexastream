const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
const FLAG = path.join(ROOT, 'run', 'mainnet.flag');
const db = new DatabaseSync(path.join(ROOT, 'database', 'mainnet.db'));
db.exec(`CREATE TABLE IF NOT EXISTS gates(id TEXT PRIMARY KEY, name TEXT, required INTEGER DEFAULT 1, passed INTEGER DEFAULT 0, evidence TEXT, ts INTEGER);
CREATE TABLE IF NOT EXISTS attestations(id TEXT PRIMARY KEY, gate TEXT, attester TEXT, role TEXT, ts INTEGER, UNIQUE(gate, attester));
CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY, type TEXT, detail TEXT, ts INTEGER);`);

const GATES = [
  ['stable_testnet', 'Testnet estavel (janela temporal medida)'],
  ['independent_audit', 'Auditoria independente (quorum 2-de-3)'],
  ['consensus_testing', 'Consensus testing PASS'],
  ['security_testing', 'Security + fuzz testing PASS'],
  ['disaster_recovery', 'DR restore test PASS'],
  ['documentation', 'Documentacao completa'],
  ['monitoring', 'Observabilidade ativa'],
  ['emergency_procedures', 'Procedimentos de emergencia testados'],
  ['final_genesis', 'Genesis final configurado'],
  ['validator_infrastructure', 'Infraestrutura de validadores registrada'],
];
for (const [id, name] of GATES) db.prepare('INSERT OR IGNORE INTO gates (id,name) VALUES (?,?)').run(id, name);

const GENESIS = { token: 'NST', maxSupply: 55000000, chain: 'nexastream-mainnet-1',
  allocations: [ {name:'creator_rewards',pct:40},{name:'infrastructure_validators',pct:25},{name:'treasury_dao',pct:20},{name:'ecosystem_grants',pct:10},{name:'team_locked',pct:5} ] };
GENESIS.hash = crypto.createHash('sha256').update(JSON.stringify(GENESIS)).digest('hex');

const TIMELOCK_H = 48, AUDIT_QUORUM = 2;
const mode = () => fs.existsSync(FLAG) ? 'mainnet' : 'testnet';
function log(type, detail) { db.prepare('INSERT INTO events VALUES (?,?,?,?)').run(crypto.randomUUID(), type, detail, Date.now()); }
function json(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }); res.end(JSON.stringify(obj)); }
function readBody(req) { return new Promise((res, rej) => { const c = []; let n = 0; req.on('data', d => { n += d.length; if (n > 1e6) req.destroy(); else c.push(d); }); req.on('end', () => res(Buffer.concat(c).toString())); req.on('error', rej); }); }

function status() {
  const gates = db.prepare('SELECT * FROM gates').all();
  const missing = gates.filter(g => g.required && !g.passed).map(g => g.id);
  const lastGate = db.prepare('SELECT MAX(ts) m FROM gates WHERE passed=1').get().m || 0;
  const timelock_remaining_h = Math.max(0, Math.round((TIMELOCK_H * 3600000 - (Date.now() - lastGate)) / 3600000));
  return { mode, genesis: GENESIS, gates, missing, ready: missing.length === 0 && timelock_remaining_h === 0, timelock_remaining_h };
}

const server = http.createServer(async (req, res) => {
  const p = new URL(req.url, 'http://localhost').pathname;
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (p === '/api/mainnet/status') return json(res, 200, status());
  if (p === '/api/mainnet/genesis') return json(res, 200, GENESIS);

  if (p === '/api/mainnet/evidence' && req.method === 'POST') {
    const b = JSON.parse(await readBody(req) || '{}');
    if (!GATES.some(g => g[0] === b.gate)) return json(res, 404, { error: 'gate desconhecido' });
    db.prepare('UPDATE gates SET passed=1, evidence=?, ts=? WHERE id=?').run(b.evidence || '', Date.now(), b.gate);
    log('evidence', b.gate + ': ' + (b.evidence || ''));
    return json(res, 200, { ok: true });
  }

  if (p === '/api/mainnet/attest' && req.method === 'POST') {
    const b = JSON.parse(await readBody(req) || '{}');
    db.prepare('INSERT OR IGNORE INTO attestations VALUES (?,?,?,?,?)').run(crypto.randomUUID(), b.gate, b.attester, b.role || 'auditor', Date.now());
    const n = db.prepare('SELECT COUNT(*) c FROM attestations WHERE gate=?').get(b.gate).c;
    const need = b.gate === 'independent_audit' ? AUDIT_QUORUM : 1;
    if (n >= need) { db.prepare('UPDATE gates SET passed=1, evidence=?, ts=? WHERE id=?').run('attestations=' + n, Date.now(), b.gate); log('attest_quorum', b.gate); }
    return json(res, 200, { attestations: n, need });
  }

  if (p === '/api/mainnet/activate' && req.method === 'POST') {
    const s = status();
    if (s.mode === 'mainnet') return json(res, 200, { mode: 'mainnet', note: 'ja ativa' });
    if (s.missing.length) return json(res, 403, { error: 'gates pendentes (Item 40)', missing: s.missing });
    if (s.timelock_remaining_h > 0) return json(res, 425, { error: 'timelock ativo', remaining_h: s.timelock_remaining_h });
    fs.mkdirSync(path.dirname(FLAG), { recursive: true });
    fs.writeFileSync(FLAG, JSON.stringify({ activatedAt: Date.now(), genesisHash: GENESIS.hash }));
    log('mainnet_activated', GENESIS.hash);
    return json(res, 200, { mode: 'mainnet', genesisHash: GENESIS.hash });
  }

  json(res, 404, { error: 'rota nao encontrada' });
});
server.listen(3024, () => console.log('Mainnet Gate (Item 40): http://localhost:3024 | modo: ' + mode()));
