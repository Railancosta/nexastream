const http = require('node:http');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const START = Date.now();
const history = [];

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}

function disk() {
  try { const s = fs.statfsSync(ROOT); return { total: s.blocks * s.bsize, free: s.bfree * s.bsize }; } catch { return null; }
}

function dirSize(dir) {
  let total = 0;
  const walk = (d) => {
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name);
      try { const st = fs.statSync(p); if (st.isDirectory()) walk(p); else total += st.size; } catch {}
    }
  };
  try { walk(dir); } catch {}
  return total;
}

async function probe(url) {
  const t0 = Date.now();
  try {
    const r = await fetch(url);
    let data = null;
    try { data = await r.json(); } catch {}
    return { up: r.ok, latency: Date.now() - t0, data };
  } catch { return { up: false, latency: Date.now() - t0, data: null }; }
}

async function collect() {
  const [core, chain, explorer, content] = await Promise.all([
    probe('http://localhost:3002/api/health'),
    probe('http://localhost:3008/api/chain'),
    probe('http://localhost:3009/api/explorer'),
    probe('http://localhost:3004/api/content/dedup'),
  ]);

  const blockchain = { height: null, avgBlockTimeMs: null, recentTxs: null };
  if (chain.up && chain.data) blockchain.height = chain.data.height;
  if (explorer.up && explorer.data && explorer.data.blocks) {
    const bs = explorer.data.blocks.slice().sort((a, b) => a.idx - b.idx);
    if (bs.length > 1) {
      let sum = 0;
      for (let i = 1; i < bs.length; i++) sum += bs[i].ts - bs[i - 1].ts;
      blockchain.avgBlockTimeMs = Math.round(sum / (bs.length - 1));
    }
    blockchain.recentTxs = bs.reduce((a, b) => a + (b.txs || []).length, 0);
  }

  const m = {
    ts: new Date().toISOString(),
    uptimeS: Math.floor((Date.now() - START) / 1000),
    system: {
      platform: os.platform() + '/' + os.arch(),
      node: process.version,
      cpus: os.cpus().length,
      loadAvg: os.loadavg().map(x => +x.toFixed(2)),
      ramTotalMB: Math.round(os.totalmem() / 1048576),
      ramFreeMB: Math.round(os.freemem() / 1048576),
      disk: disk(),
    },
    storageBytes: dirSize(path.join(ROOT, 'storage')),
    services: {
      core: { up: core.up, latencyMs: core.latency },
      chain: { up: chain.up, latencyMs: chain.latency },
      explorer: { up: explorer.up, latencyMs: explorer.latency },
      content: { up: content.up, latencyMs: content.latency },
    },
    blockchain,
    process: { rssMB: Math.round(process.memoryUsage().rss / 1048576) },
  };
  history.push(m);
  if (history.length > 40) history.shift();
  return m;
}

const server = http.createServer(async (req, res) => {
  const p = new URL(req.url, 'http://localhost').pathname;
  if (p === '/api/metrics') return json(res, 200, await collect());
  if (p === '/api/metrics/history') return json(res, 200, history);
  json(res, 404, { error: 'rota nao encontrada' });
});

setInterval(() => { collect().catch(() => {}); }, 15000);
server.listen(3010, () => console.log('Observability: http://localhost:3010'));
