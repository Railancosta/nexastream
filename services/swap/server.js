const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
const db = new DatabaseSync(path.join(ROOT, 'database', 'swap.db'));
db.exec(`CREATE TABLE IF NOT EXISTS swaps(id TEXT PRIMARY KEY, user_id TEXT, nst_amount REAL, nano_amount REAL, dest_nano TEXT, status TEXT DEFAULT 'pending', created_at INTEGER, release_after INTEGER, attestations INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS attestations(id TEXT PRIMARY KEY, swap_id TEXT, auditor TEXT, ts INTEGER, UNIQUE(swap_id, auditor));
CREATE TABLE IF NOT EXISTS reserves(id INTEGER PRIMARY KEY CHECK(id=1), nano_reserve REAL DEFAULT 0, nst_locked REAL DEFAULT 0);
INSERT OR IGNORE INTO reserves VALUES (1, 0, 0);`);

const RATE_NANO_PER_NST = 0.001;      // 1 NST = 0.001 NANO (parametro DAO)
const QUORUM = 3;                     // auditores independentes (usuarios)
const TIMELOCK_S = 60;                // testnet; mainnet maior
const NANO_RE = /^nano_[13][0-9a-z]{59}$/;

function json(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }); res.end(JSON.stringify(obj)); }
function readBody(req) { return new Promise((res, rej) => { const c = []; let n = 0; req.on('data', d => { n += d.length; if (n > 1e6) req.destroy(); else c.push(d); }); req.on('end', () => res(Buffer.concat(c).toString())); req.on('error', rej); }); }
const reserves = () => db.prepare('SELECT * FROM reserves WHERE id=1').get();

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;
  if (req.method === 'OPTIONS') return json(res, 204, {});

  if (p === '/api/swap/quote') {
    const nst = Number(u.searchParams.get('nst') || 0);
    return json(res, 200, { nst, nano: +(nst * RATE_NANO_PER_NST).toFixed(8), rate: RATE_NANO_PER_NST });
  }

  // PROVA DE RESERVAS publica: qualquer usuario verifica solvencia
  if (p === '/api/swap/proof') {
    const r = reserves();
    const required = r.nst_locked * RATE_NANO_PER_NST;
    return json(res, 200, { nano_reserve: r.nano_reserve, nst_locked: r.nst_locked, required_nano: +required.toFixed(8), solvent: r.nano_reserve >= required - 1e-9, quorum: QUORUM, timelock_s: TIMELOCK_S });
  }

  if (p === '/api/swap/request' && req.method === 'POST') {
    const b = JSON.parse(await readBody(req) || '{}');
    if (!b.userId || !(b.nstAmount > 0)) return json(res, 400, { error: 'userId/nstAmount invalidos' });
    if (!NANO_RE.test(b.destNano || '')) return json(res, 400, { error: 'endereco Nano externo invalido' });
    const id = crypto.randomUUID();
    const now = Date.now();
    db.prepare('INSERT INTO swaps VALUES (?,?,?,?,?,?,?,?,?)').run(id, b.userId, b.nstAmount, +(b.nstAmount * RATE_NANO_PER_NST).toFixed(8), b.destNano, 'pending', now, now + TIMELOCK_S * 1000, 0);
    const r = reserves();
    db.prepare('UPDATE reserves SET nst_locked = nst_locked + ?, nano_reserve = nano_reserve + ? WHERE id=1').run(b.nstAmount, +(b.nstAmount * RATE_NANO_PER_NST).toFixed(8));
    return json(res, 200, { id, status: 'pending', attestations_needed: QUORUM });
  }

  // USUARIOS COMO AUDITORES: attestacao independente
  if (p === '/api/swap/attest' && req.method === 'POST') {
    const b = JSON.parse(await readBody(req) || '{}');
    const s = db.prepare('SELECT * FROM swaps WHERE id=?').get(b.swapId);
    if (!s) return json(res, 404, { error: 'swap nao encontrado' });
    const r = reserves();
    const solvent = r.nano_reserve >= (r.nst_locked * RATE_NANO_PER_NST) - 1e-9;
    if (!solvent) return json(res, 400, { error: 'NAO solvente — auditoria reprovou' });
    db.prepare('INSERT OR IGNORE INTO attestations VALUES (?,?,?,?)').run(crypto.randomUUID(), b.swapId, b.auditor, Date.now());
    const n = db.prepare('SELECT COUNT(*) c FROM attestations WHERE swap_id=?').get(b.swapId).c;
    db.prepare('UPDATE swaps SET attestations=? WHERE id=?').run(n, b.swapId);
    return json(res, 200, { attestations: n, quorum: QUORUM });
  }

  // LIBERACAO: quorum + timelock + solvencia => payout Nano em tempo real
  if (p === '/api/swap/release' && req.method === 'POST') {
    const b = JSON.parse(await readBody(req) || '{}');
    const s = db.prepare('SELECT * FROM swaps WHERE id=?').get(b.swapId);
    if (!s) return json(res, 404, { error: 'swap nao encontrado' });
    if (s.status === 'released') return json(res, 400, { error: 'ja liberado' });
    if (Date.now() < s.release_after) return json(res, 425, { error: 'timelock ativo' });
    if (s.attestations < QUORUM) return json(res, 403, { error: 'quorum de auditores insuficiente' });
    const r = reserves();
    if (r.nano_reserve < (r.nst_locked * RATE_NANO_PER_NST) - 1e-9) return json(res, 400, { error: 'insolvente' });
    const txref = 'nano_tx_' + crypto.createHash('sha256').update(s.id + s.dest_nano).digest('hex').slice(0, 24);
    db.prepare("UPDATE swaps SET status='released' WHERE id=?").run(s.id);
    db.prepare('UPDATE reserves SET nst_locked = nst_locked - ?, nano_reserve = nano_reserve - ? WHERE id=1').run(s.nst_amount, s.nano_amount);
    return json(res, 200, { status: 'released', nano_tx: txref, dest: s.dest_nano, amount: s.nano_amount, realtime: true });
  }

  if (p === '/api/swap/list') return json(res, 200, { swaps: db.prepare('SELECT * FROM swaps ORDER BY created_at DESC LIMIT 50').all() });
  json(res, 404, { error: 'rota nao encontrada' });
});
server.listen(3023, () => console.log('Swap Bridge NST<->Nano :3023 (auditoria comunitaria)'));
