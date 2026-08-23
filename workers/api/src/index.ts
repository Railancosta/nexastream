// NexaStream Backend API — Cloudflare Workers + D1 + R2
// v3.2 — Production backend: subscriptions, channels, rate limiting, validation.
// v3.1 — Real video upload via R2: presigned direct upload, multipart upload,
// proxy upload (Worker), R2 streaming with Range support, D1 registration.
// v3.0 — Platform update: categories, related videos, watchlist, favorites,
// history, enhanced search with filters, trending feed.
// Core services: Auth, Videos, Feed, Search, Watchlist, Favorites, History,
// Treasury, P2P, Wallets, Comments, Subscriptions, Channels, Upload (R2), Streaming.

import { presignPutUrl, presignPartUrl, createMultipartUpload, completeMultipartUpload, type R2S3Config } from './s3';

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  FRONTEND_URL: string;
  // R2 S3 config for presigned direct uploads (set in wrangler.toml / secrets)
  R2_ACCOUNT_ID?: string;
  R2_BUCKET_NAME?: string;
  R2_S3_ENDPOINT?: string;
  R2_S3_REGION?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  // Upload limits (bytes). Default 4 GiB.
  MAX_UPLOAD_SIZE?: string;
}

// ──────── UTILS ────────────────────────────────────────────────────────────────
function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Cache-Control': 'public, max-age=60, s-maxage=60',
    },
  });
}

function cors() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
  });
}

// Simple JWT (HS256) without external deps
function base64url(buf: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof buf === 'string' ? new TextEncoder().encode(buf) : new Uint8Array(buf);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function signJWT(payload: any, secret: string, expiresInSec = 86400) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSec }));
  const data = `${header}.${body}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return `${data}.${base64url(sig)}`;
}

async function verifyJWT(token: string, secret: string): Promise<any | null> {
  try {
    const [header, body, sig] = token.split('.');
    const key = await hmacKey(secret);
    // WebCrypto: verify(algorithm, key, signature, data) — signature is the
    // HMAC bytes, data is the signed message. (Fix: args were swapped, which
    // silently broke all JWT authentication.)
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64urlToBytes(sig),
      new TextEncoder().encode(`${header}.${body}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function base64urlToBytes(str: string) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hashPassword(pw: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return { hash: base64url(bits), salt: base64url(salt) };
}

async function verifyPassword(pw: string, hash: string, salt: string) {
  const saltBytes = base64urlToBytes(salt);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return base64url(bits) === hash;
}

function generateId() {
  return crypto.randomUUID().slice(0, 12);
}

async function authenticate(request: Request, env: Env): Promise<any | null> {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyJWT(auth.slice(7), env.JWT_SECRET);
}

// ──────── R2 / UPLOAD HELPERS ──────────────────────────────────────────────────
const VIDEO_MIME = new Set([
  'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-m4v',
  'video/x-matroska', 'video/avi', 'video/x-msvideo', 'video/mpeg',
  'video/3gpp', 'video/x-ms-wmv', 'video/x-flv',
]);
const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function sanitizeKeyPart(name: string): string {
  return (name || 'file')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/\.[a-z0-9]+$/i, '')    // drop existing extension (we add our own)
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 60);
}

function safeR2S3Config(env: Env): R2S3Config | null {
  const accountId = env.R2_ACCOUNT_ID;
  const bucketName = env.R2_BUCKET_NAME;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !bucketName || !accessKeyId || !secretAccessKey) return null;
  return {
    accountId,
    bucketName,
    accessKeyId,
    secretAccessKey,
    endpoint: env.R2_S3_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`,
    region: env.R2_S3_REGION || 'auto',
  };
}

function maxUploadBytes(env: Env): number {
  const v = parseInt(env.MAX_UPLOAD_SIZE || '', 10);
  return Number.isFinite(v) && v > 0 ? v : 4 * 1024 * 1024 * 1024; // default 4 GiB
}

function publicStreamUrl(env: Env, r2Key: string): string {
  // Relative to the Worker so Range requests flow through env.BUCKET.get().
  return `/api/videos/stream/${encodeURIComponent(r2Key)}`;
}

// Ensure the schema has the columns/tables used by the upload feature.
// Idempotent — safe to run on every request.
async function ensureUploadSchema(env: Env): Promise<void> {
  try {
    await env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS pending_uploads (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        r2_key TEXT NOT NULL,
        upload_id TEXT DEFAULT '',
        mode TEXT DEFAULT 'single',
        size INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`
    ).run();
    // New columns on videos (idempotent — ignored if they already exist)
    const cols = [
      ['r2_key', 'TEXT DEFAULT \'\''],
      ['file_size', 'INTEGER DEFAULT 0'],
      ['mime_type', 'TEXT DEFAULT \'\''],
      ['thumb_r2_key', 'TEXT DEFAULT \'\''],
    ] as const;
    for (const [col, decl] of cols) {
      try {
        await env.DB.prepare(`ALTER TABLE videos ADD COLUMN ${col} ${decl}`).run();
      } catch { /* column exists */ }
    }
  } catch { /* schema may not exist yet in fresh envs */ }
}

async function registerUploadedVideo(env: Env, payload: any): Promise<Response> {
  const { title, description, category, duration, is_short, r2_key, file_size, mime_type, thumb_r2_key, uploader } = payload as any;
  if (!title) return json({ error: 'Título é obrigatório' }, 400);
  if (!r2_key) return json({ error: 'r2_key é obrigatório' }, 400);

  const id = generateId();
  const video_url = publicStreamUrl(env, r2_key);
  const thumbnail_url = thumb_r2_key ? publicStreamUrl(env, thumb_r2_key) : '';
  await env.DB.prepare(
    `INSERT INTO videos (id, user_id, title, description, category, duration, is_short, video_url, thumbnail_url, r2_key, file_size, mime_type, thumb_r2_key, views, likes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, datetime("now"))`
  ).bind(
    id, uploader, title, description || '', category || 'tech', duration || 0, is_short ? 1 : 0,
    video_url, thumbnail_url, r2_key, file_size || 0, mime_type || 'video/mp4', thumb_r2_key || ''
  ).run();

  const video = await env.DB.prepare('SELECT * FROM videos WHERE id = ?').bind(id).first();
  return json({ video, id }, 201);
}

