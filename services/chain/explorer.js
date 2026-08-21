// ---------------------------------------------------------------------------
// NexaStream Explorer + Creator Economy — MAINNET
// Port 3009 | Zero npm deps (node:http + node:crypto + node:sqlite)
//
// Features:
//   - Block explorer (height, hash, txs, miner)
//   - Transaction lookup by ID
//   - Address balance + history
//   - Creator wallet binding
//   - Creator rewards (1 NST per viewer/video, anti-fraud)
//   - Chain statistics
// ---------------------------------------------------------------------------

const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
const chain = new DatabaseSync(path.join(ROOT, 'database', 'nexastream.db'), { readOnly: true });
const exp = new DatabaseSync(path.join(ROOT, 'database', 'explorer.db'));

exp.exec(`
  CREATE TABLE IF NOT EXISTS binds(username TEXT PRIMARY KEY, address TEXT, created_at INTEGER DEFAULT (strftime('%s','now')*1000));
  CREATE TABLE IF NOT EXISTS rewards(
    id TEXT PRIMARY KEY, video_id TEXT, viewer TEXT, creator TEXT,
    tx_id TEXT, amount REAL, created_at INTEGER DEFAULT (strftime('%s','now')*1000)
  );
  CREATE TABLE IF NOT EXISTS reward_limits(
    video_id TEXT, viewer TEXT, PRIMARY KEY(video_id, viewer)
  );
`);

const REWARD = 1;
const REWARD_CAP = 100;

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

function treasury() {
  const g = chain.prepare('SELECT txs FROM blocks WHERE idx=0').get();
  return JSON.parse(g.txs)[0].to;
}

