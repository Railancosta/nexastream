const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '../..');
const DB_PATH = path.join(ROOT, 'database', 'nexastream.db');
const STORAGE = path.join(ROOT, 'storage');
const SECRET = process.env.JWT_SECRET;

// Validar que JWT_SECRET está configurado
if (!SECRET) {
  console.error('❌ ERRO: JWT_SECRET não está configurado nas variáveis de ambiente.');
  process.exit(1);
}

fs.mkdirSync(path.join(STORAGE, 'videos'), { recursive: true });
fs.mkdirSync(path.join(STORAGE, 'thumbs'), { recursive: true });
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, email TEXT UNIQUE, password_hash TEXT, username TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS channels(id TEXT PRIMARY KEY, owner_id TEXT, name TEXT, handle TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS videos(id TEXT PRIMARY KEY, channel_id TEXT, title TEXT, description TEXT, video_path TEXT, thumbnail_path TEXT, duration INTEGER DEFAULT 0, status TEXT DEFAULT 'processing', views INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')));`);

const b64url = (s) => Buffer.from(s).toString('base64url');

// Funções JWT seguras
function signToken(userId) {
  const h = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const p = b64url(JSON.stringify({ userId, exp: Math.floor(Date.now() / 1000) + 604800 }));
  const s = crypto.createHmac('sha256', SECRET).update(h + '.' + p).digest('base64url');
  return h + '.' + p + '.' + s;
}

function verifyToken(t) {
  try {
    const [h, p, s] = t.split('.');
    const ok = crypto.createHmac('sha256', SECRET).update(h + '.' + p).digest('base64url');
    if (s !== ok) return null;
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    return payload.exp > Math.floor(Date.now() / 1000) ? payload : null;
  } catch { return null; }
}

// Funções de hash seguras
function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.scryptSync(pw, salt, 64).toString('hex');
}

function checkPassword(pw, stored) {
  try {
    const [salt, hash] = stored.split(':');
    const h = crypto.scryptSync(pw, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(hash, 'hex'));
  } catch { return false; }
}

// Sanitizar inputs para prevenir XSS
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// Configurar CORS restritivo
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://nexastream.org',
  'https://nexastream.org'
];

function json(res, code, obj) {
  const origin = res.getHeader('Origin') || '';
  const isAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes('*');
  const corsHeaders = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
  };
  res.writeHead(code, corsHeaders);
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((res, rej) => {
    const c = []; let n = 0;
    req.on('data', (d) => { 
      n += d.length; 
      if (n > 1e6) req.destroy(); // Limite de 1MB para body
      else c.push(d); 
    });
    req.on('end', () => res(Buffer.concat(c).toString()));
    req.on('error', rej);
  });
}

const auth = (req) => verifyToken((req.headers.authorization || '').replace('Bearer ', ''));

// Rate limiting simples (em memória)
const rateLimitMap = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const window = 15 * 60 * 1000; // 15 minutos
  const limit = 100; // 100 requisições por IP
  
  const record = rateLimitMap.get(ip) || { count: 0, lastReset: now };
  if (now - record.lastReset > window) {
    record.count = 0;
    record.lastReset = now;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  rateLimitMap.set(ip, record);
  return true;
}

