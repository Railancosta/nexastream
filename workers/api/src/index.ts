// NexaStream Backend API — Cloudflare Workers + D1 + R2
// Core services: Auth, Videos, Feed, Treasury, P2P, Wallets

export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  FRONTEND_URL: string;
}

// ─── UTILS ───────────────────────────────────────────────────────────
function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' },
  });
}

function cors() {
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } });
}

// Simple JWT (HS256) without external deps
function base64url(buf: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof buf === 'string' ? new TextEncoder().encode(buf) : new Uint8Array(buf);
  let binary = ''; for (const b of bytes) binary += String.fromCharCode(b);
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
    const valid = await crypto.subtle.verify('HMAC', key, new TextEncoder().encode(`${header}.${body}`), base64urlToBytes(sig));
    if (!valid) return null;
    const payload = JSON.parse(atob(body.replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

function base64urlToBytes(str: string) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
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

// ─── ROUTER ──────────────────────────────────────────────────────────
async function route(method: string, path: string, request: Request, env: Env): Promise<Response> {
  // CORS preflight
  if (method === 'OPTIONS') return cors();

  // ─── AUTH ────────────────────────────────────────────────────
  if (path === '/api/auth/register' && method === 'POST') {
    return register(request, env);
  }
  if (path === '/api/auth/login' && method === 'POST') {
    return login(request, env);
  }
  if (path === '/api/auth/me' && method === 'GET') {
    return me(request, env);
  }

  // ─── VIDEOS ─────────────────────────────────────────────────
  if (path === '/api/videos' && method === 'GET') {
    return listVideos(request, env);
  }
  if (path.match(/^\/api\/videos\/[\w-]+$/) && method === 'GET') {
    const id = path.split('/').pop()!;
    return getVideo(id, env);
  }
  if (path === '/api/videos/upload' && method === 'POST') {
    return uploadVideo(request, env);
  }
  if (path.match(/^\/api\/videos\/[\w-]+\/like$/) && method === 'POST') {
    const id = path.split('/')[3];
    return likeVideo(id, request, env);
  }
  if (path.match(/^\/api\/videos\/[\w-]+\/watch$/) && method === 'POST') {
    const id = path.split('/')[3];
    return watchVideo(id, request, env);
  }

  // ─── FEED ───────────────────────────────────────────────────
  if (path.startsWith('/api/feed') && method === 'GET') {
    return getFeed(request, env);
  }

  // ─── SEARCH ─────────────────────────────────────────────────
  if (path.startsWith('/api/search') && method === 'GET') {
    return search(request, env);
  }

  // ─── CREATOR ECONOMY / TREASURY ─────────────────────────────
  if (path === '/api/treasury/balance' && method === 'GET') {
    return getBalance(request, env);
  }
  if (path === '/api/treasury/transactions' && method === 'GET') {
    return getTransactions(request, env);
  }
  if (path === '/api/treasury/withdraw' && method === 'POST') {
    return withdraw(request, env);
  }

  // ─── WALLET ─────────────────────────────────────────────────
  if (path === '/api/wallet/connect' && method === 'POST') {
    return connectWallet(request, env);
  }
  if (path === '/api/wallet/info' && method === 'GET') {
    return getWalletInfo(request, env);
  }

  // ─── P2P / WEBTORRENT ──────────────────────────────────────
  if (path === '/api/p2p/report' && method === 'POST') {
    return reportSeeding(request, env);
  }
  if (path === '/api/p2p/peers' && method === 'GET') {
    return getPeers(request, env);
  }

  // ─── COMMENTS ───────────────────────────────────────────────
  if (path.match(/^\/api\/videos\/[\w-]+\/comments$/) && method === 'GET') {
    const id = path.split('/')[3];
    return getComments(id, env);
  }
  if (path.match(/^\/api\/videos\/[\w-]+\/comments$/) && method === 'POST') {
    const id = path.split('/')[3];
    return addComment(id, request, env);
  }

  // ─── HEALTH ─────────────────────────────────────────────────
  if (path === '/api/health') {
    return json({ status: 'ok', service: 'nexastream-api', version: '2.0.0', timestamp: Date.now() });
  }

  return json({ error: 'Not found', path }, 404);
}

// ─── AUTH HANDLERS ───────────────────────────────────────────────────
async function register(request: Request, env: Env): Promise<Response> {
  try {
    const { username, email, password } = await request.json();
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
    const { email, password } = await request.json();
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

// ─── VIDEO HANDLERS ──────────────────────────────────────────────────
async function listVideos(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
  const offset = (page - 1) * limit;
  const category = url.searchParams.get('category');

  let query = 'SELECT v.*, u.username as creator_name FROM videos v LEFT JOIN users u ON v.user_id = u.id';
  let countQuery = 'SELECT COUNT(*) as total FROM videos v';
  const params: any[] = [];

  if (category) {
    query += ' WHERE v.category = ?';
    countQuery += ' WHERE v.category = ?';
    params.push(category);
  }
  query += ' ORDER BY v.created_at DESC LIMIT ? OFFSET ?';

  const stmt = params.length ? env.DB.prepare(query).bind(...params, limit, offset) : env.DB.prepare(query).bind(limit, offset);
  const { results } = await stmt.all();
  const countStmt = params.length ? env.DB.prepare(countQuery).bind(...params) : env.DB.prepare(countQuery);
  const { total } = (await countStmt.first()) as any;

  return json({ videos: results, total, page, limit });
}

async function getVideo(id: string, env: Env): Promise<Response> {
  const video = await env.DB.prepare('SELECT v.*, u.username as creator_name FROM videos v LEFT JOIN users u ON v.user_id = u.id WHERE v.id = ?').bind(id).first();
  if (!video) return json({ error: 'Vídeo não encontrado' }, 404);

  // Increment view count
  await env.DB.prepare('UPDATE videos SET views = views + 1 WHERE id = ?').bind(id).run();
  return json({ video });
}

async function uploadVideo(request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  try {
    const { title, description, category, duration, is_short, video_url, thumbnail_url } = await request.json();
    if (!title) return json({ error: 'Título é obrigatório' }, 400);

    const id = generateId();
    await env.DB.prepare(`INSERT INTO videos (id, user_id, title, description, category, duration, is_short, video_url, thumbnail_url, views, likes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, datetime("now"))`).bind(id, payload.sub, title, description || '', category || 'tech', duration || 0, is_short ? 1 : 0, video_url || '', thumbnail_url || '').run();

    const video = await env.DB.prepare('SELECT * FROM videos WHERE id = ?').bind(id).first();
    return json({ video }, 201);
  } catch (e: any) {
    return json({ error: e.message || 'Erro no upload' }, 500);
  }
}

async function likeVideo(id: string, request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  const existing = await env.DB.prepare('SELECT id FROM likes WHERE video_id = ? AND user_id = ?').bind(id, payload.sub).first();
  if (existing) {
    await env.DB.prepare('DELETE FROM likes WHERE video_id = ? AND user_id = ?').bind(id, payload.sub).run();
    await env.DB.prepare('UPDATE videos SET likes = MAX(0, likes - 1) WHERE id = ?').bind(id).run();
    return json({ liked: false });
  } else {
    await env.DB.prepare('INSERT INTO likes (video_id, user_id, created_at) VALUES (?, ?, datetime("now"))').bind(id, payload.sub).run();
    await env.DB.prepare('UPDATE videos SET likes = likes + 1 WHERE id = ?').bind(id).run();
    // Credit creator with NST
    const video = await env.DB.prepare('SELECT user_id FROM videos WHERE id = ?').bind(id).first() as any;
    if (video && video.user_id !== payload.sub) {
      await env.DB.prepare('UPDATE users SET nst_balance = nst_balance + 5 WHERE id = ?').bind(video.user_id).run();
      await env.DB.prepare('INSERT INTO transactions (id, user_id, type, amount, description, created_at) VALUES (?, ?, "like_reward", 5, ?, datetime("now"))').bind(generateId(), video.user_id, `Like no vídeo ${id}`).run();
    }
    return json({ liked: true });
  }
}

async function watchVideo(id: string, request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  const { seconds, completed } = await request.json();
  await env.DB.prepare('INSERT INTO watch_history (video_id, user_id, seconds_watched, completed, created_at) VALUES (?, ?, ?, ?, datetime("now"))').bind(id, payload.sub, seconds || 0, completed ? 1 : 0).run();

  // Anti-fraud: only credit if watched > 30% and not bot-like
  if (completed || (seconds && seconds > 30)) {
    const video = await env.DB.prepare('SELECT user_id, duration FROM videos WHERE id = ?').bind(id).first() as any;
    if (video && video.user_id !== payload.sub) {
      const reward = completed ? 2 : 1;
      await env.DB.prepare('UPDATE users SET nst_balance = nst_balance + ? WHERE id = ?').bind(reward, video.user_id).run();
      await env.DB.prepare('INSERT INTO transactions (id, user_id, type, amount, description, created_at) VALUES (?, ?, "watch_reward", ?, ?, datetime("now"))').bind(generateId(), video.user_id, `Watch ${seconds}s no vídeo ${id}`).run();
    }
  }
  return json({ ok: true });
}

// ─── FEED ────────────────────────────────────────────────────────────
async function getFeed(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const tab = url.searchParams.get('tab') || 'all';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);

  let query = 'SELECT v.*, u.username as creator_name FROM videos v LEFT JOIN users u ON v.user_id = u.id';
  if (tab === 'shorts') query += ' WHERE v.is_short = 1';
  else if (tab === 'videos') query += ' WHERE v.is_short = 0';
  query += ' ORDER BY (v.likes * 3 + v.views) DESC, v.created_at DESC LIMIT ?';

  const { results } = await env.DB.prepare(query).bind(limit).all();
  return json({ videos: results, tab });
}

// ─── SEARCH ──────────────────────────────────────────────────────────
async function search(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  if (!q) return json({ videos: [] });

  const { results } = await env.DB.prepare('SELECT v.*, u.username as creator_name FROM videos v LEFT JOIN users u ON v.user_id = u.id WHERE v.title LIKE ? OR v.description LIKE ? OR v.category LIKE ? ORDER BY v.created_at DESC LIMIT 20').bind(`%${q}%`, `%${q}%`, `%${q}%`).all();
  return json({ videos: results, query: q });
}

// ─── TREASURY / ECONOMY ──────────────────────────────────────────────
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

  const { amount, currency, wallet_address, memo } = await request.json();
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

// ─── WALLET ──────────────────────────────────────────────────────────
async function connectWallet(request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  const { address, chain, wallet_type } = await request.json();
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

// ─── P2P / WEBTORRENT ────────────────────────────────────────────────
async function reportSeeding(request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  const { video_id, bytes_uploaded, duration_seconds } = await request.json();
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

// ─── COMMENTS ────────────────────────────────────────────────────────
async function getComments(videoId: string, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare('SELECT c.*, u.username FROM comments c LEFT JOIN users u ON c.user_id = u.id WHERE c.video_id = ? ORDER BY c.created_at DESC LIMIT 50').bind(videoId).all();
  return json({ comments: results });
}

async function addComment(videoId: string, request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return json({ error: 'Autenticação necessária' }, 401);

  const { text } = await request.json();
  if (!text?.trim()) return json({ error: 'Comentário não pode ser vazio' }, 400);

  const id = generateId();
  await env.DB.prepare('INSERT INTO comments (id, video_id, user_id, text, created_at) VALUES (?, ?, ?, ?, datetime("now"))').bind(id, videoId, payload.sub, text).run();

  // Credit 10 NST for commenting
  await env.DB.prepare('UPDATE users SET nst_balance = nst_balance + 10 WHERE id = ?').bind(payload.sub).run();
  await env.DB.prepare('INSERT INTO transactions (id, user_id, type, amount, description, created_at) VALUES (?, ?, "comment_reward", 10, ?, datetime("now"))').bind(generateId(), payload.sub, `Comentário no vídeo ${videoId}`).run();

  return json({ ok: true, id }, 201);
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────
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
