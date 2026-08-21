// ---------------------------------------------------------------------------
// Live Streaming Service (Items 8, 36 — Ingest → Transcode → HLS → Chat → VOD)
// Port 3013 | Zero npm dependencies (node:http + node:child_process + node:fs)
// ---------------------------------------------------------------------------

const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFile } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const LIVE_DIR = path.join(ROOT, 'storage', 'live');
const VOD_DIR = path.join(ROOT, 'storage', 'videos');
fs.mkdirSync(LIVE_DIR, { recursive: true });

// In-memory state (testnet; prod = Redis/Postgres)
const streams = new Map();  // id → StreamInfo
const chatMessages = new Map();  // streamId → Message[]
const viewers = new Map();  // streamId → Set<viewerId>

// Structured logging
function log(level, msg, extra = {}) {
  const entry = JSON.stringify({ ts: new Date().toISOString(), level, service: 'live', msg, ...extra });
  process.stdout.write(entry + '\n');
}

function json(res, code, obj) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
  });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((res, rej) => {
    const c = []; let n = 0;
    req.on('data', d => { n += d.length; if (n > 1e6) req.destroy(); else c.push(d); });
    req.on('end', () => res(Buffer.concat(c).toString()));
    req.on('error', rej);
  });
}

function serveFile(res, file) {
  if (!fs.existsSync(file)) return json(res, 404, { error: 'nao encontrado' });
  const ext = path.extname(file);
  const types = {
    '.m3u8': 'application/vnd.apple.mpegurl',
    '.ts': 'video/mp2t',
    '.mp4': 'video/mp4',
  };
  res.writeHead(200, {
    'Content-Type': types[ext] || 'application/octet-stream',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store'
  });
  fs.createReadStream(file).pipe(res);
}

// Rate limiting per IP (chat spam prevention)
const chatRateLimit = new Map();
function canChat(ip) {
  const now = Date.now();
  const record = chatRateLimit.get(ip) || { count: 0, lastReset: now };
  if (now - record.lastReset > 60000) { record.count = 0; record.lastReset = now; }
  if (record.count >= 30) return false; // 30 messages/min per IP
  record.count++;
  chatRateLimit.set(ip, record);
  return true;
}

// Content moderation (basic keyword filter)
const BANNED_PATTERNS = [/\b(spam|scam|hack|phish)\b/i, /<script/i, /javascript:/i];
function isClean(text) {
  return !BANNED_PATTERNS.some(p => p.test(text));
}

