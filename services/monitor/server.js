const http = require('node:http');
const os = require('node:os');
const fs = require('node:fs');
const path = require('node:path');

// ---------------------------------------------------------------------------
// Observability Layer (Item 27) — Structured logging + Metrics + Health
// Zero external dependencies: node:http + node:os + node:fs only
// ---------------------------------------------------------------------------

const ROOT = path.resolve(__dirname, '../..');
const START = Date.now();
const history = [];
const ALERTS = [];
const MAX_HISTORY = 100;
const MAX_ALERTS = 50;

// Structured logger (JSON lines — Item 27)
function log(level, message, extra = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    service: 'monitor',
    msg: message,
    ...extra
  };
  const line = JSON.stringify(entry);
  if (level === 'error' || level === 'warn') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
  return entry;
}

// Alert thresholds (Item 27)
const THRESHOLDS = {
  cpuLoad: 0.8 * os.cpus().length,   // 80% of CPU count
  ramFreePercent: 0.15,               // <15% free RAM
  diskFreePercent: 0.10,              // <10% free disk
  serviceLatencyMs: 5000,             // >5s response time
  serviceDown: true,                   // any service down
  processRSSMB: 512,                   // >512MB process RSS
};

function checkAlerts(metrics) {
  const newAlerts = [];
  
  // CPU load alert
  const loadAvg = metrics.system.loadAvg[0];
  if (loadAvg > THRESHOLDS.cpuLoad) {
    newAlerts.push({
      severity: 'critical',
      type: 'cpu',
      message: `CPU load ${loadAvg} exceeds threshold ${THRESHOLDS.cpuLoad.toFixed(1)}`,
      ts: new Date().toISOString()
    });
  }
  
  // RAM alert
  const ramUsedPercent = 1 - (metrics.system.ramFreeMB / metrics.system.ramTotalMB);
  if (ramUsedPercent > (1 - THRESHOLDS.ramFreePercent)) {
    newAlerts.push({
      severity: 'warning',
      type: 'memory',
      message: `RAM usage ${Math.round(ramUsedPercent * 100)}% — only ${metrics.system.ramFreeMB}MB free`,
      ts: new Date().toISOString()
    });
  }
  
  // Disk alert
  if (metrics.system.disk) {
    const diskUsedPercent = 1 - (metrics.system.disk.free / metrics.system.disk.total);
    if (diskUsedPercent > (1 - THRESHOLDS.diskFreePercent)) {
      newAlerts.push({
        severity: 'warning',
        type: 'disk',
        message: `Disk usage ${Math.round(diskUsedPercent * 100)}%`,
        ts: new Date().toISOString()
      });
    }
  }
  
  // Service health alerts
  for (const [name, svc] of Object.entries(metrics.services)) {
    if (!svc.up) {
      newAlerts.push({
        severity: 'critical',
        type: 'service_down',
        service: name,
        message: `Service ${name} is DOWN`,
        ts: new Date().toISOString()
      });
    } else if (svc.latencyMs > THRESHOLDS.serviceLatencyMs) {
      newAlerts.push({
        severity: 'warning',
        type: 'high_latency',
        service: name,
        message: `Service ${name} latency ${svc.latencyMs}ms > ${THRESHOLDS.serviceLatencyMs}ms`,
        ts: new Date().toISOString()
      });
    }
  }
  
  // Process RSS alert
  if (metrics.process.rssMB > THRESHOLDS.processRSSMB) {
    newAlerts.push({
      severity: 'warning',
      type: 'memory_leak',
      message: `Process RSS ${metrics.process.rssMB}MB > ${THRESHOLDS.processRSSMB}MB`,
      ts: new Date().toISOString()
    });
  }
  
  // Store alerts
  for (const alert of newAlerts) {
    ALERTS.push(alert);
    log(alert.severity === 'critical' ? 'error' : 'warn', alert.message, { type: alert.type, service: alert.service });
  }
  
  if (ALERTS.length > MAX_ALERTS) ALERTS.splice(0, ALERTS.length - MAX_ALERTS);
  
  return newAlerts;
}

function disk() {
  try { const s = fs.statfsSync(ROOT); return { total: s.blocks * s.bsize, free: s.bfree * s.bsize }; } catch { return null; }
}