// --- API Routes ---
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const body = req.method === 'POST' ? JSON.parse(await readBody(req) || '{}') : {};

  // --- Block Explorer ---
  if (p === '/api/explorer') {
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const blocks = chain.prepare('SELECT idx, hash, prev, miner, ts, nonce, difficulty, txs FROM blocks ORDER BY idx DESC LIMIT ?').all(limit);
    return json(res, 200, {
      network: 'mainnet',
      height: blocks.length ? blocks[0].idx : 0,
      blocks: blocks.map(b => ({ ...b, txs: JSON.parse(b.txs), txCount: JSON.parse(b.txs).length }))
    });
  }

  // Block detail by height
  const mb = p.match(/^\/api\/explorer\/block\/(\d+)$/);
  if (mb) {
    const b = chain.prepare('SELECT * FROM blocks WHERE idx=?').get(parseInt(mb[1]));
    if (!b) return json(res, 404, { error: 'bloco nao encontrado' });
    const txs = JSON.parse(b.txs);
    // Enrich txs with from/to balance info
    const enriched = txs.map(tx => {
      if (tx.type === 'genesis') return { ...tx, fromLabel: 'GENESIS' };
      const fromBal = chain.prepare('SELECT amount FROM balances WHERE address=?').get(tx.from);
      const toBal = chain.prepare('SELECT amount FROM balances WHERE address=?').get(tx.to);
      return {
        ...tx, fromBalance: fromBal ? fromBal.amount : 0, toBalance: toBal ? toBal.amount : 0
      };
    });
    return json(res, 200, { block: { ...b, txs: enriched } });
  }

  // --- Transaction Lookup ---
  const mtx = p.match(/^\/api\/explorer\/tx\/([\w-]+)$/);
  if (mtx) {
    const txId = mtx[1];
    // Search all blocks for this tx
    const blocks = chain.prepare('SELECT idx, ts, txs FROM blocks ORDER BY idx DESC').all();
    for (const b of blocks) {
      const txs = JSON.parse(b.txs);
      const found = txs.find(tx => tx.id === txId || tx.sig === txId);
      if (found) {
        return json(res, 200, {
          tx: found,
          block: b.idx,
          blockTs: b.ts,
          confirmations: blocks[0].idx - b.idx + 1
        });
      }
    }
    return json(res, 404, { error: 'transacao nao encontrada' });
  }

  // --- Address / Balance ---
  const maddr = p.match(/^\/api\/explorer\/address\/([\w]+)$/);
  if (maddr) {
    const addr = maddr[1];
    const bal = chain.prepare('SELECT amount FROM balances WHERE address=?').get(addr);
    const wallet = chain.prepare('SELECT created_at FROM wallets WHERE address=?').get(addr);
    const stake = chain.prepare('SELECT * FROM stakes WHERE address=? AND amount > 0').get(addr);
    return json(res, 200, {
      address: addr,
      balance: bal ? bal.amount : 0,
      exists: !!wallet,
      createdAt: wallet ? wallet.created_at : null,
      staked: stake ? stake.amount : 0,
      delegator: stake ? stake.delegator : null
    });
  }

  // --- Balances Leaderboard ---
  if (p === '/api/explorer/balances') {
    const limit = parseInt(url.searchParams.get('limit') || '50');
    return json(res, 200, {
      balances: chain.prepare('SELECT * FROM balances WHERE amount > 0 ORDER BY amount DESC LIMIT ?').all(limit)
    });
  }

  // --- Wallet Binding ---
  if (p === '/api/explorer/bind' && req.method === 'POST') {
    if (!body.username || !body.address) return json(res, 400, { error: 'username e address obrigatorios' });
    exp.prepare('INSERT OR REPLACE INTO binds (username, address) VALUES (?,?)').run(body.username, body.address);
    return json(res, 200, { ok: true, username: body.username, address: body.address });
  }

  if (p === '/api/explorer/binds') {
    return json(res, 200, {
      bindings: exp.prepare('SELECT * FROM binds ORDER BY created_at DESC LIMIT 50').all()
    });
  }

  const mbind = p.match(/^\/api\/explorer\/bind\/([\w-]+)$/);
  if (mbind) {
    const bind = exp.prepare('SELECT * FROM binds WHERE username=?').get(mbind[1]);
    return json(res, 200, bind || { username: mbind[1], address: null });
  }

  // --- Creator Rewards (anti-fraud: 1 viewer/video, cap 100) ---
  if (p === '/api/explorer/reward' && req.method === 'POST') {
    const { videoId, viewerId } = body;
    if (!videoId || !viewerId) return json(res, 400, { error: 'videoId e viewerId obrigatorios' });

    // Anti-fraud: 1 reward per viewer per video
    if (exp.prepare('SELECT 1 FROM reward_limits WHERE video_id=? AND viewer=?').get(videoId, viewerId)) {
      return json(res, 429, { error: 'viewer ja recompensou este video (anti-fraud: 1/viewer/video)' });
    }

    // Anti-fraud: cap 100 rewards per video
    const count = exp.prepare('SELECT COUNT(*) c FROM reward_limits WHERE video_id=?').get(videoId).c;
    if (count >= REWARD_CAP) {
      return json(res, 429, { error: 'teto de ' + REWARD_CAP + ' recompensas do video atingido' });
    }

    // Find video creator
    const video = chain.prepare('SELECT c.name FROM videos v LEFT JOIN channels c ON c.id=v.channel_id WHERE v.id=?').get(videoId);
    if (!video) return json(res, 404, { error: 'video nao encontrado' });

    // Find creator's NST wallet
    const bind = exp.prepare('SELECT address FROM binds WHERE username=?').get(video.name);
    if (!bind) return json(res, 404, { error: 'criador ainda nao vinculou carteira NST' });

    // Execute reward transaction
    const tAddr = treasury();
    const tr = chain.prepare('SELECT privkey FROM wallets WHERE address=?').get(tAddr);
    const r = await fetch('http://localhost:3008/api/chain/tx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: tAddr, to: bind.address, amount: REWARD, privateKey: tr.privkey })
    });
    const d = await r.json();
    if (d.error) return json(res, 500, d);

    // Record reward + limit
    exp.prepare('INSERT INTO rewards (id, video_id, viewer, creator, tx_id, amount) VALUES (?,?,?,?,?,?)')
      .run(crypto.randomUUID(), videoId, viewerId, bind.address, d.txId, REWARD);
    exp.prepare('INSERT OR IGNORE INTO reward_limits (video_id, viewer) VALUES (?,?)')
      .run(videoId, viewerId);

    return json(res, 200, {
      reward: REWARD, to: bind.address, txId: d.txId,
      status: 'mempool (aguardando mineracao)',
      anti_fraud: { limit_per_viewer: 1, cap_per_video: REWARD_CAP, viewer_count: count + 1 }
    });
  }

  // --- Reward History ---
  if (p === '/api/explorer/rewards') {
    const limit = parseInt(url.searchParams.get('limit') || '50');
    return json(res, 200, {
      rewards: exp.prepare('SELECT * FROM rewards ORDER BY created_at DESC LIMIT ?').all(limit)
    });
  }

  // --- Chain Stats ---
  if (p === '/api/explorer/stats') {
    const height = chain.prepare('SELECT MAX(idx) h FROM blocks').get().h || 0;
    const totalTxs = chain.prepare('SELECT COUNT(*) c FROM usedtx').get().c || 0;
    const totalRewards = exp.prepare('SELECT COUNT(*) c, SUM(amount) s FROM rewards').get();
    const bindings = exp.prepare('SELECT COUNT(*) c FROM binds').get().c;
    const wallets = chain.prepare('SELECT COUNT(*) c FROM wallets').get().c;
    const balances = chain.prepare('SELECT COUNT(*) c FROM balances WHERE amount > 0').get().c;
    const mempool = chain.prepare('SELECT COUNT(*) c FROM mempool').get().c;

    // Block time stats
    const recent = chain.prepare('SELECT ts FROM blocks ORDER BY idx DESC LIMIT 11').all();
    let avgBlockTime = 0;
    if (recent.length > 1) {
      avgBlockTime = (recent[0].ts - recent[recent.length - 1].ts) / (recent.length - 1);
    }

    return json(res, 200, {
      network: 'mainnet', height, totalWallets: wallets, activeAddresses: balances,
      mempoolSize: mempool, avgBlockTimeMs: Math.round(avgBlockTime),
      rewards: { count: totalRewards.c || 0, totalNST: totalRewards.s || 0 },
      bindings, consensus: 'PoW-secp256k1'
    });
  }

  if (p === '/api/health') {
    const height = chain.prepare('SELECT MAX(idx) h FROM blocks').get().h || 0;
    return json(res, 200, { ok: true, service: 'explorer', network: 'mainnet', height });
  }

  json(res, 404, { error: 'rota nao encontrada' });
});

server.listen(process.env.PORT || 3009, () => {
  console.log('Explorer + Creator Economy MAINNET: http://localhost:' + (process.env.PORT || 3009));
});