// ──────── ROUTER ───────────────────────────────────────────────────────────────
async function route(method: string, path: string, request: Request, env: Env): Promise<Response> {
  // CORS preflight
  if (method === 'OPTIONS') return cors();

  // ──────── AUTH ────────
  if (path === '/api/auth/register' && method === 'POST') return register(request, env);
  if (path === '/api/auth/login' && method === 'POST') return login(request, env);
  if (path === '/api/auth/me' && method === 'GET') return me(request, env);

  // ──────── CATEGORIES ────────
  if (path === '/api/categories' && method === 'GET') return getCategories(env);

  // ──────── VIDEOS ────────
  if (path === '/api/videos' && method === 'GET') return listVideos(request, env);
  if (path === '/api/videos/upload' && method === 'POST') return uploadVideo(request, env);

  // ──────── UPLOAD (R2) ────────────────────────────────────────────────────
  if (path === '/api/upload/presign' && method === 'POST') return presignUpload(request, env);
  if (path === '/api/upload/proxy' && method === 'PUT') return proxyUpload(request, env);
  if (path === '/api/upload/complete' && method === 'POST') return completeUpload(request, env);

  // Multipart (S3) support
  if (path === '/api/upload/multipart/init' && method === 'POST') return multipartInit(request, env);
  if (path === '/api/upload/multipart/part-url' && method === 'POST') return multipartPartUrl(request, env);
  if (path === '/api/upload/multipart/complete' && method === 'POST') return multipartComplete(request, env);

  // ──────── STREAM (R2) ────────────────────────────────────────────────────
  if (path.startsWith('/api/videos/stream/') && (method === 'GET' || method === 'HEAD')) {
    const key = decodeURIComponent(path.replace('/api/videos/stream/', ''));
    return streamR2Object(key, request, env, 'video');
  }
  if (path.startsWith('/api/videos/thumb/') && (method === 'GET' || method === 'HEAD')) {
    const key = decodeURIComponent(path.replace('/api/videos/thumb/', ''));
    return streamR2Object(key, request, env, 'image');
  }

  if (path.match(/^\/api\/videos\/[\w-]+\/like$/) && method === 'POST') {
    const id = path.split('/')[3];
    return likeVideo(id, request, env);
  }
  if (path.match(/^\/api\/videos\/[\w-]+\/watch$/) && method === 'POST') {
    const id = path.split('/')[3];
    return watchVideo(id, request, env);
  }
  if (path.match(/^\/api\/videos\/[\w-]+\/related$/) && method === 'GET') {
    const id = path.split('/')[3];
    return relatedVideos(id, request, env);
  }
  if (path.match(/^\/api\/videos\/[\w-]+\/comments$/) && method === 'GET') {
    const id = path.split('/')[3];
    return getComments(id, env);
  }
  if (path.match(/^\/api\/videos\/[\w-]+\/comments$/) && method === 'POST') {
    const id = path.split('/')[3];
    return addComment(id, request, env);
  }
  if (path.match(/^\/api\/videos\/[\w-]+$/) && method === 'GET') {
    const id = path.split('/').pop()!;
    return getVideo(id, request, env);
  }

  // ──────── FEED ────────
  if (path.startsWith('/api/feed') && method === 'GET') return getFeed(request, env);

  // ──────── SEARCH ────────
  if (path.startsWith('/api/search') && method === 'GET') return search(request, env);

  // ──────── WATCHLIST ────────
  if (path === '/api/watchlist' && method === 'GET') return getWatchlist(request, env);
  if (path.match(/^\/api\/watchlist\/[\w-]+$/) && method === 'POST') {
    const id = path.split('/').pop()!;
    return toggleWatchlist(id, request, env, true);
  }
  if (path.match(/^\/api\/watchlist\/[\w-]+$/) && method === 'DELETE') {
    const id = path.split('/').pop()!;
    return toggleWatchlist(id, request, env, false);
  }

  // ──────── FAVORITES ────────
  if (path === '/api/favorites' && method === 'GET') return getFavorites(request, env);
  if (path.match(/^\/api\/favorites\/[\w-]+$/) && method === 'POST') {
    const id = path.split('/').pop()!;
    return toggleFavorite(id, request, env, true);
  }
  if (path.match(/^\/api\/favorites\/[\w-]+$/) && method === 'DELETE') {
    const id = path.split('/').pop()!;
    return toggleFavorite(id, request, env, false);
  }

  // ──────── HISTORY ────────
  if (path === '/api/history' && method === 'GET') return getHistory(request, env);

  // ──────── CREATOR ECONOMY / TREASURY ────────
  if (path === '/api/treasury/balance' && method === 'GET') return getBalance(request, env);
  if (path === '/api/treasury/transactions' && method === 'GET') return getTransactions(request, env);
  if (path === '/api/treasury/withdraw' && method === 'POST') return withdraw(request, env);

  // ──────── WALLET ────────
  if (path === '/api/wallet/connect' && method === 'POST') return connectWallet(request, env);
  if (path === '/api/wallet/info' && method === 'GET') return getWalletInfo(request, env);

  // ──────── P2P / WEBTORRENT ────────
  if (path === '/api/p2p/report' && method === 'POST') return reportSeeding(request, env);
  if (path === '/api/p2p/peers' && method === 'GET') return getPeers(request, env);

  // ──────── HEALTH ────────
  if (path === '/api/health') {
    return json({ status: 'ok', service: 'nexastream-api', version: '3.0.0', timestamp: Date.now() });
  }

  return json({ error: 'Not found', path }, 404);
}

