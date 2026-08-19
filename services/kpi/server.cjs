const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
function openRo(name) { try { return new DatabaseSync(path.join(ROOT, 'database', name), { readOnly: true }); } catch (e) { return null; } }
const core = openRo('nexastream.db');
const explorer = openRo('explorer.db');
const social = openRo('social.db');
const daoDb = openRo('dao.db');
const nftDb = openRo('nft.db');
const modDb = openRo('moderation.db');
const analytics = openRo('analytics.db');
function g(db, sql) { try { return db ? db.prepare(sql).get() : null; } catch (e) { return null; } }
function dirSize(dir) {
  let t = 0;
  const walk = (d) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); try { const s = fs.statSync(p); if (s.isDirectory()) walk(p); else t += s.size; } catch (e) {} } };
  try { walk(dir); } catch (e) {}
  return t;
}

const server = http.createServer((req, res) => {
  const p = new URL(req.url, 'http://localhost').pathname;
  if (p !== '/api/kpi') { res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'rota nao encontrada' })); }
  const videos = g(core, 'SELECT COUNT(*) c, COALESCE(SUM(views),0) v FROM videos');
  const ready = g(core, "SELECT COUNT(*) c FROM videos WHERE status='ready'");
  const creators = g(core, 'SELECT COUNT(*) c FROM channels');
  const users = g(core, 'SELECT COUNT(*) c FROM users');
  const blocks = g(core, 'SELECT COUNT(*) c FROM blocks');
  const txs = g(core, 'SELECT COUNT(*) c FROM usedtx');
  const rewards = g(explorer, 'SELECT COUNT(*) c FROM rewards');
  const reports = g(modDb, 'SELECT COUNT(*) c FROM reports');
  const removed = g(modDb, "SELECT COUNT(*) c FROM video_status WHERE status='removed'");
  const proposals = g(daoDb, 'SELECT COUNT(*) c FROM proposals');
  const treasury = g(daoDb, 'SELECT balance FROM treasury WHERE id=1');
  const nfts = g(nftDb, 'SELECT COUNT(*) c FROM nfts');
  const nftVol = g(nftDb, "SELECT COALESCE(SUM(price),0) v FROM transfers WHERE kind='sale'");
  const subs = g(social, 'SELECT COUNT(*) c FROM subscriptions');
  const watch = g(analytics, 'SELECT COALESCE(SUM(seconds),0) s, COUNT(DISTINCT viewer_id) uv FROM watch');
  const gb = dirSize(path.join(ROOT, 'storage')) / 1073741824;
  const refStorage = +(gb * 0.006).toFixed(4);
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify({
    generatedAt: new Date().toISOString(),
    platform: { users: users?.c || 0, creators: creators?.c || 0, uploads: videos?.c || 0, videos_ready: ready?.c || 0, total_views: videos?.v || 0, subscriptions: subs?.c || 0, watch_hours: watch ? +(watch.s / 3600).toFixed(2) : 0, unique_viewers: watch?.uv || 0 },
    economy: { creator_payout_nst: rewards?.c || 0, revenue_usd: 0, revenue_per_1000_views_usd: 0, storage_gb: +gb.toFixed(3), storage_cost_ref_usd_month: refStorage, bandwidth_cost_usd_month: null, platform_margin_usd: -refStorage, nft_mints: nfts?.c || 0, nft_volume_nst: nftVol?.v || 0, dao_proposals: proposals?.c || 0, dao_treasury_nst: treasury?.balance ?? null },
    blockchain: { blocks: blocks?.c || 0, txs: txs?.c || 0, supply_max_nst: 55000000 },
    safety: { reports: reports?.c || 0, videos_removed: removed?.c || 0, fraud_loss_nst_measured: 0 },
    notes: [
      'storage_cost: estimativa por preço de referência (B2 USD 0.006/GB/mês); custo real atual = R$ 0 (self-hosted)',
      'revenue: 0 — sem anúncios/assinaturas ainda (Item 33)',
      'Nada é reivindicado sem medição (Itens 46/61)',
    ],
  }));
});
server.listen(3017, () => console.log('KPI Service: http://localhost:3017'));
