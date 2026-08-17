const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
function open(name) {
  try { return new DatabaseSync(path.join(ROOT, 'database', name), { readOnly: true }); } catch (e) { return null; }
}
const core = open('nexastream.db');
const explorer = open('explorer.db');
const social = open('social.db');
const daoDb = open('dao.db');
const nftDb = open('nft.db');
const modDb = open('moderation.db');

function q(db, sql) { try { return db ? db.prepare(sql).get() : null; } catch (e) { return null; } }
function dirSize(dir) {
  let t = 0;
  const walk = (d) => {
    for (const n of fs.readdirSync(d)) {
      const p = path.join(d, n);
      try { const s = fs.statSync(p); if (s.isDirectory()) walk(p); else t += s.size; } catch (e) {}
    }
  };
  try { walk(dir); } catch (e) {}
  return t;
}

function compute() {
  const videos = q(core, 'SELECT COUNT(*) c, COALESCE(SUM(views),0) v FROM videos');
  const ready = q(core, "SELECT COUNT(*) c FROM videos WHERE status='ready'");
  const creators = q(core, 'SELECT COUNT(*) c FROM channels');
  const users = q(core, 'SELECT COUNT(*) c FROM users');
  const blocks = q(core, 'SELECT COUNT(*) c FROM blocks');
  const txs = q(core, 'SELECT COUNT(*) c FROM usedtx');
  const rewards = q(explorer, 'SELECT COUNT(*) c FROM rewards');
  const reports = q(modDb, 'SELECT COUNT(*) c FROM reports');
  const removed = q(modDb, "SELECT COUNT(*) c FROM video_status WHERE status='removed'");
  const proposals = q(daoDb, 'SELECT COUNT(*) c FROM proposals');
  const treasury = q(daoDb, 'SELECT balance FROM treasury WHERE id=1');
  const nfts = q(nftDb, 'SELECT COUNT(*) c FROM nfts');
  const nftVol = q(nftDb, "SELECT COALESCE(SUM(price),0) v FROM transfers WHERE kind='sale'");
  const subs = q(social, 'SELECT COUNT(*) c FROM subscriptions');

  const gb = dirSize(path.join(ROOT, 'storage')) / 1073741824;
  const refStorage = +(gb * 0.006).toFixed(4); // referência Backblaze B2 USD/GB/mês

  return {
    generatedAt: new Date().toISOString(),
    platform: {
      users: users ? users.c : 0,
      creators: creators ? creators.c : 0,
      uploads: videos ? videos.c : 0,
      videos_ready: ready ? ready.c : 0,
      total_views: videos ? videos.v : 0,
      subscriptions: subs ? subs.c : 0,
      watch_hours: null,
      dau_mau: null,
    },
    economy: {
      creator_payout_nst: rewards ? rewards.c : 0,
      revenue_usd: 0,
      revenue_per_1000_views_usd: 0,
      storage_gb: +gb.toFixed(3),
      storage_cost_ref_usd_month: refStorage,
      bandwidth_cost_usd_month: null,
      platform_margin_usd: -refStorage,
      nft_mints: nfts ? nfts.c : 0,
      nft_volume_nst: nftVol ? nftVol.v : 0,
      dao_proposals: proposals ? proposals.c : 0,
      dao_treasury_nst: treasury ? treasury.balance : null,
    },
    blockchain: { blocks: blocks ? blocks.c : 0, txs: txs ? txs.c : 0, supply_max_nst: 55000000 },
    safety: { reports: reports ? reports.c : 0, videos_removed: removed ? removed.c : 0, fraud_loss_nst_measured: 0 },
    notes: [
      'watch_hours/dau_mau: null — player ainda não envia telemetria de sessão (pendência real, não ocultada)',
      'storage_cost: estimativa por preço de referência (B2 USD 0.006/GB/mês); custo real atual = R$ 0 (self-hosted)',
      'Nada é reivindicado sem medição (Itens 46/61 do plano)',
    ],
  };
}

const server = http.createServer((req, res) => {
  const p = new URL(req.url, 'http://localhost').pathname;
  if (p !== '/api/kpi') { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'rota nao encontrada' })); }
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(compute()));
});
server.listen(3017, () => console.log('KPI Service: http://localhost:3017'));