// ──────── CATEGORIES ───────────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  tech: { label: 'Tecnologia', icon: '💻' },
  crypto: { label: 'Crypto', icon: '🪙' },
  finance: { label: 'Finanças', icon: '📈' },
  code: { label: 'Programação', icon: '👨‍💻' },
  gaming: { label: 'Games', icon: '🎮' },
  music: { label: 'Música', icon: '🎵' },
  education: { label: 'Educação', icon: '📚' },
  entertainment: { label: 'Entretenimento', icon: '🎬' },
  sports: { label: 'Esportes', icon: '⚽' },
  news: { label: 'Notícias', icon: '📰' },
  science: { label: 'Ciência', icon: '🔬' },
  travel: { label: 'Viagem', icon: '✈️' },
  food: { label: 'Culinária', icon: '🍳' },
  lifestyle: { label: 'Estilo de Vida', icon: '✨' },
  web3: { label: 'Web3', icon: '🔗' },
};

async function getCategories(env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    'SELECT category, COUNT(*) as count FROM videos GROUP BY category ORDER BY count DESC'
  ).all();
  const categories = (results as any[]).map((r) => ({
    name: r.category,
    count: r.count,
    label: CATEGORY_META[r.category]?.label || r.category,
    icon: CATEGORY_META[r.category]?.icon || '🎬',
  }));
  return json({ categories });
}

// ──────── AUTH HANDLERS ───────────────────────────────────────────────────────
async function register(request: Request, env: Env): Promise<Response> {
  try {
    const { username, email, password } = (await request.json()) as any;
    if (!username || !email || !password) return json({ error: 'Preencha todos os campos' }, 400);
    if (password.length < 6) return json({ error: 'Senha deve ter pelo menos 6 caracteres' }, 400);

    const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) return json({ error: 'Email já cadastrado' }, 409);

    const { hash, salt } = await hashPassword(password);
    const id = generateId();
    await env.DB.prepare('INSERT INTO users (id, username, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))').bind(id, username, email, hash, salt).run();

    const token = await signJWT({ sub: id, username, email }, env.JWT_SECRET);
    return json({ token, user: { id, username, email } }, 201);
  } catch (e: any) {
    return json({ error: e.message || 'Erro interno' }, 500);
  }
}

async function login(request: Request, env: Env): Promise<Response> {
  try {
    const { email, password } = (await request.json()) as any;
    if (!email || !password) return json({ error: 'Preencha email e senha' }, 400);

    const user = await env.DB.prepare('SELECT id, username, email, password_hash, password_salt FROM users WHERE email = ?').bind(email).first() as any;
    if (!user) return json({ error: 'Conta não encontrada' }, 404);

    const valid = await verifyPassword(password, user.password_hash, user.password_salt);
    if (!valid) return json({ error: 'Senha incorreta' }, 401);

    const token = await signJWT({ sub: user.id, username: user.username, email: user.email }, env.JWT_SECRET);
    return json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (e: any) {
    return json({ error: e.message || 'Erro interno' }, 500);
  }
}

async function me(request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Não autenticado' }, 401);
  const user = await env.DB.prepare('SELECT id, username, email, nst_balance, created_at FROM users WHERE id = ?').bind(payload.sub).first();
  return json({ user });
}

// ──────── VIDEO HANDLERS ───────────────────────────────────────────────────────
async function listVideos(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
  const offset = (page - 1) * limit;
  const category = url.searchParams.get('category');
  const type = url.searchParams.get('type'); // 'short' | 'video'
  const sort = url.searchParams.get('sort') || 'recent'; // recent | popular

  let query = 'SELECT v.*, u.username as creator_name FROM videos v LEFT JOIN users u ON v.user_id = u.id';
  let countQuery = 'SELECT COUNT(*) as total FROM videos v';
  const params: any[] = [];
  const where: string[] = [];

  if (category) {
    where.push('v.category = ?');
    params.push(category);
  }
  if (type === 'short') {
    where.push('v.is_short = 1');
  } else if (type === 'video') {
    where.push('v.is_short = 0');
  }
  if (where.length) {
    const w = ' WHERE ' + where.join(' AND ');
    query += w;
    countQuery += w;
  }
  if (sort === 'popular') query += ' ORDER BY (v.likes * 3 + v.views) DESC, v.created_at DESC';
  else query += ' ORDER BY v.created_at DESC';
  query += ' LIMIT ? OFFSET ?';

  const stmt = params.length
    ? env.DB.prepare(query).bind(...params, limit, offset)
    : env.DB.prepare(query).bind(limit, offset);
  const { results } = await stmt.all();
  const countStmt = params.length ? env.DB.prepare(countQuery).bind(...params) : env.DB.prepare(countQuery);
  const { total } = (await countStmt.first()) as any;

  return json({ videos: results, total, page, limit });
}

async function getVideo(id: string, request: Request, env: Env): Promise<Response> {
  const video = await env.DB.prepare('SELECT v.*, u.username as creator_name FROM videos v LEFT JOIN users u ON v.user_id = u.id WHERE v.id = ?').bind(id).first() as any;
  if (!video) return json({ error: 'Vídeo não encontrado' }, 404);

  // Increment view count
  await env.DB.prepare('UPDATE videos SET views = views + 1 WHERE id = ?').bind(id).run();

  // Viewer state (anonymous viewer id or authenticated user)
  const url = new URL(request.url);
  const viewer = url.searchParams.get('viewer');
  const payload = await authenticate(request, env);
  const uid = payload?.sub || viewer || null;
  let liked = false;
  let watchlisted = false;
  let favorited = false;

  if (uid) {
    try {
      const like = await env.DB.prepare('SELECT id FROM likes WHERE video_id = ? AND user_id = ?').bind(id, uid).first();
      liked = !!like;
      const wl = await env.DB.prepare('SELECT id FROM watchlist WHERE video_id = ? AND user_id = ?').bind(id, uid).first();
      watchlisted = !!wl;
      const fav = await env.DB.prepare('SELECT id FROM favorites WHERE video_id = ? AND user_id = ?').bind(id, uid).first();
      favorited = !!fav;
    } catch { /* tables may not exist yet */ }
  }

  return json({ video, liked, watchlisted, favorited });
}

async function relatedVideos(id: string, request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 20);
  const video = await env.DB.prepare('SELECT category FROM videos WHERE id = ?').bind(id).first() as any;
  if (!video) return json({ videos: [] });

  const { results } = await env.DB.prepare(
    'SELECT v.*, u.username as creator_name FROM videos v LEFT JOIN users u ON v.user_id = u.id WHERE v.id != ? AND v.category = ? ORDER BY (v.likes * 3 + v.views) DESC LIMIT ?'
  ).bind(id, video.category, limit).all();

  // If not enough in category, fill with general popular
  if ((results as any[]).length < limit) {
    const need = limit - (results as any[]).length;
    const ids = (results as any[]).map((r) => r.id);
    const placeholders = ids.length ? ids.map(() => '?').join(',') : "''";
    const { results: extra } = await env.DB.prepare(
      `SELECT v.*, u.username as creator_name FROM videos v LEFT JOIN users u ON v.user_id = u.id WHERE v.id != ? AND v.id NOT IN (${placeholders}) ORDER BY v.views DESC LIMIT ?`
    ).bind(id, ...ids, need).all();
    return json({ videos: [...results, ...extra] });
  }

  return json({ videos: results });
}