// --- ROUTES ---

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  const ip = req.socket.remoteAddress || 'unknown';

  if (req.method === 'OPTIONS') return json(res, 204, {});

  // Health check
  if (p === '/api/live/health') {
    const activeStreams = [...streams.values()].filter(s => s.status === 'live').length;
    return json(res, 200, { ok: true, service: 'live', activeStreams, totalViewers: [...viewers.values()].reduce((s, v) => s + v.size, 0) });
  }

  // Serve HLS segments
  if (p.startsWith('/live/')) {
    const file = path.join(LIVE_DIR, p.replace(/^\/live\//, ''));
    if (!file.startsWith(LIVE_DIR)) return json(res, 403, { error: 'proibido' });
    return serveFile(res, file);
  }

  // Serve VOD files (LIVE → VOD conversion)
  if (p.startsWith('/vod/')) {
    const file = path.join(VOD_DIR, p.replace(/^\/vod\//, ''));
    if (!file.startsWith(VOD_DIR)) return json(res, 403, { error: 'proibido' });
    return serveFile(res, file);
  }

  // --- API ROUTES ---

  // Start a live stream (Item 8)
  if (p === '/api/live/start' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req) || '{}');
    const id = crypto.randomUUID().slice(0, 8);
    const dir = path.join(LIVE_DIR, id);
    fs.mkdirSync(dir, { recursive: true });

    // HLS output with test pattern (in production: ingest RTMP/WebRTC → ffmpeg → HLS)
    const proc = spawn('ffmpeg', [
      '-f', 'lavfi', '-i', 'testsrc=size=640x360:rate=15',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=9999',
      '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'zerolatency',
      '-c:a', 'aac', '-b:a', '64k',
      '-f', 'hls', '-hls_time', '2', '-hls_list_size', '10',
      '-hls_flags', 'delete_segments',
      '-hls_segment_filename', path.join(dir, 'seg%03d.ts'),
      path.join(dir, 'index.m3u8')
    ], { stdio: 'ignore' });

    const hlsUrl = '/live/' + id + '/index.m3u8';
    const streamInfo = {
      id,
      title: body.title || 'Live ' + id,
      channel: body.channel || 'unknown',
      status: 'live',
      startedAt: Date.now(),
      hlsUrl,
      vodUrl: null,
      viewerCount: 0,
      chatEnabled: true,
      category: body.category || 'general',
    };

    streams.set(id, streamInfo);
    chatMessages.set(id, []);
    viewers.set(id, new Set());

    proc.on('exit', (code) => {
      const s = streams.get(id);
      if (s && s.status === 'live') {
        s.status = 'ended';
        s.endedAt = Date.now();
        s.duration = Math.round((s.endedAt - s.startedAt) / 1000);
        log('info', 'stream ended', { id, duration: s.duration });

        // LIVE → VOD: transcode HLS segments to MP4
        convertToVOD(id, dir);
      }
    });

    log('info', 'stream started', { id, title: streamInfo.title, channel: streamInfo.channel });
    return json(res, 200, { id, status: 'live', hlsUrl });
  }

  // Stop a live stream
  if (p === '/api/live/stop' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req) || '{}');
    const s = streams.get(body.id);
    if (!s) return json(res, 404, { error: 'stream nao encontrada' });
    try { s.proc.kill('SIGINT'); } catch {}
    s.status = 'ended';
    s.endedAt = Date.now();
    s.duration = Math.round((s.endedAt - s.startedAt) / 1000);
    return json(res, 200, { id: body.id, status: 'ended', duration: s.duration });
  }

  // List active streams
  if (p === '/api/live/streams') {
    const list = [...streams.values()].map(({ proc, ...rest }) => rest);
    return json(res, 200, { streams: list });
  }

  // Get stream info
  if (p.startsWith('/api/live/stream/') && req.method === 'GET') {
    const id = p.split('/').pop();
    const s = streams.get(id);
    if (!s) return json(res, 404, { error: 'stream nao encontrada' });
    const { proc, ...info } = s;
    info.viewerCount = viewers.get(id)?.size || 0;
    return json(res, 200, info);
  }

  // Join stream (track viewer)
  if (p === '/api/live/join' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req) || '{}');
    const s = streams.get(body.streamId);
    if (!s || s.status !== 'live') return json(res, 404, { error: 'stream offline' });
    const v = viewers.get(body.streamId) || new Set();
    v.add(body.viewerId || 'anon-' + crypto.randomUUID().slice(0, 6));
    viewers.set(body.streamId, v);
    s.viewerCount = v.size;
    return json(res, 200, { viewerCount: v.size });
  }

  // Leave stream
  if (p === '/api/live/leave' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req) || '{}');
    const v = viewers.get(body.streamId);
    if (v) {
      v.delete(body.viewerId || 'anon');
      const s = streams.get(body.streamId);
      if (s) s.viewerCount = v.size;
    }
    return json(res, 200, { ok: true });
  }

  // --- CHAT SYSTEM (Item 8) ---

  // Get chat messages
  if (p.startsWith('/api/live/chat/') && req.method === 'GET') {
    const streamId = p.split('/').pop();
    const msgs = chatMessages.get(streamId) || [];
    const since = parseInt(url.searchParams.get('since') || '0');
    const filtered = since ? msgs.filter(m => m.ts > since) : msgs.slice(-100);
    return json(res, 200, { messages: filtered });
  }

  // Send chat message
  if (p === '/api/live/chat' && req.method === 'POST') {
    if (!canChat(ip)) return json(res, 429, { error: 'rate limit: max 30 msgs/min' });
    const body = JSON.parse(await readBody(req) || '{}');
    if (!body.streamId || !body.message || !body.username) {
      return json(res, 400, { error: 'streamId, message, username obrigatórios' });
    }
    const s = streams.get(body.streamId);
    if (!s || s.status !== 'live') return json(res, 404, { error: 'stream offline' });
    if (!s.chatEnabled) return json(res, 403, { error: 'chat desabilitado' });

    // Content moderation
    const clean = body.message.slice(0, 500); // max 500 chars
    if (!isClean(clean)) {
      return json(res, 403, { error: 'mensagem bloqueada pela moderação' });
    }

    const msg = {
      id: crypto.randomUUID().slice(0, 8),
      streamId: body.streamId,
      username: body.username,
      message: clean.replace(/</g, '&lt;').replace(/>/g, '&gt;'), // XSS prevention
      ts: Date.now(),
      role: body.role || 'viewer'
    };

    const msgs = chatMessages.get(body.streamId) || [];
    msgs.push(msg);
    if (msgs.length > 500) msgs.splice(0, msgs.length - 500); // keep last 500
    chatMessages.set(body.streamId, msgs);

    return json(res, 200, { ok: true, message: msg });
  }

  // Moderation: delete message
  if (p === '/api/live/chat/delete' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req) || '{}');
    const msgs = chatMessages.get(body.streamId) || [];
    const idx = msgs.findIndex(m => m.id === body.messageId);
    if (idx >= 0) {
      msgs.splice(idx, 1);
      return json(res, 200, { ok: true });
    }
    return json(res, 404, { error: 'mensagem nao encontrada' });
  }

  // Moderation: disable chat
  if (p === '/api/live/chat/toggle' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req) || '{}');
    const s = streams.get(body.streamId);
    if (!s) return json(res, 404, { error: 'stream nao encontrada' });
    s.chatEnabled = body.enabled !== false;
    return json(res, 200, { ok: true, chatEnabled: s.chatEnabled });
  }

  json(res, 404, { error: 'rota nao encontrada' });
});

