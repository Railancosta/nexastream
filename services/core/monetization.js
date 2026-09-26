// ---------------------------------------------------------------------------
// Instant Monetization Gateway (Items 20, 21, 22, 33 of the developer plan)
//
// A single server-side contract that the Android app, the web app and the SDK
// can all use. It exists so that "monetization from day one" is a measured,
// auditable server decision instead of a client-side claim.
//
// Responsibilities:
//   - publish the reward rate table (transparent, versioned)
//   - accrue creator + viewer rewards for *validated* watch events
//   - score every event with the anti-fraud engine before crediting
//   - expose creator balances, earnings breakdown and unit economics
//   - accept payout requests with address validation + value timelock
//
// Design notes:
//   - All money is stored as integer micro-NST (1 NST = 1e6 micro) to avoid
//     floating point drift on balances.
//   - Reward accrual is idempotent per (video, viewer, kind).
//   - Nothing is credited until the anti-fraud engine returns a score below
//     the configured threshold.
// ---------------------------------------------------------------------------

const crypto = require('node:crypto');

const MICRO = 1_000_000;

// Reward rate table. Values are NST and are published to clients verbatim so
// creators can audit expected earnings. `VERSION` changes invalidate caches.
const RATES_VERSION = '2026-09-01';
const RATES = {
  // Creator side
  valid_view: 0.0100,      // >= MIN_WATCH_SECONDS of playback
  completion: 0.0200,      // played to >= COMPLETION_RATIO
  like: 0.0050,
  subscribe: 0.0500,
  // Viewer side (watch-to-earn)
  viewer_view: 0.0020,
  viewer_daily_view_cap: 50
};

const CONFIG = {
  minWatchSeconds: 10,
  completionRatio: 0.85,
  splitCreator: 0.50,
  splitPlatform: 0.50,
  minPayoutNst: 100,
  highValueTimelockNst: 10000,
  timelockHours: 24,
  fraudRejectThreshold: 0.70,
  // Anti-fraud velocity window
  velocityWindowMs: 60_000,
  velocityMaxEvents: 20,
  // Distinct videos required before a viewer stops looking like a bot
  minDistinctVideosForTrust: 3
};

const ADDRESS_PATTERNS = {
  NANO: /^(nano_|xrb_)[13][13456789abcdefghijkmnopqrstuwxyz]{59}$/,
  BTC: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/,
  ETH: /^0x[0-9a-fA-F]{40}$/,
  MATIC: /^0x[0-9a-fA-F]{40}$/,
  BNB: /^0x[0-9a-fA-F]{40}$/,
  USDC: /^0x[0-9a-fA-F]{40}$/,
  USDT: /^0x[0-9a-fA-F]{40}$/,
  AVAX: /^0x[0-9a-fA-F]{40}$/,
  SOL: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
  XRP: /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/,
  XLM: /^G[A-Z2-7]{55}$/,
  LTC: /^(ltc1|[LM])[a-zA-HJ-NP-Z0-9]{26,62}$/,
  DOGE: /^D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32,34}$/,
  TON: /^[A-Za-z0-9_-]{48}$/,
  ATOM: /^cosmos[0-9a-z]{38}$/
};

const MEMO_NETWORKS = ['XRP', 'XLM', 'ATOM', 'TON'];

let ctx = null;

function init(context) {
  ctx = context;
  const { db } = ctx;
  db.exec(`
    CREATE TABLE IF NOT EXISTS wallets(
      owner_id TEXT PRIMARY KEY,
      owner_kind TEXT DEFAULT 'user',
      handle TEXT,
      nst_micro INTEGER DEFAULT 0,
      lifetime_creator_micro INTEGER DEFAULT 0,
      lifetime_viewer_micro INTEGER DEFAULT 0,
      lifetime_paid_micro INTEGER DEFAULT 0,
      platform_micro INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS reward_ledger(
      id TEXT PRIMARY KEY,
      owner_id TEXT,
      video_id TEXT,
      viewer_id TEXT,
      kind TEXT,
      role TEXT,
      amount_micro INTEGER,
      fraud_score REAL DEFAULT 0,
      status TEXT DEFAULT 'credited',
      reason TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS view_events(
      id TEXT PRIMARY KEY,
      video_id TEXT,
      viewer_id TEXT,
      seconds REAL DEFAULT 0,
      completed INTEGER DEFAULT 0,
      device_hash TEXT,
      ip_hash TEXT,
      fraud_score REAL DEFAULT 0,
      decision TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS payout_requests(
      id TEXT PRIMARY KEY,
      owner_id TEXT,
      amount_micro INTEGER,
      dest_address TEXT,
      dest_network TEXT,
      dest_memo TEXT,
      status TEXT DEFAULT 'pending',
      timelock_until TEXT,
      tx_ref TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS reward_claims(
      video_id TEXT, viewer_id TEXT, kind TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY(video_id, viewer_id, kind)
    );
    CREATE INDEX IF NOT EXISTS idx_reward_ledger_owner ON reward_ledger(owner_id);
    CREATE INDEX IF NOT EXISTS idx_view_events_video ON view_events(video_id);
    CREATE INDEX IF NOT EXISTS idx_payout_owner ON payout_requests(owner_id);
  `);
}