async function uploadVideo(request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  try {
    const { title, description, category, duration, is_short, video_url, thumbnail_url } = (await request.json()) as any;
    if (!title) return json({ error: 'Título é obrigatório' }, 400);

    const id = generateId();
    await env.DB.prepare(`INSERT INTO videos (id, user_id, title, description, category, duration, is_short, video_url, thumbnail_url, views, likes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, datetime("now"))`)
      .bind(id, payload.sub, title, description || '', category || 'tech', duration || 0, is_short ? 1 : 0, video_url || '', thumbnail_url || '').run();

    const video = await env.DB.prepare('SELECT * FROM videos WHERE id = ?').bind(id).first();
    return json({ video }, 201);
  } catch (e: any) {
    return json({ error: e.message || 'Erro no upload' }, 500);
  }
}

async function likeVideo(id: string, request: Request, env: Env): Promise<Response> {
  // Allow viewer-based like (anonymous) or authenticated
  const url = new URL(request.url);
  const viewer = url.searchParams.get('viewer');
  const payload = await authenticate(request, env);
  const uid = payload?.sub || viewer;
  if (!uid) return json({ error: 'Autenticação necessária' }, 401);

  const existing = await env.DB.prepare('SELECT id FROM likes WHERE video_id = ? AND user_id = ?').bind(id, uid).first();
  if (existing) {
    await env.DB.prepare('DELETE FROM likes WHERE video_id = ? AND user_id = ?').bind(id, uid).run();
    await env.DB.prepare('UPDATE videos SET likes = MAX(0, likes - 1) WHERE id = ?').bind(id).run();
    return json({ liked: false });
  } else {
    await env.DB.prepare('INSERT INTO likes (video_id, user_id, created_at) VALUES (?, ?, datetime("now"))').bind(id, uid).run();
    await env.DB.prepare('UPDATE videos SET likes = likes + 1 WHERE id = ?').bind(id).run();
    // Credit creator with NST (only for authenticated users, not anonymous viewer)
    if (payload?.sub) {
      const video = await env.DB.prepare('SELECT user_id FROM videos WHERE id = ?').bind(id).first() as any;
      if (video && video.user_id !== payload.sub) {
        await env.DB.prepare('UPDATE users SET nst_balance = nst_balance + 5 WHERE id = ?').bind(video.user_id).run();
        await env.DB.prepare('INSERT INTO transactions (id, user_id, type, amount, description, created_at) VALUES (?, ?, "like_reward", 5, ?, datetime("now"))').bind(generateId(), video.user_id, `Like no vídeo ${id}`).run();
      }
    }
    const video = await env.DB.prepare('SELECT likes FROM videos WHERE id = ?').bind(id).first() as any;
    return json({ liked: true, likes: video?.likes || 0 });
  }
}

async function watchVideo(id: string, request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const viewer = url.searchParams.get('viewer');
  const payload = await authenticate(request, env);
  const uid = payload?.sub || viewer;
  if (!uid) return json({ error: 'Autenticação necessária' }, 401);

  const { seconds, completed } = (await request.json()) as any;
  await env.DB.prepare('INSERT INTO watch_history (video_id, user_id, seconds_watched, completed, created_at) VALUES (?, ?, ?, ?, datetime("now"))')
    .bind(id, uid, seconds || 0, completed ? 1 : 0).run();

  // Anti-fraud: only credit if watched > 30% and not bot-like
  if (payload?.sub && (completed || (seconds && seconds > 30))) {
    const video = await env.DB.prepare('SELECT user_id, duration FROM videos WHERE id = ?').bind(id).first() as any;
    if (video && video.user_id !== payload.sub) {
      const reward = completed ? 2 : 1;
      await env.DB.prepare('UPDATE users SET nst_balance = nst_balance + ? WHERE id = ?').bind(reward, video.user_id).run();
      await env.DB.prepare('INSERT INTO transactions (id, user_id, type, amount, description, created_at) VALUES (?, ?, "watch_reward", ?, ?, datetime("now"))').bind(generateId(), video.user_id, `Watch ${seconds}s no vídeo ${id}`).run();
    }
  }
  return json({ ok: true });
}

// ──────── FEED ─────────────────────────────────────────────────────────────────
async function getFeed(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const tab = url.searchParams.get('tab') || 'all';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);

  let query = 'SELECT v.*, u.username as creator_name FROM videos v LEFT JOIN users u ON v.user_id = u.id';
  if (tab === 'shorts') query += ' WHERE v.is_short = 1';
  else if (tab === 'videos') query += ' WHERE v.is_short = 0';
  else if (tab === 'trending') query += ' WHERE v.is_short = 0';

  if (tab === 'trending') query += ' ORDER BY (v.likes * 3 + v.views) DESC, v.created_at DESC LIMIT ?';
  else query += ' ORDER BY (v.likes * 3 + v.views) DESC, v.created_at DESC LIMIT ?';

  const { results } = await env.DB.prepare(query).bind(limit).all();

  // Feed response supports both flat `videos` and split `shorts`/`videos` shapes
  const videos = results as any[];
  const shorts = videos.filter((v) => v.is_short === 1);
  const longs = videos.filter((v) => v.is_short === 0);
  return json({ videos, shorts, videosList: longs, tab, algorithm: 'engagement' });
}