function transcode(id, input) {
  const out = path.join(STORAGE, 'videos', id + '_360p.mp4');
  const thumb = path.join(STORAGE, 'thumbs', id + '.jpg');
  execFile('ffmpeg', ['-y', '-i', input, '-vf', 'scale=640:360', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-c:a', 'aac', out], (err) => {
    if (err) { 
      db.prepare("UPDATE videos SET status='failed' WHERE id=?").run(id); 
      return; 
    }
    execFile('ffmpeg', ['-y', '-i', input, '-ss', '1', '-frames:v', '1', '-vf', 'scale=320:180', thumb], () => {
      db.prepare("UPDATE videos SET status='ready', video_path=?, thumbnail_path=? WHERE id=?").run('/storage/videos/' + id + '_360p.mp4', '/storage/thumbs/' + id + '.jpg', id);
      console.log('VIDEO PRONTO: ' + id);
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;
  const ip = req.socket.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  
  // Verificar rate limiting
  if (!checkRateLimit(ip)) {
    return json(res, 429, { error: 'Muitas requisições, tente novamente mais tarde.' });
  }
  
  if (req.method === 'OPTIONS') return json(res, 204, {});

  if (p.startsWith('/storage/')) {
    const file = path.join(STORAGE, path.normalize(p).replace(/^[/\\]+/, '').replace('storage/', ''));
    if (!file.startsWith(STORAGE) || !fs.existsSync(file)) return json(res, 404, { error: 'not found' });
    res.writeHead(200, { 
      'Access-Control-Allow-Origin': allowedOrigins[0], 
      'Content-Type': p.endsWith('.jpg') ? 'image/jpeg' : 'video/mp4' 
    });
    return fs.createReadStream(file).pipe(res);
  }

  try {
    if (p === '/api/health') return json(res, 200, { ok: true, service: 'nexastream-core', deps: 'zero' });

    if (p === '/api/auth/register' && req.method === 'POST') {
      const b = JSON.parse(await readBody(req) || '{}');
      if (!b.email || !b.password || !b.username) return json(res, 400, { error: 'campos obrigatorios' });
      
      // Sanitizar inputs
      const sanitizedEmail = sanitizeInput(b.email);
      const sanitizedUsername = sanitizeInput(b.username);
      
      // Usar prepared statements
      const existing = db.prepare('SELECT id FROM users WHERE email=? OR username=?').get(sanitizedEmail, sanitizedUsername);
      if (existing) return json(res, 409, { error: 'ja existe' });
      
      const id = crypto.randomUUID();
      db.prepare('INSERT INTO users (id, email, password_hash, username) VALUES (?,?,?,?)').run(id, sanitizedEmail, hashPassword(b.password), sanitizedUsername);
      const ch = crypto.randomUUID();
      db.prepare('INSERT INTO channels (id, owner_id, name, handle) VALUES (?,?,?,?)').run(ch, id, sanitizedUsername, sanitizedUsername);
      return json(res, 200, { token: signToken(id), user: { id, email: sanitizedEmail, username: sanitizedUsername } });
    }

    if (p === '/api/auth/login' && req.method === 'POST') {
      const b = JSON.parse(await readBody(req) || '{}');
      if (!b.email || !b.password) return json(res, 400, { error: 'email e senha são obrigatórios' });
      
      // Sanitizar input
      const sanitizedEmail = sanitizeInput(b.email);
      
      // Usar prepared statements
      const u = db.prepare('SELECT * FROM users WHERE email=?').get(sanitizedEmail);
      if (!u || !checkPassword(b.password || '', u.password_hash)) return json(res, 401, { error: 'credenciais invalidas' });
      return json(res, 200, { token: signToken(u.id), user: { id: u.id, email: u.email, username: u.username } });
    }

    if (p === '/api/videos' && req.method === 'GET') {
      const rows = db.prepare("SELECT v.*, c.name AS channel_name FROM videos v LEFT JOIN channels c ON c.id=v.channel_id WHERE v.status='ready' ORDER BY v.created_at DESC LIMIT 30").all();
      return json(res, 200, { videos: rows });
    }

    if (p === '/api/search') {
      const q = url.searchParams.get('q') || '';
      // Sanitizar input de busca
      const sanitizedQ = sanitizeInput(q);
      const rows = db.prepare("SELECT * FROM videos WHERE status='ready' AND (title LIKE ? OR description LIKE ?) LIMIT 20").all('%' + sanitizedQ + '%', '%' + sanitizedQ + '%');
      return json(res, 200, { videos: rows });
    }

    if (p.startsWith('/api/videos/') && req.method === 'GET') {
      const v = db.prepare('SELECT * FROM videos WHERE id=?').get(p.split('/')[3]);
      if (!v) return json(res, 404, { error: 'nao encontrado' });
      db.prepare('UPDATE videos SET views=views+1 WHERE id=?').run(v.id);
      return json(res, 200, { video: v });
    }

    if (p === '/api/videos/upload' && req.method === 'PUT') {
      const a = auth(req);
      if (!a) return json(res, 401, { error: 'nao autorizado' });
      
      const id = crypto.randomUUID();
      const file = path.join(STORAGE, 'videos', id + '.mp4');
      
      // Limitar tamanho do upload (100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB
      let fileSize = 0;
      
      await new Promise((done, rej) => {
        const w = fs.createWriteStream(file);
        req.on('data', (chunk) => {
          fileSize += chunk.length;
          if (fileSize > maxSize) {
            w.destroy();
            fs.unlinkSync(file);
            rej(new Error('Arquivo muito grande (máx. 100MB)'));
          }
        });
        req.pipe(w);
        w.on('finish', done);
        w.on('error', rej);
      });
      
      // Sanitizar inputs
      const sanitizedTitle = sanitizeInput(url.searchParams.get('title') || 'Sem titulo');
      const sanitizedDescription = sanitizeInput(url.searchParams.get('description') || '');
      
      const ch = db.prepare('SELECT id FROM channels WHERE owner_id=?').get(a.userId);
      db.prepare('INSERT INTO videos (id, channel_id, title, description, video_path) VALUES (?,?,?,?,?)').run(
        id, 
        ch ? ch.id : 'x', 
        sanitizedTitle, 
        sanitizedDescription,
        '/storage/videos/' + id + '.mp4'
      );
      transcode(id, file);
      return json(res, 200, { videoId: id, status: 'processing' });
    }

    return json(res, 404, { error: 'rota nao encontrada' });
  } catch (e) {
    console.error('Erro no servidor:', e);
    return json(res, 500, { error: 'erro interno' });
  }
});

server.listen(3002, () => console.log('NexaStream Core API: http://localhost:3002 (zero dependencias)'));
