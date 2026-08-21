// ---------------------------------------------------------------------------
// Content Moderation Service (Items 29, 31) — Reports + Auto-classify + Appeals + Audit
// Port 3014 | Zero npm dependencies (node:http + node:sqlite + node:crypto)
// ---------------------------------------------------------------------------

const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
const db = new DatabaseSync(path.join(ROOT, 'database', 'moderation.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS reports(
    id TEXT PRIMARY KEY, target_type TEXT, target_id TEXT, reason TEXT,
    reporter TEXT, status TEXT DEFAULT 'open', severity TEXT DEFAULT 'low',
    category TEXT DEFAULT 'unknown', auto_classified INTEGER DEFAULT 0,
    created_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS video_status(
    video_id TEXT PRIMARY KEY, status TEXT DEFAULT 'ok',
    report_count INTEGER DEFAULT 0, last_action TEXT,
    updated_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS appeals(
    id TEXT PRIMARY KEY, video_id TEXT, creator TEXT, reason TEXT,
    status TEXT DEFAULT 'open', resolution TEXT,
    created_at INTEGER, resolved_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS audit(
    id TEXT PRIMARY KEY, action TEXT, actor TEXT, target TEXT,
    note TEXT, severity TEXT, created_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS creator_enforcement(
    id TEXT PRIMARY KEY, creator TEXT, action TEXT, reason TEXT,
    duration INTEGER, expires_at INTEGER, created_at INTEGER
  );
`);

// --- AUTO-CLASSIFICATION (Item 29) ---
// Keyword-based content classification (zero-cost, no ML required)
const CATEGORY_RULES = [
  {
    category: 'spam',
    keywords: [/\b(spam|buy now|click here|free money|earn \$|make money fast)\b/i, /(.)\1{10,}/, /https?:\/\/\S+\s+https?:\/\/\S+\s+https?:\/\/\S+/],
    severity: 'medium'
  },
  {
    category: 'violence',
    keywords: [/\b(kill|murder|shoot|stab|bomb)\b.*\b(you|him|her|them|people)\b/i],
    severity: 'high'
  },
  {
    category: 'hate_speech',
    keywords: [/\b(nigger|faggot|retard|cripple)\b/i],
    severity: 'high'
  },
  {
    category: 'harassment',
    keywords: [/\b(kys|kill yourself|go die|ugly|fat.*bitch|worthless)\b/i],
    severity: 'high'
  },
  {
    category: 'misinformation',
    keywords: [/\b(vaccine.*kill|5g.*track|flat earth|cure.*cancer.*guaranteed)\b/i],
    severity: 'medium'
  },
  {
    category: 'scam',
    keywords: [/\b(send.*btc|send.*nano|guaranteed.*return|invest.*10x|risk.free)\b/i],
    severity: 'high'
  },
  {
    category: 'sexual_content',
    keywords: [/\b(nsfw|xxx|porn|nude|onlyfans)\b/i],
    severity: 'medium'
  }
];

function classifyContent(text) {
  if (!text || typeof text !== 'string') return { category: 'unknown', severity: 'low', confidence: 0 };

  let maxSeverity = 'low';
  let matchedCategory = 'unknown';
  let confidence = 0;

  for (const rule of CATEGORY_RULES) {
    for (const kw of rule.keywords) {
      if (kw.test(text)) {
        matchedCategory = rule.category;
        confidence = 0.7; // keyword match confidence
        if (['high', 'critical'].includes(rule.severity)) {
          maxSeverity = rule.severity;
        } else if (maxSeverity === 'low') {
          maxSeverity = rule.severity;
        }
        break;
      }
    }
    if (matchedCategory !== 'unknown') break;
  }

  return { category: matchedCategory, severity: maxSeverity, confidence };
}

// --- DB HELPERS ---
const AUTO_REVIEW_THRESHOLD = 3;
const AUTO_REMOVE_THRESHOLD = 10;

const rate = new Map();
function limited(k, max, win) {
  const n = Date.now();
  const a = (rate.get(k) || []).filter(t => n - t < win);
  a.push(n);
  rate.set(k, a);
  return a.length > max;
}

function json(res, c, o) {
  res.writeHead(c, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  });
  res.end(JSON.stringify(o));
}

function readBody(req) {
  return new Promise((res, rej) => {
    const c = []; let n = 0;
    req.on('data', d => { n += d.length; if (n > 1e6) req.destroy(); else c.push(d); });
    req.on('end', () => res(Buffer.concat(c).toString()));
    req.on('error', rej);
  });
}

function auditLog(action, actor, target, note, severity) {
  db.prepare('INSERT INTO audit VALUES (?,?,?,?,?,?,?)').run(
    crypto.randomUUID(), action, actor, target, note || '', severity || 'info', Date.now()
  );
}

function setStatus(videoId, status, action) {
  db.prepare(`INSERT INTO video_status (video_id, status, report_count, last_action, updated_at)
    VALUES (?, ?, 1, ?, ?) ON CONFLICT(video_id) DO UPDATE SET
    status=excluded.status, report_count=report_count+1, last_action=excluded.last_action, updated_at=excluded.updated_at`
  ).run(videoId, status, action || 'updated', Date.now());
}

function getStatus(videoId) {
  const r = db.prepare('SELECT * FROM video_status WHERE video_id=?').get(videoId);
  return r || { status: 'ok', report_count: 0 };
}

// --- SERVER ---
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const body = req.method === 'POST' ? JSON.parse(await readBody(req) || '{}') : {};

  // --- REPORT (Item 29) ---
  if (p === '/api/mod/report' && req.method === 'POST') {
    const { targetType, targetId, reason, reporter } = body;
    if (!targetType || !targetId || !reason) return json(res, 400, { error: 'campos obrigatorios' });
    if (limited('r:' + (reporter || 'anon'), 10, 60000)) return json(res, 429, { error: 'rate limit: 10 reports/min' });

    // Auto-classify content
    const classification = classifyContent(reason);
    const autoClassified = classification.category !== 'unknown' ? 1 : 0;

    db.prepare('INSERT INTO reports VALUES (?,?,?,?,?,?,?,?,?)').run(
      crypto.randomUUID(), targetType, targetId,
      String(reason).slice(0, 500), reporter || 'anon', 'open',
      classification.severity, classification.category, autoClassified, Date.now()
    );
    auditLog('report', reporter || 'anon', targetId, reason, classification.severity);

    // Auto-review threshold
    const reportCount = db.prepare("SELECT COUNT(*) c FROM reports WHERE target_id=? AND status='open'").get(targetId).c;

    if (targetType === 'video') {
      const current = getStatus(targetId);
      if (reportCount >= AUTO_REVIEW_THRESHOLD && current.status === 'ok') {
        setStatus(targetId, 'review', 'auto_review');
        auditLog('auto_review', 'system', targetId, `threshold ${AUTO_REVIEW_THRESHOLD} reached`, 'warning');
      }
      // Auto-remove for severe content with many reports
      if (reportCount >= AUTO_REMOVE_THRESHOLD && classification.severity === 'high') {
        setStatus(targetId, 'removed', 'auto_remove');
        auditLog('auto_remove', 'system', targetId, `${AUTO_REMOVE_THRESHOLD} reports + high severity`, 'critical');
      }
    }

    return json(res, 200, {
      ok: true, reports: reportCount,
      classification: { category: classification.category, severity: classification.severity, autoClassified: !!autoClassified }
    });
  }

  // --- ACTION (approve/remove) ---
  if (p === '/api/mod/action' && req.method === 'POST') {
    const { targetId, action, moderator } = body;
    if (action === 'approve') {
      setStatus(targetId, 'ok', 'approve');
      db.prepare("UPDATE reports SET status='resolved' WHERE target_id=? AND status='open'").run(targetId);
      auditLog('approve', moderator || 'mod', targetId, '', 'info');
      return json(res, 200, { ok: true, status: 'ok' });
    }
    if (action === 'remove') {
      setStatus(targetId, 'removed', 'remove');
      db.prepare("UPDATE reports SET status='resolved' WHERE target_id=? AND status='open'").run(targetId);
      auditLog('remove', moderator || 'mod', targetId, '', 'warning');
      return json(res, 200, { ok: true, status: 'removed' });
    }
    if (action === 'warn_creator') {
      db.prepare('INSERT INTO creator_enforcement VALUES (?,?,?,?,?,?,?)').run(
        crypto.randomUUID(), body.creator || 'unknown', 'warning', body.reason || '', 0, 0, Date.now()
      );
      auditLog('warn_creator', moderator || 'mod', body.creator || 'unknown', body.reason || '', 'warning');
      return json(res, 200, { ok: true });
    }
    if (action === 'suspend_creator') {
      const duration = Math.min(Math.max(body.duration || 86400, 3600), 2592000); // 1h to 30d
      db.prepare('INSERT INTO creator_enforcement VALUES (?,?,?,?,?,?,?)').run(
        crypto.randomUUID(), body.creator || 'unknown', 'suspension', body.reason || '',
        duration, Date.now() + duration * 1000, Date.now()
      );
      auditLog('suspend_creator', moderator || 'mod', body.creator || 'unknown', `duration=${duration}s`, 'critical');
      return json(res, 200, { ok: true, duration });
    }
    return json(res, 400, { error: 'acao invalida' });
  }

  // --- APPEALS (Item 31) ---
  if (p === '/api/mod/appeal' && req.method === 'POST') {
    const { videoId, creator, reason } = body;
    if (!videoId || !reason) return json(res, 400, { error: 'campos obrigatorios' });
    const current = getStatus(videoId);
    if (current.status !== 'removed') return json(res, 400, { error: 'so videos removidos podem apelar' });
    if (db.prepare("SELECT id FROM appeals WHERE video_id=? AND status='open'").get(videoId)) return json(res, 409, { error: 'apelacao ja aberta' });
    if (limited('a:' + (creator || 'anon'), 5, 3600000)) return json(res, 429, { error: 'rate limit de apelacoes' });
    const id = crypto.randomUUID();
    db.prepare('INSERT INTO appeals VALUES (?,?,?,?,?,?,?)').run(id, videoId, creator || 'anon', String(reason).slice(0, 500), 'open', null, Date.now(), null);
    auditLog('appeal', creator || 'anon', videoId, reason, 'info');
    return json(res, 200, { id, status: 'open' });
  }

  if (p === '/api/mod/appeal/resolve' && req.method === 'POST') {
    const { videoId, action, moderator } = body;
    const ap = db.prepare("SELECT * FROM appeals WHERE video_id=? AND status='open'").get(videoId);
    if (!ap) return json(res, 404, { error: 'apelacao nao encontrada' });
    if (action === 'restore') {
      setStatus(videoId, 'ok', 'appeal_restore');
      db.prepare("UPDATE appeals SET status='restored', resolved_at=?, resolution=? WHERE id=?").run(Date.now(), 'restored', ap.id);
      auditLog('appeal_restore', moderator || 'mod', videoId, '', 'info');
      return json(res, 200, { ok: true, status: 'ok' });
    }
    if (action === 'uphold') {
      db.prepare("UPDATE appeals SET status='upheld', resolved_at=?, resolution=? WHERE id=?").run(Date.now(), 'upheld', ap.id);
      auditLog('appeal_uphold', moderator || 'mod', videoId, '', 'info');
      return json(res, 200, { ok: true, status: 'removed' });
    }
    return json(res, 400, { error: 'acao invalida' });
  }

  // --- QUERIES ---
  if (p === '/api/mod/queue') {
    return json(res, 200, {
      reports: db.prepare(`
        SELECT r.*, COALESCE(v.status,'ok') AS vstatus, COALESCE(v.report_count,0) AS total_reports
        FROM reports r LEFT JOIN video_status v ON v.video_id=r.target_id
        WHERE r.status='open' ORDER BY
          CASE r.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
          r.created_at DESC LIMIT 50
      `).all()
    });
  }

  if (p === '/api/mod/appeals') {
    return json(res, 200, { appeals: db.prepare("SELECT * FROM appeals WHERE status='open' ORDER BY created_at DESC LIMIT 50").all() });
  }

  if (p === '/api/mod/audit') {
    const limit = parseInt(u.searchParams.get('limit') || '50');
    const severity = u.searchParams.get('severity');
    let query = 'SELECT * FROM audit';
    const params = [];
    if (severity) { query += ' WHERE severity=?'; params.push(severity); }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    return json(res, 200, { audit: db.prepare(query).all(...params) });
  }

  if (p === '/api/mod/removed') {
    return json(res, 200, { removed: db.prepare("SELECT video_id FROM video_status WHERE status='removed'").all().map(r => r.video_id) });
  }

  if (p === '/api/mod/stats') {
    const total = db.prepare("SELECT COUNT(*) c FROM reports").get().c;
    const open = db.prepare("SELECT COUNT(*) c FROM reports WHERE status='open'").get().c;
    const removed = db.prepare("SELECT COUNT(*) c FROM video_status WHERE status='removed'").get().c;
    const appeals = db.prepare("SELECT COUNT(*) c FROM appeals WHERE status='open'").get().c;
    const byCategory = db.prepare("SELECT category, COUNT(*) c FROM reports WHERE category != 'unknown' GROUP BY category ORDER BY c DESC").all();
    const bySeverity = db.prepare("SELECT severity, COUNT(*) c FROM reports GROUP BY severity ORDER BY c DESC").all();
    return json(res, 200, { total, open, removed, appeals, byCategory, bySeverity });
  }

  const m = p.match(/^\/api\/mod\/status\/([\w-]+)$/);
  if (m) {
    const s = getStatus(m[1]);
    return json(res, 200, { status: s.status, reportCount: s.report_count, lastAction: s.last_action });
  }

  json(res, 404, { error: 'rota nao encontrada' });
});

server.listen(process.env.PORT || 3014, () => {
  console.log('Moderation v3 (auto-classify + appeals + enforcement): http://localhost:' + (process.env.PORT || 3014));
});