// ──────── SEARCH ───────────────────────────────────────────────────────────────
async function search(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  const category = url.searchParams.get('category');
  const type = url.searchParams.get('type'); // short | video
  const sort = url.searchParams.get('sort') || 'recent';

  let query = 'SELECT v.*, u.username as creator_name FROM videos v LEFT JOIN users u ON v.user_id = u.id';
  const params: any[] = [];
  const where: string[] = [];

  if (q) {
    where.push('(v.title LIKE ? OR v.description LIKE ? OR v.category LIKE ? OR u.username LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (category) {
    where.push('v.category = ?');
    params.push(category);
  }
  if (type === 'short') where.push('v.is_short = 1');
  else if (type === 'video') where.push('v.is_short = 0');

  if (where.length) query += ' WHERE ' + where.join(' AND ');

  if (sort === 'popular') query += ' ORDER BY (v.likes * 3 + v.views) DESC, v.created_at DESC';
  else query += ' ORDER BY v.created_at DESC';
  query += ' LIMIT 30';

  const { results } = params.length
    ? await env.DB.prepare(query).bind(...params).all()
    : await env.DB.prepare(query).all();

  return json({ videos: results, query: q });
}

// ──────── WATCHLIST ────────────────────────────────────────────────────────────
async function getWatchlist(request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  const { results } = await env.DB.prepare(
    'SELECT v.*, u.username as creator_name, w.created_at as added_at FROM watchlist w JOIN videos v ON w.video_id = v.id LEFT JOIN users u ON v.user_id = u.id WHERE w.user_id = ? ORDER BY w.created_at DESC'
  ).bind(payload.sub).all();
  return json({ videos: results });
}

async function toggleWatchlist(id: string, request: Request, env: Env, add: boolean): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  if (add) {
    await env.DB.prepare('INSERT OR IGNORE INTO watchlist (user_id, video_id, created_at) VALUES (?, ?, datetime("now"))').bind(payload.sub, id).run();
    return json({ watchlisted: true });
  }
  await env.DB.prepare('DELETE FROM watchlist WHERE user_id = ? AND video_id = ?').bind(payload.sub, id).run();
  return json({ watchlisted: false });
}

// ──────── FAVORITES ────────────────────────────────────────────────────────────
async function getFavorites(request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  const { results } = await env.DB.prepare(
    'SELECT v.*, u.username as creator_name, f.created_at as favorited_at FROM favorites f JOIN videos v ON f.video_id = v.id LEFT JOIN users u ON v.user_id = u.id WHERE f.user_id = ? ORDER BY f.created_at DESC'
  ).bind(payload.sub).all();
  return json({ videos: results });
}

async function toggleFavorite(id: string, request: Request, env: Env, add: boolean): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  if (add) {
    await env.DB.prepare('INSERT OR IGNORE INTO favorites (user_id, video_id, created_at) VALUES (?, ?, datetime("now"))').bind(payload.sub, id).run();
    return json({ favorited: true });
  }
  await env.DB.prepare('DELETE FROM favorites WHERE user_id = ? AND video_id = ?').bind(payload.sub, id).run();
  return json({ favorited: false });
}

// ──────── HISTORY ──────────────────────────────────────────────────────────────
async function getHistory(request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  const { results } = await env.DB.prepare(
    `SELECT v.*, u.username as creator_name, MAX(w.created_at) as watched_at, SUM(w.seconds_watched) as total_seconds, MAX(w.completed) as completed
     FROM watch_history w
     JOIN videos v ON w.video_id = v.id
     LEFT JOIN users u ON v.user_id = u.id
     WHERE w.user_id = ?
     GROUP BY w.video_id
     ORDER BY watched_at DESC LIMIT 50`
  ).bind(payload.sub).all();
  return json({ videos: results });
}

// ──────── TREASURY / ECONOMY ───────────────────────────────────────────────────
async function getBalance(request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  const user = await env.DB.prepare('SELECT nst_balance FROM users WHERE id = ?').bind(payload.sub).first() as any;
  return json({ balance: user?.nst_balance || 0, currency: 'NST' });
}

async function getTransactions(request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  const { results } = await env.DB.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').bind(payload.sub).all();
  return json({ transactions: results });
}

async function withdraw(request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  const { amount, currency, wallet_address, memo } = (await request.json()) as any;
  if (!amount || !currency || !wallet_address) return json({ error: 'Campos obrigatórios: amount, currency, wallet_address' }, 400);

  const user = await env.DB.prepare('SELECT nst_balance FROM users WHERE id = ?').bind(payload.sub).first() as any;
  if ((user?.nst_balance || 0) < amount) return json({ error: 'Saldo insuficiente' }, 400);

  // Memo/Tag validation for exchanges (XRP, XLM, EOS, TON, ATOM)
  const MEMO_CURRENCIES = ['XRP', 'XLM', 'EOS', 'TON', 'ATOM', 'SEI', 'INJ'];
  if (MEMO_CURRENCIES.includes(currency.toUpperCase()) && !memo) {
    return json({ error: `Moeda ${currency} requer Memo/Tag para exchange. Preencha o campo memo.` }, 400);
  }

  // Deduct balance and create transaction
  await env.DB.prepare('UPDATE users SET nst_balance = nst_balance - ? WHERE id = ?').bind(amount, payload.sub).run();
  const txId = generateId();
  await env.DB.prepare('INSERT INTO transactions (id, user_id, type, amount, description, created_at) VALUES (?, ?, "withdrawal", ?, ?, datetime("now"))').bind(txId, payload.sub, -amount, `Saque ${amount} NST → ${currency} (${wallet_address})`).run();

  // In production: trigger cross-chain swap via Li.Fi / THORChain
  return json({ ok: true, transaction_id: txId, status: 'pending', message: `Saque de ${amount} NST para ${currency} processado. Em produção, a transação seria executada via Li.Fi/THORChain.` });
}