// --- LIVE → VOD CONVERSION (Item 36) ---
function convertToVOD(streamId, hlsDir) {
  log('info', 'converting live to VOD', { streamId });
  
  const segments = fs.readdirSync(hlsDir)
    .filter(f => f.endsWith('.ts'))
    .sort()
    .map(f => path.join(hlsDir, f));

  if (segments.length === 0) {
    log('warn', 'no segments found for VOD conversion', { streamId });
    return;
  }

  // Create concat file for ffmpeg
  const concatFile = path.join(hlsDir, 'concat.txt');
  fs.writeFileSync(concatFile, segments.map(s => `file '${s}'`).join('\n'));

  const vodPath = path.join(VOD_DIR, streamId + '_vod.mp4');
  execFile('ffmpeg', [
    '-y', '-f', 'concat', '-safe', '0', '-i', concatFile,
    '-c', 'copy', vodPath
  ], (err) => {
    if (err) {
      log('error', 'VOD conversion failed', { streamId, error: err.message });
      return;
    }
    const s = streams.get(streamId);
    if (s) s.vodUrl = '/storage/videos/' + streamId + '_vod.mp4';
    log('info', 'VOD conversion complete', { streamId, vodUrl: s?.vodUrl });
  });
}

setInterval(() => {
  // Cleanup old ended streams (keep metadata for 24h)
  const cutoff = Date.now() - 24 * 3600 * 1000;
  for (const [id, s] of streams) {
    if (s.status === 'ended' && s.endedAt && s.endedAt < cutoff) {
      streams.delete(id);
      chatMessages.delete(id);
      viewers.delete(id);
    }
  }
  // Cleanup chat rate limits
  const now = Date.now();
  for (const [ip, r] of chatRateLimit) {
    if (now - r.lastReset > 120000) chatRateLimit.delete(ip);
  }
}, 60000);

server.listen(process.env.PORT || 3013, () => log('info', `Live Streaming Service started on port ${process.env.PORT || 3013}`));