// --- helpers ---------------------------------------------------------------

function microToNst(m) { return Math.round(m) / MICRO; }
function nstToMicro(n) { return Math.round(Number(n) * MICRO); }

function ensureWallet(ownerId, handle, kind) {
  const { db } = ctx;
  const existing = db.prepare('SELECT * FROM wallets WHERE owner_id=?').get(ownerId);
  if (existing) return existing;
  db.prepare('INSERT INTO wallets (owner_id, owner_kind, handle) VALUES (?,?,?)')
    .run(ownerId, kind || 'user', handle || null);
  return db.prepare('SELECT * FROM wallets WHERE owner_id=?').get(ownerId);
}

function hashSignal(value, salt) {
  if (!value) return '';
  return crypto.createHash('sha256').update(String(value) + '|' + salt).digest('hex').slice(0, 24);
}

// --- anti-fraud engine (Item 22) -------------------------------------------
//
// Deliberately a *combination* of independent signals rather than one rule:
//   behavioural  -> watch ratio, completion, playback speed plausibility
//   temporal     -> event velocity, duplicate bursts
//   network      -> coarse IP hash reuse across accounts
//   device       -> device hash reuse across accounts
//   account      -> age / distinct-video history
//   content      -> per-video reward saturation
// Each signal contributes an independent weight; the score is their union,
// capped at 1.0. Heuristics never reject on their own — only the sum does — but
// objective invariants (physically impossible playback) reject outright.
function scoreEvent(input) {
  const { db } = ctx;
  const signals = [];
  let score = 0;

  const add = (name, weight, detail) => {
    if (weight <= 0) return;
    score += weight;
    signals.push({ signal: name, weight: Math.round(weight * 1000) / 1000, detail });
  };

  const duration = Number(input.duration) || 0;
  const seconds = Number(input.seconds) || 0;
  const ratio = duration > 0 ? seconds / duration : 0;

  // Objective invariants. These are not heuristics: an event that fails one of
  // them cannot be a real view no matter how plausible the rest looks, so they
  // reject outright instead of only contributing weight to the score.
  const hardReject = [];
  if (seconds < CONFIG.minWatchSeconds) {
    add('watch_below_minimum', 0.45, `seconds=${seconds} < ${CONFIG.minWatchSeconds}`);
    hardReject.push(`playback ${seconds}s is below the ${CONFIG.minWatchSeconds}s minimum for a valid view`);
  }
  if (duration > 0 && seconds > duration * 1.25) {
    add('impossible_watch_time', 0.60, `seconds=${seconds} > duration=${duration}`);
    hardReject.push(`reported ${seconds}s of playback on a ${duration}s video`);
  }
  if (duration >= 60 && ratio > 0 && ratio < 0.02) {
    add('instant_skip', 0.20, `ratio=${ratio.toFixed(3)}`);
  }

  const windowStart = new Date(Date.now() - CONFIG.velocityWindowMs)
    .toISOString().replace('T', ' ').slice(0, 19);
  const recent = db.prepare(
    'SELECT COUNT(*) c FROM view_events WHERE viewer_id=? AND created_at >= ?'
  ).get(input.viewerId, windowStart).c;
  if (recent >= CONFIG.velocityMaxEvents) {
    add('view_velocity', 0.35, `${recent} events in ${CONFIG.velocityWindowMs / 1000}s`);
  } else if (recent >= Math.floor(CONFIG.velocityMaxEvents / 2)) {
    add('view_velocity_elevated', 0.12, `${recent} events in ${CONFIG.velocityWindowMs / 1000}s`);
  }

  if (input.deviceHash) {
    const sameDevice = db.prepare(
      'SELECT COUNT(DISTINCT viewer_id) c FROM view_events WHERE device_hash=? AND viewer_id<>?'
    ).get(input.deviceHash, input.viewerId).c;
    if (sameDevice >= 3) add('shared_device_farm', 0.40, `${sameDevice} other viewers on device`);
    else if (sameDevice >= 1) add('shared_device', 0.10, `${sameDevice} other viewer(s) on device`);
  }

  if (input.ipHash) {
    const sameIp = db.prepare(
      'SELECT COUNT(DISTINCT viewer_id) c FROM view_events WHERE ip_hash=? AND viewer_id<>?'
    ).get(input.ipHash, input.viewerId).c;
    if (sameIp >= 8) add('ip_concentration', 0.30, `${sameIp} other viewers from same network`);
    else if (sameIp >= 3) add('ip_concentration_low', 0.08, `${sameIp} other viewers from same network`);
  }

  const distinctVideos = db.prepare(
    'SELECT COUNT(DISTINCT video_id) c FROM view_events WHERE viewer_id=?'
  ).get(input.viewerId).c;
  if (distinctVideos === 0 && recent === 0) {
    // First-ever event: neutral, but not trusted yet.
    signals.push({ signal: 'new_viewer', weight: 0, detail: 'no prior history' });
  } else if (distinctVideos < CONFIG.minDistinctVideosForTrust) {
    add('low_view_diversity', 0.10, `distinct_videos=${distinctVideos}`);
  }

  const saturated = db.prepare(
    'SELECT COUNT(*) c FROM reward_claims WHERE video_id=?'
  ).get(input.videoId).c;
  if (saturated > 5000) add('video_reward_saturation', 0.15, `claims=${saturated}`);

  const capped = Math.min(1, Math.round(score * 100) / 100);
  return {
    score: capped,
    signals,
    hardReject,
    reject: capped >= CONFIG.fraudRejectThreshold || hardReject.length > 0
  };
}