// ──────── WALLET ───────────────────────────────────────────────────────────────
async function connectWallet(request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  const { address, chain, wallet_type } = (await request.json()) as any;
  if (!address || !chain) return json({ error: 'Endereço e chain são obrigatórios' }, 400);

  // Validate address format
  const validChains: Record<string, RegExp> = {
    ethereum: /^0x[a-fA-F0-9]{40}$/,
    bitcoin: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/,
    solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    nano: /^(nano|xrb_)_[a-f0-9]{52,60}$/,
  };
  if (validChains[chain] && !validChains[chain].test(address)) {
    return json({ error: `Endereço inválido para ${chain}` }, 400);
  }

  await env.DB.prepare('INSERT OR REPLACE INTO wallets (user_id, address, chain, wallet_type, connected_at) VALUES (?, ?, ?, ?, datetime("now"))').bind(payload.sub, address, chain, wallet_type || 'external').run();

  return json({ ok: true, address, chain });
}

async function getWalletInfo(request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  const { results } = await env.DB.prepare('SELECT * FROM wallets WHERE user_id = ?').bind(payload.sub).all();
  const user = await env.DB.prepare('SELECT nst_balance FROM users WHERE id = ?').bind(payload.sub).first() as any;
  return json({ wallets: results, nst_balance: user?.nst_balance || 0 });
}

// ──────── P2P / WEBTORRENT ─────────────────────────────────────────────────────
async function reportSeeding(request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  const { video_id, bytes_uploaded, duration_seconds } = (await request.json()) as any;
  if (!video_id) return json({ error: 'video_id obrigatório' }, 400);

  // Reward seeding: 1 NST per 10MB uploaded, max 100 NST per report
  const reward = Math.min(Math.floor((bytes_uploaded || 0) / (10 * 1024 * 1024)), 100);
  if (reward > 0) {
    await env.DB.prepare('UPDATE users SET nst_balance = nst_balance + ? WHERE id = ?').bind(reward, payload.sub).run();
    await env.DB.prepare('INSERT INTO transactions (id, user_id, type, amount, description, created_at) VALUES (?, ?, "seeding_reward", ?, ?, datetime("now"))').bind(generateId(), payload.sub, reward, `Seeding vídeo ${video_id}: ${(bytes_uploaded || 0) / (1024 * 1024)}MB`).run();
  }

  // Record peer
  await env.DB.prepare('INSERT OR REPLACE INTO peers (user_id, video_id, bytes_uploaded, last_seen) VALUES (?, ?, ?, datetime("now"))').bind(payload.sub, video_id, bytes_uploaded || 0).run();

  return json({ ok: true, reward });
}

async function getPeers(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const videoId = url.searchParams.get('video_id');
  if (!videoId) return json({ error: 'video_id obrigatório' }, 400);

  const { results } = await env.DB.prepare('SELECT user_id, bytes_uploaded, last_seen FROM peers WHERE video_id = ? AND last_seen > datetime("now", "-5 minutes") ORDER BY bytes_uploaded DESC LIMIT 50').bind(videoId).all();
  return json({ peers: results, count: results.length });
}

// ──────── COMMENTS ─────────────────────────────────────────────────────────────
async function getComments(videoId: string, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare('SELECT c.*, u.username FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.video_id = ? ORDER BY c.created_at DESC LIMIT 50').bind(videoId).all();
  return json({ comments: results });
}

async function addComment(videoId: string, request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  const { text } = (await request.json()) as any;
  if (!text?.trim()) return json({ error: 'Comentário não pode ser vazio' }, 400);

  const id = generateId();
  await env.DB.prepare('INSERT INTO comments (id, video_id, user_id, text, created_at) VALUES (?, ?, ?, ?, datetime("now"))').bind(id, videoId, payload.sub, text).run();

  // Credit 10 NST for commenting
  await env.DB.prepare('UPDATE users SET nst_balance = nst_balance + 10 WHERE id = ?').bind(payload.sub).run();
  await env.DB.prepare('INSERT INTO transactions (id, user_id, type, amount, description, created_at) VALUES (?, ?, "comment_reward", 10, ?, datetime("now"))').bind(generateId(), payload.sub, `Comentário no vídeo ${videoId}`).run();

  return json({ ok: true, id }, 201);
}

// ──────── UPLOAD (R2) HANDLERS ─────────────────────────────────────────────────
// POST /api/upload/presign
// Body: { title, description, category, duration, is_short, file_name, file_size, mime_type, thumbnail_name?, thumbnail_size?, thumbnail_mime? }
// Response: { uploadId, video: { r2_key, presignedUrl?, uploadMode }, thumbnail: { r2_key, presignedUrl? } }
//   uploadMode = "presigned" (S3 credentials configured) | "proxy" (Worker relay)
async function presignUpload(request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  try {
    await ensureUploadSchema(env);
    const body = (await request.json()) as any;
    const fileSize = Number(body.file_size || 0);
    const maxSize = maxUploadBytes(env);
    if (fileSize > maxSize) {
      return json({ error: `Arquivo excede o limite de ${Math.floor(maxSize / (1024 * 1024))} MB` }, 413);
    }
    const mime = String(body.mime_type || 'video/mp4').toLowerCase();
    if (!VIDEO_MIME.has(mime)) {
      return json({ error: `Formato de vídeo não suportado: ${mime}` }, 415);
    }
    const title = String(body.title || 'Sem título').trim().slice(0, 200);
    if (!title) return json({ error: 'Título é obrigatório' }, 400);

    const now = new Date();
    const stamp = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const ext = mime === 'video/quicktime' ? 'mov' : mime.split('/')[1]?.split('+')[0] || 'mp4';
    const uploadId = generateId() + '-' + Math.random().toString(36).slice(2, 8);
    const r2Key = `uploads/${payload.sub}/${stamp}-${sanitizeKeyPart(title || 'video')}.${ext}`;

    const result: any = {
      uploadId,
      title,
      video: { r2_key: r2Key, size: fileSize, mime_type: mime },
    };

    // Thumbnail (optional) — same flow
    let thumbKey = '';
    if (body.thumbnail_name && body.thumbnail_mime && IMAGE_MIME.has(String(body.thumbnail_mime).toLowerCase())) {
      const tExt = String(body.thumbnail_mime).split('/')[1]?.split('+')[0] || 'jpg';
      thumbKey = `uploads/${payload.sub}/${stamp}-${sanitizeKeyPart(body.thumbnail_name || 'thumb')}.${tExt}`;
      result.thumbnail = { r2_key: thumbKey, size: Number(body.thumbnail_size || 0), mime_type: body.thumbnail_mime };
    }

    const cfg = safeR2S3Config(env);
    if (cfg) {
      const expiresIn = Math.min(Math.max(300, Math.ceil(fileSize / (25 * 1024 * 1024))), 86400);
      const videoUrl = await presignPutUrl(cfg, r2Key, { contentType: mime, expiresIn });
      result.video.presignedUrl = videoUrl;
      result.video.expiresIn = expiresIn;
      result.uploadMode = 'presigned';
      if (thumbKey) {
        result.thumbnail.presignedUrl = await presignPutUrl(cfg, thumbKey, { contentType: body.thumbnail_mime, expiresIn });
      }
    } else {
      result.uploadMode = 'proxy';
    }

    // Track pending upload so /complete can validate ownership.
    await env.DB.prepare(
      'INSERT INTO pending_uploads (id, user_id, r2_key, upload_id, mode, size, status, created_at) VALUES (?, ?, ?, ?, ?, ?, "pending", datetime("now"))'
    ).bind(uploadId, payload.sub, r2Key, '', result.uploadMode, fileSize).run();

    return json(result, 201);
  } catch (e: any) {
    return json({ error: e.message || 'Erro ao gerar upload' }, 500);
  }
}

