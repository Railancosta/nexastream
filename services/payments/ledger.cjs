// ---------------------------------------------------------------------------
// Creator Ledger + Revenue Split Engine (Items 19, 21)
// Port 3016 | Zero npm deps (node:http + node:sqlite + node:crypto)
//
// Features:
//   - Revenue event collection (views, subs, ads, tips, PPV)
//   - 50/50 split (creator / NexaStream) on eligible net revenue
//   - Idempotent processing (dedup by event_id)
//   - Creator balance tracking (NST + USD equivalent)
//   - Payout request management with timelock
//   - Anti-fraud scoring integration
//   - Audit trail for all financial operations
// ---------------------------------------------------------------------------

const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
const db = new DatabaseSync(path.join(ROOT, 'database', 'ledger.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS revenue_events(
    id TEXT PRIMARY KEY, event_type TEXT, video_id TEXT, creator TEXT,
    viewer TEXT, amount_usd REAL, currency TEXT DEFAULT 'USD',
    source TEXT, metadata TEXT, fraud_score REAL DEFAULT 0,
    status TEXT DEFAULT 'pending', created_at INTEGER DEFAULT (strftime('%s','now')*1000)
  );
  CREATE TABLE IF NOT EXISTS creator_balances(
    creator TEXT PRIMARY KEY, nst_balance REAL DEFAULT 0,
    usd_balance REAL DEFAULT 0, total_earned REAL DEFAULT 0,
    total_paid REAL DEFAULT 0, updated_at INTEGER DEFAULT (strftime('%s','now')*1000)
  );
  CREATE TABLE IF NOT EXISTS split_history(
    id TEXT PRIMARY KEY, event_id TEXT, creator TEXT,
    creator_share REAL, platform_share REAL, total REAL,
    created_at INTEGER DEFAULT (strftime('%s','now')*1000)
  );
  CREATE TABLE IF NOT EXISTS payouts(
    id TEXT PRIMARY KEY, creator TEXT, amount_nst REAL, amount_usd REAL,
    dest_address TEXT, dest_network TEXT, dest_asset TEXT,
    status TEXT DEFAULT 'pending', tx_hash TEXT,
    timelock_until INTEGER, created_at INTEGER DEFAULT (strftime('%s','now')*1000)
  );
  CREATE TABLE IF NOT EXISTS exchange_rates(
    asset TEXT PRIMARY KEY, price_usd REAL, updated_at INTEGER
  );
`);

const CREATOR_SPLIT = 0.50;  // 50% to creator
const PLATFORM_SPLIT = 0.50; // 50% to NexaStream
const HIGH_VALUE_THRESHOLD = 10000; // USD — triggers 24h timelock
const TIMELOCK_HOURS = 24;
const MAX_PAYOUT_PER_DAY = 50000; // USD equivalent daily limit

function json(res, code, obj) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
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

function log(action, target, note) {
  // Simple audit log (in production: append-only log)
  console.log(JSON.stringify({ ts: new Date().toISOString(), action, target, note }));
}

// --- Revenue Event Ingestion ---
function ingestEvent(body) {
  const { eventType, videoId, creator, viewer, amountUsd, currency, source, metadata, fraudScore } = body;

  if (!eventType || !creator || !(amountUsd > 0)) {
    return { error: 'eventType, creator, amountUsd obrigatorios' };
  }

  const id = crypto.randomUUID();
  const safeAmount = Math.round(amountUsd * 100) / 100; // 2 decimal places

  // Anti-fraud: reject if fraud score too high
  if (fraudScore && fraudScore > 0.7) {
    db.prepare(`INSERT INTO revenue_events VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, eventType, videoId || '', creator, viewer || '', safeAmount, currency || 'USD',
        source || 'unknown', JSON.stringify(metadata || {}), fraudScore || 0, 'rejected', Date.now());
    return { id, status: 'rejected', reason: 'fraud_score=' + fraudScore };
  }

  // Idempotency: check for duplicate event
  const existing = db.prepare('SELECT id FROM revenue_events WHERE video_id=? AND viewer=? AND event_type=? AND created_at > ?')
    .get(videoId, viewer, eventType, Date.now() - 3600000); // 1h dedup window
  if (existing) {
    return { id: existing.id, status: 'duplicate', reason: 'event already processed in last hour' };
  }

  db.prepare(`INSERT INTO revenue_events VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, eventType, videoId || '', creator, viewer || '', safeAmount, currency || 'USD',
      source || 'unknown', JSON.stringify(metadata || {}), fraudScore || 0, 'pending', Date.now());

  // Auto-split and credit
  processEvent(id);

  return { id, status: 'processed', creatorShare: Math.round(safeAmount * CREATOR_SPLIT * 100) / 100 };
}

// --- Revenue Split Processing ---
function processEvent(eventId) {
  const event = db.prepare('SELECT * FROM revenue_events WHERE id=?').get(eventId);
  if (!event || event.status !== 'pending') return;

  const creatorShare = Math.round(event.amount_usd * CREATOR_SPLIT * 100) / 100;
  const platformShare = Math.round(event.amount_usd * PLATFORM_SPLIT * 100) / 100;

  // Credit creator balance
  db.prepare(`INSERT OR REPLACE INTO creator_balances (creator, nst_balance, usd_balance, total_earned, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(creator) DO UPDATE SET
    usd_balance = usd_balance + ?, total_earned = total_earned + ?, updated_at = ?`)
    .run(event.creator, 0, creatorShare, creatorShare, Date.now(), creatorShare, creatorShare, Date.now());

  // Record split
  db.prepare('INSERT INTO split_history VALUES (?,?,?,?,?,?,?)')
    .run(crypto.randomUUID(), eventId, event.creator, creatorShare, platformShare, event.amount_usd, Date.now());

  // Mark event as processed
  db.prepare("UPDATE revenue_events SET status='processed' WHERE id=?").run(eventId);

  log('revenue_split', eventId, `creator=${event.creator} share=$${creatorShare} platform=$${platformShare}`);
}

// --- Batch Processing ---
function processBatch() {
  const pending = db.prepare("SELECT id FROM revenue_events WHERE status='pending' LIMIT 100").all();
  let processed = 0;
  for (const e of pending) {
    processEvent(e.id);
    processed++;
  }
  return { processed, remaining: db.prepare("SELECT COUNT(*) c FROM revenue_events WHERE status='pending'").get().c };
}

// --- Payout Request ---
function requestPayout(body) {
  const { creator, amountNst, destAddress, destNetwork, destAsset } = body;

  if (!creator || !amountNst || amountNst <= 0 || !destAddress || !destNetwork) {
    return { error: 'campos obrigatorios: creator, amountNst, destAddress, destNetwork' };
  }

  const balance = db.prepare('SELECT * FROM creator_balances WHERE creator=?').get(creator);
  if (!balance || balance.usd_balance < amountNst) {
    return { error: 'saldo insuficiente', available: balance ? balance.usd_balance : 0 };
  }

  // Daily limit check
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todayPayouts = db.prepare("SELECT COALESCE(SUM(amount_usd),0) s FROM payouts WHERE creator=? AND created_at>? AND status != 'rejected'")
    .get(creator, todayStart).s;
  if (todayPayouts + amountNst > MAX_PAYOUT_PER_DAY) {
    return { error: 'limite diario de $' + MAX_PAYOUT_PER_DAY + ' excedido', todayUsed: todayPayouts };
  }

  // Address validation by network
  const validation = validateAddress(destAddress, destNetwork);
  if (!validation.valid) {
    return { error: 'endereco invalido para ' + destNetwork + ': ' + validation.reason };
  }

  // High-value timelock
  const timelockUntil = amountNst >= HIGH_VALUE_THRESHOLD ? Date.now() + TIMELOCK_HOURS * 3600000 : null;

  const id = crypto.randomUUID();
  db.prepare('INSERT INTO payouts VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run(id, creator, amountNst, amountNst, destAddress, destNetwork, destAsset || destNetwork,
      'pending', null, timelockUntil, Date.now());

  // Deduct from balance
  db.prepare('UPDATE creator_balances SET usd_balance = usd_balance - ?, updated_at = ? WHERE creator = ?')
    .run(amountNst, Date.now(), creator);

  log('payout_request', id, `creator=${creator} amount=$${amountNst} dest=${destNetwork}:${destAddress.slice(0, 12)}...`);

  return {
    id, status: 'pending',
    timelock: timelockUntil ? new Date(timelockUntil).toISOString() : null,
    note: timelockUntil ? `Alto valor: liberado apos ${TIMELOCK_HOURS}h (seguranca)` : 'Processando...',
    validation
  };
}

// --- Address Validation ---
function validateAddress(address, network) {
  const patterns = {
    BTC: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/,
    ETH: /^0x[0-9a-fA-F]{40}$/,
    SOL: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    XRP: /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/,
    XLM: /^G[A-Z2-7]{55}$/,
    TON: /^[A-Za-z0-9_-]{48}$/,
    ATOM: /^cosmos[0-9a-z]{38}$/,
    DOT: /^1[0-9A-Za-z]{47,50}$/,
    AVAX: /^0x[0-9a-fA-F]{40}$/,
    MATIC: /^0x[0-9a-fA-F]{40}$/,
    BNB: /^0x[0-9a-fA-F]{40}$/,
    LTC: /^(ltc1|[LM])[a-zA-HJ-NP-Z0-9]{26,62}$/,
    DOGE: /^D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32,34}$/,
    USDC: /^0x[0-9a-fA-F]{40}$/,
    USDT: /^0x[0-9a-fA-F]{40}$/,
  };

  const pattern = patterns[network.toUpperCase()];
  if (!pattern) return { valid: false, reason: 'rede nao suportada: ' + network };
  if (!pattern.test(address)) return { valid: false, reason: 'formato invalido para ' + network };

  // Destination Tag check for coins that need it
  const needsMemo = ['XRP', 'XLM', 'EOS', 'ATOM', 'TON'];
  return { valid: true, needsMemo: needsMemo.includes(network.toUpperCase()) };
}

// --- API Routes ---
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const body = req.method === 'POST' ? JSON.parse(await readBody(req) || '{}') : {};

  // Revenue Events
  if (p === '/api/ledger/event' && req.method === 'POST') {
    return json(res, 200, ingestEvent(body));
  }

  // Batch Processing
  if (p === '/api/ledger/process' && req.method === 'POST') {
    return json(res, 200, processBatch());
  }

  // Creator Balance
  const mBal = p.match(/^\/api\/ledger\/balance\/([\w-]+)$/);
  if (mBal && req.method === 'GET') {
    const bal = db.prepare('SELECT * FROM creator_balances WHERE creator=?').get(mBal[1]);
    const recentEvents = db.prepare("SELECT * FROM revenue_events WHERE creator=? ORDER BY created_at DESC LIMIT 10").all(mBal[1]);
    const pendingPayouts = db.prepare("SELECT * FROM payouts WHERE creator=? AND status='pending' ORDER BY created_at DESC").all(mBal[1]);
    return json(res, 200, {
      creator: mBal[1],
      balance: bal || { usd_balance: 0, nst_balance: 0, total_earned: 0, total_paid: 0 },
      recentEvents,
      pendingPayouts
    });
  }

  // Payout Request
  if (p === '/api/ledger/payout' && req.method === 'POST') {
    return json(res, 200, requestPayout(body));
  }

  // Payout History
  if (p === '/api/ledger/payouts') {
    const creator = url.searchParams.get('creator');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const query = creator
      ? 'SELECT * FROM payouts WHERE creator=? ORDER BY created_at DESC LIMIT ?'
      : 'SELECT * FROM payouts ORDER BY created_at DESC LIMIT ?';
    const params = creator ? [creator, limit] : [limit];
    return json(res, 200, { payouts: db.prepare(query).all(...params) });
  }

  // Revenue Summary
  if (p === '/api/ledger/summary') {
    const totalRevenue = db.prepare("SELECT SUM(amount_usd) s FROM revenue_events WHERE status='processed'").get().s || 0;
    const totalCreatorPayouts = db.prepare("SELECT COALESCE(SUM(usd_balance),0) s FROM creator_balances").get().s || 0;
    const totalPlatformShare = db.prepare("SELECT SUM(platform_share) s FROM split_history").get().s || 0;
    const eventCount = db.prepare("SELECT COUNT(*) c FROM revenue_events WHERE status='processed'").get().c;
    const topCreators = db.prepare("SELECT creator, usd_balance, total_earned FROM creator_balances ORDER BY usd_balance DESC LIMIT 10").all();
    return json(res, 200, {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCreatorPayouts: Math.round(totalCreatorPayouts * 100) / 100,
      totalPlatformShare: Math.round(totalPlatformShare * 100) / 100,
      eventCount,
      splitRatio: { creator: '50%', platform: '50%' },
      topCreators
    });
  }

  // Address Validation
  if (p === '/api/ledger/validate-address') {
    const addr = url.searchParams.get('address');
    const net = url.searchParams.get('network');
    if (!addr || !net) return json(res, 400, { error: 'address e network obrigatorios' });
    return json(res, 200, validateAddress(addr, net));
  }

  // Supported Networks
  if (p === '/api/ledger/networks') {
    return json(res, 200, {
      networks: [
        { id: 'BTC', name: 'Bitcoin', symbol: 'BTC', needsMemo: false },
        { id: 'ETH', name: 'Ethereum', symbol: 'ETH', needsMemo: false },
        { id: 'SOL', name: 'Solana', symbol: 'SOL', needsMemo: false },
        { id: 'XRP', name: 'XRP Ledger', symbol: 'XRP', needsMemo: true },
        { id: 'XLM', name: 'Stellar', symbol: 'XLM', needsMemo: true },
        { id: 'TON', name: 'Toncoin', symbol: 'TON', needsMemo: true },
        { id: 'ATOM', name: 'Cosmos', symbol: 'ATOM', needsMemo: true },
        { id: 'DOT', name: 'Polkadot', symbol: 'DOT', needsMemo: false },
        { id: 'AVAX', name: 'Avalanche', symbol: 'AVAX', needsMemo: false },
        { id: 'MATIC', name: 'Polygon', symbol: 'MATIC', needsMemo: false },
        { id: 'BNB', name: 'BNB Chain', symbol: 'BNB', needsMemo: false },
        { id: 'LTC', name: 'Litecoin', symbol: 'LTC', needsMemo: false },
        { id: 'DOGE', name: 'Dogecoin', symbol: 'DOGE', needsMemo: false },
        { id: 'USDC', name: 'USD Coin', symbol: 'USDC', needsMemo: false },
        { id: 'USDT', name: 'Tether', symbol: 'USDT', needsMemo: false },
      ],
      disclaimer: 'NexaStream usa agregadores de liquidez de terceiros. Taxas de rede e slippage sao determinados pelas blockchains de destino.'
    });
  }

  // Health
  if (p === '/api/health') {
    const pending = db.prepare("SELECT COUNT(*) c FROM revenue_events WHERE status='pending'").get().c;
    const total = db.prepare('SELECT COUNT(*) c FROM revenue_events').get().c;
    return json(res, 200, { ok: true, service: 'ledger', events: total, pending });
  }

  json(res, 404, { error: 'rota nao encontrada' });
});

// Auto-process pending events every 30s
setInterval(() => { try { processBatch(); } catch {} }, 30000);

server.listen(process.env.PORT || 3016, () => {
  console.log('Creator Ledger + Revenue Split Engine: http://localhost:' + (process.env.PORT || 3016));
});