// --- accrual ---------------------------------------------------------------

function alreadyClaimed(videoId, viewerId, kind) {
  const { db } = ctx;
  return !!db.prepare('SELECT 1 FROM reward_claims WHERE video_id=? AND viewer_id=? AND kind=?')
    .get(videoId, viewerId, kind);
}

function claim(videoId, viewerId, kind) {
  const { db } = ctx;
  try {
    db.prepare('INSERT INTO reward_claims (video_id, viewer_id, kind) VALUES (?,?,?)')
      .run(videoId, viewerId, kind);
    return true;
  } catch {
    return false; // PRIMARY KEY violation == already claimed
  }
}

function credit(ownerId, handle, kind, role, amountMicro, videoId, viewerId, fraudScore, status, reason) {
  const { db } = ctx;
  ensureWallet(ownerId, handle, role === 'creator' ? 'creator' : 'user');
  db.prepare(`INSERT INTO reward_ledger
      (id, owner_id, video_id, viewer_id, kind, role, amount_micro, fraud_score, status, reason)
      VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(crypto.randomUUID(), ownerId, videoId || '', viewerId || '', kind, role,
      Math.round(amountMicro), fraudScore || 0, status, reason || null);
}

function accrue(input) {
  const { db } = ctx;
  const {
    videoId, viewerId, seconds, completed, duration, deviceHash, ipHash,
    channelId, channelHandle, ownerId
  } = input;

  const eventId = crypto.randomUUID();
  const scored = scoreEvent({ videoId, viewerId, seconds, duration, deviceHash, ipHash });

  db.prepare(`INSERT INTO view_events
      (id, video_id, viewer_id, seconds, completed, device_hash, ip_hash, fraud_score, decision)
      VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(eventId, videoId, viewerId, Number(seconds) || 0, completed ? 1 : 0,
      deviceHash || '', ipHash || '', scored.score, scored.reject ? 'rejected' : 'accepted');

  if (scored.reject) {
    credit(ownerId, channelHandle, 'valid_view', 'creator', 0, videoId, viewerId,
      scored.score, 'rejected', 'failed_event_validation');
    return {
      credited: false,
      eventId,
      fraudScore: scored.score,
      signals: scored.signals,
      reason: scored.hardReject.length
        ? scored.hardReject.join('; ')
        : `event rejected by anti-fraud engine (score ${scored.score} >= ${CONFIG.fraudRejectThreshold})`
    };
  }

  const credits = [];

  // Creator rewards. Each kind is claimed at most once per (video, viewer).
  const creatorKinds = [['valid_view', RATES.valid_view]];
  if (completed) creatorKinds.push(['completion', RATES.completion]);

  for (const [kind, rate] of creatorKinds) {
    if (!claim(videoId, viewerId, kind)) continue;
    const grossMicro = nstToMicro(rate);
    const creatorMicro = Math.round(grossMicro * CONFIG.splitCreator);
    const platformMicro = grossMicro - creatorMicro;
    credit(ownerId, channelHandle, kind, 'creator', creatorMicro, videoId, viewerId, scored.score, 'credited', null);
    db.prepare(`UPDATE wallets SET nst_micro = nst_micro + ?, lifetime_creator_micro = lifetime_creator_micro + ?,
                platform_micro = platform_micro + ?, updated_at = datetime('now') WHERE owner_id = ?`)
      .run(creatorMicro, creatorMicro, platformMicro, ownerId);
    credits.push({ role: 'creator', kind, nst: microToNst(creatorMicro), platformNst: microToNst(platformMicro) });
  }

  // Viewer watch-to-earn, capped daily so it cannot be farmed.
  if (claim(videoId, viewerId, 'viewer_view')) {
    const todayStart = new Date().toISOString().slice(0, 10) + ' 00:00:00';
    const todayCount = db.prepare(
      "SELECT COUNT(*) c FROM reward_ledger WHERE viewer_id=? AND kind='viewer_view' AND created_at >= ?"
    ).get(viewerId, todayStart).c;
    if (todayCount < RATES.viewer_daily_view_cap) {
      const viewerMicro = nstToMicro(RATES.viewer_view);
      credit(viewerId, null, 'viewer_view', 'viewer', viewerMicro, videoId, viewerId, scored.score, 'credited', null);
      db.prepare(`UPDATE wallets SET nst_micro = nst_micro + ?, lifetime_viewer_micro = lifetime_viewer_micro + ?,
                  updated_at = datetime('now') WHERE owner_id = ?`)
        .run(viewerMicro, viewerMicro, viewerId);
      credits.push({ role: 'viewer', kind: 'viewer_view', nst: microToNst(viewerMicro) });
    }
  }

  const totalCreator = credits.filter((c) => c.role === 'creator').reduce((a, c) => a + c.nst, 0);
  return {
    credited: credits.length > 0,
    eventId,
    fraudScore: scored.score,
    signals: scored.signals,
    credits,
    creatorNst: Math.round(totalCreator * 1e6) / 1e6,
    ratesVersion: RATES_VERSION
  };
}

function accrueEngagement(kind, input) {
  const rate = RATES[kind];
  if (!rate) return { credited: false, reason: 'unknown reward kind: ' + kind };
  const { videoId, viewerId, channelId, channelHandle, ownerId } = input;
  if (!claim(videoId, viewerId, kind)) {
    return { credited: false, reason: 'already claimed (anti-fraud: 1 per viewer per video)' };
  }
  const grossMicro = nstToMicro(rate);
  const creatorMicro = Math.round(grossMicro * CONFIG.splitCreator);
  const platformMicro = grossMicro - creatorMicro;
  credit(ownerId, channelHandle, kind, 'creator', creatorMicro, videoId, viewerId, 0, 'credited', null);
  const { db } = ctx;
  db.prepare(`UPDATE wallets SET nst_micro = nst_micro + ?, lifetime_creator_micro = lifetime_creator_micro + ?,
              platform_micro = platform_micro + ?, updated_at = datetime('now') WHERE owner_id = ?`)
    .run(creatorMicro, creatorMicro, platformMicro, ownerId);
  return { credited: true, kind, nst: microToNst(creatorMicro), platformNst: microToNst(platformMicro) };
}

// --- reads -----------------------------------------------------------------

function walletView(ownerId, handle) {
  const { db } = ctx;
  const w = ensureWallet(ownerId, handle, 'creator');
  const recent = db.prepare(
    'SELECT kind, role, amount_micro, status, video_id, created_at FROM reward_ledger WHERE owner_id=? ORDER BY created_at DESC, rowid DESC LIMIT 25'
  ).all(ownerId);
  const payouts = db.prepare(
    'SELECT id, amount_micro, dest_address, dest_network, status, timelock_until, created_at FROM payout_requests WHERE owner_id=? ORDER BY created_at DESC LIMIT 20'
  ).all(ownerId);
  const byKind = db.prepare(
    "SELECT kind, SUM(amount_micro) total, COUNT(*) events FROM reward_ledger WHERE owner_id=? AND role='creator' AND status='credited' GROUP BY kind"
  ).all(ownerId);
  return {
    ownerId,
    balanceNst: microToNst(w.nst_micro),
    lifetimeCreatorNst: microToNst(w.lifetime_creator_micro),
    lifetimeViewerNst: microToNst(w.lifetime_viewer_micro),
    lifetimePaidNst: microToNst(w.lifetime_paid_micro),
    platformNst: microToNst(w.platform_micro),
    earningsByKind: byKind.map((r) => ({
      kind: r.kind, nst: microToNst(r.total || 0), events: r.events
    })),
    recentLedger: recent.map((r) => ({
      kind: r.kind, role: r.role, nst: microToNst(r.amount_micro),
      status: r.status, videoId: r.video_id, createdAt: r.created_at
    })),
    payouts: payouts.map((p) => ({
      id: p.id, amountNst: microToNst(p.amount_micro),
      destAddress: p.dest_address, destNetwork: p.dest_network,
      status: p.status, timelockUntil: p.timelock_until, createdAt: p.created_at
    })),
    config: publicConfig()
  };
}

function publicConfig() {
  return {
    ratesVersion: RATES_VERSION,
    rates: RATES,
    split: { creator: CONFIG.splitCreator, platform: CONFIG.splitPlatform },
    minPayoutNst: CONFIG.minPayoutNst,
    minWatchSeconds: CONFIG.minWatchSeconds,
    completionRatio: CONFIG.completionRatio,
    fraudRejectThreshold: CONFIG.fraudRejectThreshold,
    timelockHours: CONFIG.timelockHours,
    networks: Object.keys(ADDRESS_PATTERNS),
    memoNetworks: MEMO_NETWORKS,
    custody: 'non-custodial-payout-request'
  };
}

function validateAddress(address, network) {
  const net = String(network || '').toUpperCase();
  const pattern = ADDRESS_PATTERNS[net];
  if (!pattern) return { valid: false, reason: 'unsupported network: ' + network, networks: Object.keys(ADDRESS_PATTERNS) };
  if (!address || !pattern.test(String(address))) {
    return { valid: false, reason: 'address format invalid for ' + net };
  }
  return { valid: true, network: net, needsMemo: MEMO_NETWORKS.includes(net) };
}

function requestPayout(input) {
  const { db } = ctx;
  const { ownerId, handle, amountNst, destAddress, destNetwork, destMemo } = input;
  const amountMicro = nstToMicro(amountNst);
  if (!(amountMicro > 0)) return { error: 'amountNst must be positive' };
  if (amountMicro < nstToMicro(CONFIG.minPayoutNst)) {
    return { error: `minimum payout is ${CONFIG.minPayoutNst} NST`, minPayoutNst: CONFIG.minPayoutNst };
  }
  // Validate the destination before touching balances so a malformed request
  // reports the actual problem instead of a misleading "insufficient balance".
  const validation = validateAddress(destAddress, destNetwork);
  if (!validation.valid) return { error: validation.reason, networks: validation.networks };

  // Networks that address accounts by (address, memo) pair lose funds
  // irrecoverably if the memo is omitted, so require it before any balance is
  // touched rather than letting a payout be recorded without one.
  const memo = destMemo == null ? '' : String(destMemo).trim();
  if (validation.needsMemo && memo === '') {
    return {
      error: `destination memo/tag is required for ${validation.network}`,
      network: validation.network,
      needsMemo: true
    };
  }

  const w = ensureWallet(ownerId, handle, 'creator');
  if (w.nst_micro < amountMicro) {
    return { error: 'insufficient balance', availableNst: microToNst(w.nst_micro) };
  }

  const needsTimelock = amountMicro >= nstToMicro(CONFIG.highValueTimelockNst);
  const timelockUntil = needsTimelock
    ? new Date(Date.now() + CONFIG.timelockHours * 3600_000).toISOString().replace('T', ' ').slice(0, 19)
    : null;

  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO payout_requests
      (id, owner_id, amount_micro, dest_address, dest_network, dest_memo, status, timelock_until)
      VALUES (?,?,?,?,?,?,?,?)`)
    .run(id, ownerId, amountMicro, destAddress, validation.network, memo || null,
      needsTimelock ? 'timelocked' : 'approved', timelockUntil);

  // Funds leave the spendable balance immediately so they cannot be double-spent.
  // lifetime_paid_micro is cumulative and never decremented, so it stays a
  // truthful "total ever withdrawn" figure even after a payout is settled.
  db.prepare(`UPDATE wallets
      SET nst_micro = nst_micro - ?,
          lifetime_paid_micro = lifetime_paid_micro + ?,
          updated_at = datetime('now')
      WHERE owner_id = ?`)
    .run(amountMicro, amountMicro, ownerId);

  return {
    id,
    status: needsTimelock ? 'timelocked' : 'approved',
    amountNst: microToNst(amountMicro),
    destAddress, destNetwork: validation.network,
    needsMemo: validation.needsMemo,
    timelockUntil,
    note: needsTimelock
      ? `High-value payout: released after ${CONFIG.timelockHours}h review window (Item 18: timelock).`
      : 'Queued for the next settlement batch. Testnet settlement is manual and audited.',
    testnet: true
  };
}

// --- HTTP surface ----------------------------------------------------------

function handle(req, res, url, p) {
  const { json, readBody, auth, db, rateLimitKey } = ctx;

  if (p === '/api/monetization/config' && req.method === 'GET') {
    return json(res, 200, publicConfig());
  }

  if (p === '/api/monetization/rates' && req.method === 'GET') {
    return json(res, 200, { ratesVersion: RATES_VERSION, rates: RATES, split: { creator: CONFIG.splitCreator, platform: CONFIG.splitPlatform } });
  }

  if (p === '/api/monetization/accrue' && req.method === 'POST') {
    return (async () => {
      const b = JSON.parse((await readBody(req)) || '{}');
      if (!b.videoId || !b.viewerId) {
        return json(res, 400, { error: 'videoId and viewerId are required' });
      }
      const row = db.prepare(
        'SELECT v.id, v.duration, v.channel_id, c.owner_id, c.handle FROM videos v LEFT JOIN channels c ON c.id=v.channel_id WHERE v.id=?'
      ).get(String(b.videoId).slice(0, 64));
      if (!row) return json(res, 404, { error: 'video not found' });
      const result = accrue({
        videoId: row.id,
        viewerId: String(b.viewerId).slice(0, 64),
        seconds: b.seconds,
        completed: !!b.completed,
        duration: row.duration,
        deviceHash: b.deviceId ? hashSignal(b.deviceId, rateLimitKey || 'ns') : '',
        ipHash: hashSignal(req.socket.remoteAddress, rateLimitKey || 'ns'),
        channelId: row.channel_id,
        channelHandle: row.handle,
        ownerId: row.owner_id || 'unclaimed'
      });
      return json(res, 200, result);
    })();
  }

  const mEngage = p.match(/^\/api\/monetization\/reward\/(like|subscribe)$/);
  if (mEngage && req.method === 'POST') {
    return (async () => {
      const b = JSON.parse((await readBody(req)) || '{}');
      if (!b.videoId) return json(res, 400, { error: 'videoId is required' });
      const row = db.prepare(
        'SELECT v.id, v.channel_id, c.owner_id, c.handle FROM videos v LEFT JOIN channels c ON c.id=v.channel_id WHERE v.id=?'
      ).get(String(b.videoId).slice(0, 64));
      if (!row) return json(res, 404, { error: 'video not found' });
      const viewerId = String(b.viewerId || 'anon').slice(0, 64);
      const result = accrueEngagement(mEngage[1], {
        videoId: row.id, viewerId,
        channelId: row.channel_id, channelHandle: row.handle,
        ownerId: row.owner_id || 'unclaimed'
      });
      return json(res, 200, result);
    })();
  }

  if (p === '/api/monetization/wallet' && req.method === 'GET') {
    const a = auth(req);
    const handleParam = url.searchParams.get('handle');
    if (!a && !handleParam) return json(res, 401, { error: 'unauthorized' });
    let ownerId = a ? a.userId : null;
    if (handleParam) {
      const ch = db.prepare('SELECT owner_id FROM channels WHERE handle=?').get(handleParam);
      if (!ch) return json(res, 404, { error: 'channel not found' });
      ownerId = ch.owner_id;
    }
    const ch = db.prepare('SELECT handle FROM channels WHERE owner_id=?').get(ownerId);
    return json(res, 200, walletView(ownerId, ch ? ch.handle : null));
  }

  if (p === '/api/monetization/payout' && req.method === 'POST') {
    const a = auth(req);
    if (!a) return json(res, 401, { error: 'unauthorized' });
    return (async () => {
      const b = JSON.parse((await readBody(req)) || '{}');
      const ch = db.prepare('SELECT handle FROM channels WHERE owner_id=?').get(a.userId);
      const result = requestPayout({
        ownerId: a.userId,
        handle: ch ? ch.handle : null,
        amountNst: b.amountNst,
        destAddress: b.destAddress,
        destNetwork: b.destNetwork,
        destMemo: b.destMemo
      });
      return json(res, result.error ? 400 : 200, result);
    })();
  }

  if (p === '/api/monetization/validate-address' && req.method === 'GET') {
    const address = url.searchParams.get('address');
    const network = url.searchParams.get('network');
    if (!address || !network) return json(res, 400, { error: 'address and network are required' });
    return json(res, 200, validateAddress(address, network));
  }

  // Creator studio: per-video economics for the signed-in creator.
  if (p === '/api/monetization/studio' && req.method === 'GET') {
    const a = auth(req);
    const handleParam = url.searchParams.get('handle');
    let ownerId = a ? a.userId : null;
    if (handleParam) {
      const ch = db.prepare('SELECT owner_id FROM channels WHERE handle=?').get(handleParam);
      if (!ch) return json(res, 404, { error: 'channel not found' });
      ownerId = ch.owner_id;
    }
    if (!ownerId) return json(res, 401, { error: 'unauthorized' });
    const videos = db.prepare(`
      SELECT v.id, v.title, v.views, v.likes, v.completions, v.watch_seconds, v.is_short, v.created_at,
             COALESCE((SELECT SUM(amount_micro) FROM reward_ledger r
                       WHERE r.video_id = v.id AND r.role='creator' AND r.status='credited'), 0) AS earned_micro
      FROM videos v WHERE v.channel_id = (SELECT id FROM channels WHERE owner_id=?)
      ORDER BY v.created_at DESC LIMIT 100`).all(ownerId);
    const totals = videos.reduce((acc, v) => {
      acc.views += v.views || 0;
      acc.likes += v.likes || 0;
      acc.completions += v.completions || 0;
      acc.watchSeconds += v.watch_seconds || 0;
      acc.earnedMicro += v.earned_micro || 0;
      return acc;
    }, { views: 0, likes: 0, completions: 0, watchSeconds: 0, earnedMicro: 0 });
    const rpuMicro = totals.views > 0 ? Math.round(totals.earnedMicro / totals.views) : 0;
    return json(res, 200, {
      videos: videos.map((v) => ({
        id: v.id, title: v.title, views: v.views, likes: v.likes,
        completions: v.completions, watchSeconds: Math.round(v.watch_seconds || 0),
        isShort: !!v.is_short, createdAt: v.created_at,
        earnedNst: microToNst(v.earned_micro)
      })),
      totals: {
        videos: videos.length,
        views: totals.views,
        likes: totals.likes,
        completions: totals.completions,
        watchHours: Math.round((totals.watchSeconds / 3600) * 100) / 100,
        earnedNst: microToNst(totals.earnedMicro),
        // Unit economics (Item 33)
        revenuePerThousandViewsNst: microToNst(rpuMicro * 1000),
        revenuePerViewNst: microToNst(rpuMicro),
        completionRate: totals.views > 0 ? Math.round((totals.completions / totals.views) * 1000) / 1000 : 0
      },
      config: publicConfig()
    });
  }

  return false;
}

module.exports = { init, handle, publicConfig, CONFIG, RATES, RATES_VERSION };