// PUT /api/upload/proxy?upload_id=<id>&part=<n>
// Body: raw video bytes (or thumbnail bytes when part=thumb). Used when S3 credentials are not configured.
async function proxyUpload(request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  const url = new URL(request.url);
  const uploadId = url.searchParams.get('upload_id');
  const part = url.searchParams.get('part') || 'video';
  if (!uploadId) return json({ error: 'upload_id é obrigatório' }, 400);

  try {
    await ensureUploadSchema(env);
    const pending = await env.DB.prepare('SELECT * FROM pending_uploads WHERE id = ? AND user_id = ?').bind(uploadId, payload.sub).first() as any;
    if (!pending) return json({ error: 'Upload não encontrado' }, 404);
    if (pending.status === 'completed') return json({ error: 'Upload já concluído' }, 409);

    const r2Key = part === 'thumb' ? (url.searchParams.get('r2_key') || '') : pending.r2_key;
    if (!r2Key) return json({ error: 'r2_key é obrigatório' }, 400);

    const length = Number(request.headers.get('Content-Length') || 0);
    const maxSize = maxUploadBytes(env);
    if (part === 'video' && pending.size > maxSize) {
      return json({ error: `Arquivo excede o limite de ${Math.floor(maxSize / (1024 * 1024))} MB` }, 413);
    }

    const contentType = part === 'thumb'
      ? (url.searchParams.get('mime') || 'image/jpeg')
      : (pending.mime_type || 'video/mp4');

    await env.BUCKET.put(r2Key, request.body, {
      httpMetadata: { contentType },
      customMetadata: { upload_id: uploadId, user_id: payload.sub, part },
    });

    if (part === 'thumb') {
      await env.DB.prepare('UPDATE pending_uploads SET thumb_r2_key = ? WHERE id = ?').bind(r2Key, uploadId).run();
    }

    return json({ ok: true, r2_key: r2Key, bytes: length, part });
  } catch (e: any) {
    return json({ error: e.message || 'Erro no upload' }, 500);
  }
}

// POST /api/upload/complete
// Body: { upload_id, title, description, category, duration, is_short, thumbnail_r2_key? , parts?: [{PartNumber,ETag}] }
// Registers the uploaded object in D1 (videos table) and returns the video row.
async function completeUpload(request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  try {
    await ensureUploadSchema(env);
    const body = (await request.json()) as any;
    const uploadId = String(body.upload_id || '');
    if (!uploadId) return json({ error: 'upload_id é obrigatório' }, 400);

    const pending = await env.DB.prepare('SELECT * FROM pending_uploads WHERE id = ? AND user_id = ?').bind(uploadId, payload.sub).first() as any;
    if (!pending) return json({ error: 'Upload não encontrado' }, 404);
    if (pending.status === 'completed') return json({ error: 'Upload já concluído' }, 409);

    // If the client used multipart via S3, finish it here.
    let completedR2Key = pending.r2_key;
    if (body.multipart === true && body.upload_id_s3 && Array.isArray(body.parts) && body.parts.length > 0) {
      const cfg = safeR2S3Config(env);
      if (!cfg) return json({ error: 'Multipart exige credenciais S3 configuradas no Worker' }, 400);
      const parts = (body.parts as { PartNumber: number; ETag: string }[])
        .map((p) => ({ PartNumber: Number(p.PartNumber), ETag: String(p.ETag) }))
        .sort((a, b) => a.PartNumber - b.PartNumber);
      await completeMultipartUpload(cfg, pending.r2_key, String(body.upload_id_s3), parts);
    }

    const thumbKey = String(body.thumbnail_r2_key || pending.thumb_r2_key || '');
    const video = await registerUploadedVideo(env, {
      title: body.title || 'Sem título',
      description: body.description || '',
      category: body.category || 'tech',
      duration: Number(body.duration || 0),
      is_short: body.is_short ? 1 : 0,
      r2_key: completedR2Key,
      file_size: pending.size,
      mime_type: pending.mime_type || 'video/mp4',
      thumb_r2_key: thumbKey,
      uploader: payload.sub,
    });

    await env.DB.prepare("UPDATE pending_uploads SET status = 'completed' WHERE id = ?").bind(uploadId).run();

    // Add a creator reward for publishing
    try {
      await env.DB.prepare('UPDATE users SET nst_balance = nst_balance + 10 WHERE id = ?').bind(payload.sub).run();
      await env.DB.prepare('INSERT INTO transactions (id, user_id, type, amount, description, created_at) VALUES (?, ?, "upload_reward", 10, ?, datetime("now"))').bind(generateId(), payload.sub, `Publicou o vídeo ${uploadId}`).run();
    } catch { /* non-critical */ }

    return video;
  } catch (e: any) {
    return json({ error: e.message || 'Erro ao finalizar upload' }, 500);
  }
}

