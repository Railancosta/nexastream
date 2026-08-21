// NexaStream API — Cloudflare Workers (100% free tier)
// Handles: auth, videos, feed, WebTorrent, P2P reporting

export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  JWT_SECRET: string;
}

interface Video {
  id: string;
  title: string;
  description: string;
  channel_name: string;
  video_path: string;
  thumbnail_path: string;
  magnet_uri: string;
  info_hash: string;
  duration: number;
  size: number;
  is_short: number;
  views: number;
  likes: number;
  status: string;
  created_at: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  channel_name: string;
  created_at: string;
}

// --- CORS Headers ---
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// --- Response Helpers ---
function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function error(message: string, status = 400) {
  return json({ error: message }, status);
}

// --- JWT Helpers (simple HMAC) ---
async function createToken(userId: string, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ sub: userId, iat: Date.now(), exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
  const data = `${header}.${payload}`;
  
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return `${data}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;
}

async function verifyToken(token: string, secret: string): Promise<string | null> {
  try {
    const [header, payload, sig] = token.split('.');
    const data = `${header}.${payload}`;
    
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    
    const sigBytes = Uint8Array.from(atob(sig), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));
    
    if (!valid) return null;
    
    const p = JSON.parse(atob(payload));
    if (p.exp < Date.now()) return null;
    
    return p.sub;
  } catch {
    return null;
  }
}

// --- Hash Password ---
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomUUID().slice(0, 8);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password + salt),
    { name: 'PBKDF2', hash: 'SHA-256' },
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  return salt + '.' + btoa(String.fromCharCode(...new Uint8Array(bits)));
}

// --- Main Handler ---
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // --- Auth Routes ---
    if (path === '/api/auth/register' && method === 'POST') {
      const body = await request.json() as any;
      const { username, email, password, channel_name } = body;
      
      if (!username || !email || !password) {
        return error('Username, email, and password required');
      }
      
      // Check if user exists
      const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ? OR username = ?')
        .bind(email, username).first();
      if (existing) {
        return error('User already exists', 409);
      }
      
      const id = crypto.randomUUID();
      const password_hash = await hashPassword(password);
      
      await env.DB.prepare(
        'INSERT INTO users (id, username, email, password_hash, channel_name, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(id, username, email, password_hash, channel_name || username, new Date().toISOString()).run();
      
      const token = await createToken(id, env.JWT_SECRET);
      return json({ token, user: { id, username, email, channel_name: channel_name || username } });
    }

    if (path === '/api/auth/login' && method === 'POST') {
      const body = await request.json() as any;
      const { email, password } = body;
      
      const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first() as User | null;
      if (!user) {
        return error('Invalid credentials', 401);
      }
      
      // Verify password
      const [salt, hash] = user.password_hash.split('.');
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password + salt),
        { name: 'PBKDF2', hash: 'SHA-256' },
        false,
        ['deriveBits']
      );
      const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' },
        key,
        256
      );
      const computedHash = btoa(String.fromCharCode(...new Uint8Array(bits)));
      
      if (computedHash !== hash) {
        return error('Invalid credentials', 401);
      }
      
      const token = await createToken(user.id, env.JWT_SECRET);
      return json({ token, user: { id: user.id, username: user.username, email: user.email, channel_name: user.channel_name } });
    }

    // --- Video Routes ---
    if (path === '/api/videos' && method === 'GET') {
      const videos = await env.DB.prepare(
        'SELECT * FROM videos WHERE status = ? ORDER BY created_at DESC LIMIT 50'
      ).bind('ready').all();
      return json({ videos: videos.results });
    }

    if (path === '/api/feed' && method === 'GET') {
      const tab = url.searchParams.get('tab') || 'all';
      const viewer = url.searchParams.get('viewer') || 'anon';
      
      let query = 'SELECT * FROM videos WHERE status = ?';
      if (tab === 'shorts') query += ' AND is_short = 1';
      else if (tab === 'videos') query += ' AND is_short = 0';
      query += ' ORDER BY views DESC, created_at DESC LIMIT 30';
      
      const videos = await env.DB.prepare(query).bind('ready').all();
      
      // Simple ranking: boost by engagement
      const ranked = videos.results.map((v: any) => ({
        ...v,
        score: (v.likes || 0) * 3 + (v.views || 0) * 0.1
      })).sort((a: any, b: any) => b.score - a.score);
      
      const shorts = ranked.filter((v: any) => v.is_short);
      const longVideos = ranked.filter((v: any) => !v.is_short);
      
      return json({ shorts, videos: longVideos, algorithm: 'engagement+recency' });
    }

    if (path.startsWith('/api/videos/') && method === 'GET') {
      const id = path.split('/')[3];
      const video = await env.DB.prepare('SELECT * FROM videos WHERE id = ?').bind(id).first();
      if (!video) return error('Video not found', 404);
      
      // Increment views
      await env.DB.prepare('UPDATE videos SET views = views + 1 WHERE id = ?').bind(id).run();
      
      return json(video);
    }

    if (path === '/api/videos/upload' && method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return error('Unauthorized', 401);
      }
      
      const userId = await verifyToken(authHeader.slice(7), env.JWT_SECRET);
      if (!userId) return error('Invalid token', 401);
      
      const formData = await request.formData();
      const file = formData.get('video') as File;
      const title = formData.get('title') as string || 'Untitled';
      const description = formData.get('description') as string || '';
      
      if (!file) return error('No video file provided');
      
      // Generate video ID and content hash
      const videoId = 'v_' + crypto.randomUUID().slice(0, 8);
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const infoHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Generate magnet URI
      const magnetUri = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(title)}&tr=wss://tracker.openwebtorrent.com&wss://tracker.btorrent.xyz`;
      
      // Store video metadata in D1
      await env.DB.prepare(
        `INSERT INTO videos (id, title, description, channel_name, video_path, thumbnail_path, magnet_uri, info_hash, duration, size, is_short, views, likes, status, created_at, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'ready', ?, ?)`
      ).bind(
        videoId,
        title,
        description,
        (await env.DB.prepare('SELECT channel_name FROM users WHERE id = ?').bind(userId).first())?.channel_name || 'Unknown',
        `/storage/videos/${videoId}.mp4`,
        `/storage/thumbs/${videoId}.jpg`,
        magnetUri,
        infoHash,
        0,
        file.size,
        file.size < 10 * 1024 * 1024 && file.type.includes('short') ? 1 : 0,
        new Date().toISOString(),
        userId
      ).run();
      
      // Store file in R2
      await env.R2.put(`videos/${videoId}.mp4`, arrayBuffer, {
        httpMetadata: { contentType: file.type },
      });
      
      return json({ videoId, magnetUri, infoHash, pipeline: 'started' });
    }

    // --- WebTorrent / P2P Routes ---
    if (path === '/api/p2p/report' && method === 'POST') {
      const body = await request.json() as any;
      const { videoId, bytesUploaded, bytesDownloaded, peerId, timestamp } = body;
      
      // Store bandwidth report
      await env.DB.prepare(
        'INSERT INTO bandwidth_reports (video_id, peer_id, bytes_uploaded, bytes_downloaded, timestamp) VALUES (?, ?, ?, ?, ?)'
      ).bind(videoId, peerId, bytesUploaded, bytesDownloaded, timestamp).run();
      
      // Calculate seeding reward (1 NST per GB served)
      const gbServed = bytesUploaded / (1024 * 1024 * 1024);
      if (gbServed > 0.1) {
        const reward = Math.floor(gbServed * 100); // 100 NST per GB
        await env.DB.prepare(
          'UPDATE users SET nst_balance = nst_balance + ? WHERE id = (SELECT user_id FROM videos WHERE id = ?)'
        ).bind(reward, videoId).run();
      }
      
      return json({ ok: true, reward: Math.floor(gbServed * 100) });
    }

    if (path === '/api/p2p/peers' && method === 'GET') {
      const videoId = url.searchParams.get('videoId');
      if (!videoId) return error('videoId required');
      
      // Get recent peers for this video
      const peers = await env.DB.prepare(
        'SELECT DISTINCT peer_id, SUM(bytes_uploaded) as total_uploaded FROM bandwidth_reports WHERE video_id = ? GROUP BY peer_id ORDER BY total_uploaded DESC LIMIT 50'
      ).bind(videoId).all();
      
      return json({ peers: peers.results });
    }

    // --- NST / Blockchain Routes ---
    if (path === '/api/chain/balance' && method === 'GET') {
      const userId = url.searchParams.get('userId');
      if (!userId) return error('userId required');
      
      const user = await env.DB.prepare('SELECT nst_balance FROM users WHERE id = ?').bind(userId).first();
      return json({ balance: (user as any)?.nst_balance || 0 });
    }

    if (path === '/api/mod/removed' && method === 'GET') {
      const removed = await env.DB.prepare('SELECT video_id FROM moderation WHERE action = ?').bind('remove').all();
      return json({ removed: removed.results.map((r: any) => r.video_id) });
    }

    // --- Health Check ---
    if (path === '/api/health') {
      return json({ status: 'ok', service: 'nexastream-api', timestamp: Date.now() });
    }

    // --- 404 ---
    return error('Not found', 404);
  },
};