function dirSize(dir) {
  let total = 0;
  const walk = (d) => {
    try {
      for (const name of fs.readdirSync(d)) {
        const p = path.join(d, name);
        try { const st = fs.statSync(p); if (st.isDirectory()) walk(p); else total += st.size; } catch {}
      }
    } catch {}
  };
  try { walk(dir); } catch {}
  return total;
}

async function probe(url, timeoutMs = 3000) {
  const t0 = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const r = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    let data = null;
    try { data = await r.json(); } catch {}
    return { up: r.ok, latencyMs: Date.now() - t0, data };
  } catch { return { up: false, latencyMs: Date.now() - t0, data: null }; }
}

async function collect() {
  log('info', 'collecting metrics');
  
  const [core, chain, explorer, content, auth, monitor] = await Promise.all([
    probe('http://localhost:3002/api/health'),
    probe('http://localhost:3008/api/chain'),
    probe('http://localhost:3009/api/explorer'),
    probe('http://localhost:3004/api/content/dedup'),
    probe('http://localhost:3001/api/auth/login', 2000).catch(() => ({ up: false, latencyMs: 0, data: null })),
    probe('http://localhost:3010/api/metrics', 2000).catch(() => ({ up: false, latencyMs: 0, data: null })),
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

  const servicesUp = [core, chain, explorer, content].filter(s => s.up).length;
  const servicesTotal = 4;

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
      core: { up: core.up, latencyMs: core.latencyMs },
      auth: { up: auth.up, latencyMs: auth.latencyMs },
      chain: { up: chain.up, latencyMs: chain.latencyMs },
      explorer: { up: explorer.up, latencyMs: explorer.latencyMs },
      content: { up: content.up, latencyMs: content.latencyMs },
      monitor: { up: monitor.up || true, latencyMs: 0 },
    },
    health: {
      servicesUp,
      servicesTotal,
      status: servicesUp === servicesTotal ? 'healthy' : servicesUp > 0 ? 'degraded' : 'critical'
    },
    blockchain,
    process: { rssMB: Math.round(process.memoryUsage().rss / 1048576) },
  };

  // Check alerts
  const newAlerts = checkAlerts(m);
  m.alerts = { active: ALERTS.slice(-10), newCount: newAlerts.length };

  history.push(m);
  if (history.length > MAX_HISTORY) history.shift();
  
  // Log collection summary
  log('info', 'metrics collected', {
    servicesUp,
    servicesTotal,
    healthStatus: m.health.status,
    alerts: newAlerts.length
  });
  
  return m;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  });
  
  if (p === '/api/metrics') {
    return res.end(JSON.stringify(await collect()));
  }
  
  if (p === '/api/metrics/history') {
    return res.end(JSON.stringify(history));
  }
  
  if (p === '/api/alerts') {
    const severity = url.searchParams.get('severity');
    const filtered = severity ? ALERTS.filter(a => a.severity === severity) : ALERTS;
    return res.end(JSON.stringify({ alerts: filtered, total: ALERTS.length }));
  }
  
  if (p === '/api/health') {
    const latest = history[history.length - 1] || await collect();
    return res.end(JSON.stringify({
      status: latest.health?.status || 'unknown',
      uptime: latest.uptimeS,
      services: latest.health
    }));
  }
  
  if (p === '/api/health/deep') {
    // Deep health check — probe all services live
    const checks = {};
    const services = {
      core: 'http://localhost:3002/api/health',
      chain: 'http://localhost:3008/api/chain',
      explorer: 'http://localhost:3009/api/explorer',
      content: 'http://localhost:3004/api/content/dedup',
    };
    for (const [name, url] of Object.entries(services)) {
      checks[name] = await probe(url);
    }
    const allUp = Object.values(checks).every(c => c.up);
    return res.end(JSON.stringify({
      status: allUp ? 'healthy' : 'degraded',
      checks
    }));
  }
  
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'rota nao encontrada' }));
});

setInterval(() => { collect().catch((e) => log('error', 'collect failed', { error: e.message })); }, 15000);
server.listen(process.env.PORT || 3010, () => log('info', `Observability started on port ${process.env.PORT || 3010}`));