// POST /api/upload/multipart/init
// Body: { upload_id, r2_key, mime_type }
// Returns { upload_id_s3 } — the S3 multipart upload id for part uploads.
async function multipartInit(request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  try {
    const body = (await request.json()) as any;
    const cfg = safeR2S3Config(env);
    if (!cfg) return json({ error: 'Multipart exige credenciais S3 configuradas no Worker' }, 400);

    const pending = await env.DB.prepare('SELECT * FROM pending_uploads WHERE id = ? AND user_id = ?').bind(String(body.upload_id || ''), payload.sub).first() as any;
    if (!pending) return json({ error: 'Upload não encontrado' }, 404);

    const { uploadId } = await createMultipartUpload(cfg, pending.r2_key, { contentType: body.mime_type || pending.mime_type || 'video/mp4' });
    await env.DB.prepare('UPDATE pending_uploads SET upload_id = ? WHERE id = ?').bind(uploadId, pending.id).run();
    return json({ upload_id_s3: uploadId });
  } catch (e: any) {
    return json({ error: e.message || 'Erro ao iniciar multipart' }, 500);
  }
}

// POST /api/upload/multipart/part-url
// Body: { upload_id, r2_key, upload_id_s3, part_number }
// Returns { presigned_url } for the part PUT.
async function multipartPartUrl(request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  try {
    const body = (await request.json()) as any;
    const cfg = safeR2S3Config(env);
    if (!cfg) return json({ error: 'Multipart exige credenciais S3 configuradas no Worker' }, 400);

    const pending = await env.DB.prepare('SELECT * FROM pending_uploads WHERE id = ? AND user_id = ?').bind(String(body.upload_id || ''), payload.sub).first() as any;
    if (!pending) return json({ error: 'Upload não encontrado' }, 404);

    const partNumber = Number(body.part_number || 0);
    if (partNumber < 1 || partNumber > 10000) return json({ error: 'part_number inválido' }, 400);

    const url = await presignPartUrl(cfg, pending.r2_key, String(body.upload_id_s3 || pending.upload_id), partNumber, { expiresIn: 3600 });
    return json({ presigned_url: url, part_number: partNumber });
  } catch (e: any) {
    return json({ error: e.message || 'Erro ao gerar URL da parte' }, 500);
  }
}

// POST /api/upload/multipart/complete
// Body: { upload_id, upload_id_s3, parts: [{PartNumber, ETag}] }
// Completes the S3 multipart upload (does NOT register in D1 — call /api/upload/complete after).
async function multipartComplete(request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  try {
    const body = (await request.json()) as any;
    const cfg = safeR2S3Config(env);
    if (!cfg) return json({ error: 'Multipart exige credenciais S3 configuradas no Worker' }, 400);

    const pending = await env.DB.prepare('SELECT * FROM pending_uploads WHERE id = ? AND user_id = ?').bind(String(body.upload_id || ''), payload.sub).first() as any;
    if (!pending) return json({ error: 'Upload não encontrado' }, 404);

    const parts = (body.parts || []).map((p: any) => ({ PartNumber: Number(p.PartNumber), ETag: String(p.ETag).replace(/"/g, '') }));
    if (!parts.length) return json({ error: 'Nenhuma parte informada' }, 400);

    await completeMultipartUpload(cfg, pending.r2_key, String(body.upload_id_s3 || pending.upload_id), parts);
    return json({ ok: true });
  } catch (e: any) {
    return json({ error: e.message || 'Erro ao completar multipart' }, 500);
  }
}

// GET|HEAD /api/videos/stream/<r2_key>  and  /api/videos/thumb/<r2_key>
// Streams an R2 object with HTTP Range support (video seeking) via env.BUCKET.get().
async function streamR2Object(key: string, request: Request, env: Env, kind: 'video' | 'image'): Promise<Response> {
  try {
    await ensureUploadSchema(env);
    const range = request.headers.get('Range');
    const object = await env.BUCKET.get(key, range ? { range: parseRangeHeader(range) } : undefined);

    if (!object) {
      return json({ error: 'Arquivo não encontrado' }, 404);
    }

    const headers = new Headers();
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=86400, immutable');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Range,Content-Type,Authorization');

    const contentType = object.httpMetadata?.contentType || (kind === 'image' ? 'image/jpeg' : 'video/mp4');
    headers.set('Content-Type', contentType);

    if (object.range) {
      const range = object.range as R2Range;
      let start: number;
      let end: number;
      if ('suffix' in range) {
        start = Math.max(0, object.size - range.suffix);
        end = object.size - 1;
      } else if (range.offset !== undefined) {
        start = range.offset;
        end = range.length !== undefined ? range.offset + range.length - 1 : object.size - 1;
      } else {
        start = 0;
        end = object.size - 1;
      }
      end = Math.min(end, object.size - 1);
      headers.set('Content-Range', `bytes ${start}-${end}/${object.size}`);
      headers.set('Content-Length', String(Math.max(0, end - start + 1)));
      return new Response(object.body, { status: 206, headers });
    }

    headers.set('Content-Length', String(object.size));
    if (request.method === 'HEAD') {
      return new Response(null, { status: 200, headers });
    }
    return new Response(object.body, { status: 200, headers });
  } catch (e: any) {
    return json({ error: 'Erro ao ler arquivo' }, 500);
  }
}

function parseRangeHeader(range: string): R2Range {
  const m = /bytes=(\d*)-(\d*)/.exec(range);
  if (!m) return { suffix: 0 };
  const start = m[1] ? parseInt(m[1], 10) : undefined;
  const end = m[2] ? parseInt(m[2], 10) : undefined;
  if (start !== undefined && end !== undefined) return { offset: start, length: end - start + 1 };
  if (start !== undefined) return { offset: start };
  if (end !== undefined) return { suffix: end }; // last N bytes
  return { suffix: 0 };
}

// ──────── MAIN HANDLER ─────────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      return await route(request.method, url.pathname, request, env);
    } catch (e: any) {
      return json({ error: 'Internal server error', message: e.message }, 500);
    }
  },
};
