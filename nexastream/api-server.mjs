/**
 * NexaStream API Server — Pure JavaScript (no build needed)
 * Runs on Termux/Android 24/7. Works with localtunnel for public URL.
 *
 * Endpoints:
 * POST /api/v1/auth/register  — register with email/password
 * POST /api/v1/auth/login     — login with email/password
 * GET  /api/v1/health         — health check
 * GET  /api/v1/feed           — video feed
 * POST /api/v1/uploads        — init upload
 * PUT  /api/v1/uploads/:id/chunks/:index — upload chunk
 * POST /api/v1/uploads/:id/complete — finalize upload
 * GET  /api/v1/videos/:id     — video details
 * GET  /api/v1/search?q=     — search videos
 * POST /api/v1/videos/:id/like — like video
 * POST /api/v1/videos/:id/comments — add comment
 * GET  /api/v1/videos/:id/comments — get comments
 */
import http from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import { join } from "node:path";

const PORT = process.env.API_PORT || 4000;
const HOST = "0.0.0.0";
const JWT_SECRET = process.env.JWT_SECRET || "nexastream-dev-secret-32-chars-min";

// In-memory stores
const users = new Map();
const sessions = new Map();
const videos = new Map();
const comments = new Map();
const likes = new Set();
const uploads = new Map();

function hash(data) { return createHash("sha256").update(data).digest("hex"); }
function genId() { return randomBytes(16).toString("hex"); }
function sign(payload) { return hash(JSON.stringify(payload) + JWT_SECRET); }

function verify(token) {
  for (const [addr, sess] of sessions) {
    if (sess.token === token && Date.now() < sess.expires) return sess;
  }
  return null;
}

function send(res, code, data) {
  res.writeHead(code, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" });
  res.end(JSON.stringify(data));
}

function getBody(req) {
  return new Promise((resolve) => {
    let data = ""; req.on("data", c => data += c); req.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
  });
}

function getAuth(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return verify(auth.slice(7));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;
  const method = req.method;

  if (method === "OPTIONS") { send(res, 204, {}); return; }

  try {
    // Health
    if (path === "/api/v1/health" && method === "GET") {
      send(res, 200, { status: "ok", service: "nexastream-api", version: "1.0.0", videos: videos.size, users: users.size });
      return;
    }

    // Register
    if (path === "/api/v1/auth/register" && method === "POST") {
      const body = await getBody(req);
      if (!body.email || !body.username || !body.password) { send(res, 400, { error: "email, username, password required" }); return; }
      if (body.password.length < 8) { send(res, 400, { error: "password min 8 chars" }); return; }
      for (const u of users.values()) { if (u.email === body.email || u.username === body.username) { send(res, 409, { error: "already exists" }); return; } }
      const id = genId();
      const user = { id, email: body.email, username: body.username, role: "user", passwordHash: hash(body.password), createdAt: Date.now() };
      users.set(id, user);
      const token = sign({ id, email: body.email });
      sessions.set(id, { token, userId: id, expires: Date.now() + 86400000 });
      send(res, 201, { user: { id, email: user.email, username: user.username, role: user.role }, accessToken: token });
      return;
    }

    // Login
    if (path === "/api/v1/auth/login" && method === "POST") {
      const body = await getBody(req);
      if (!body.email || !body.password) { send(res, 400, { error: "email, password required" }); return; }
      let found = null;
      for (const u of users.values()) { if (u.email === body.email && u.passwordHash === hash(body.password)) { found = u; break; } }
      if (!found) { send(res, 401, { error: "invalid credentials" }); return; }
      const token = sign({ id: found.id, email: found.email });
      sessions.set(found.id, { token, userId: found.id, expires: Date.now() + 86400000 });
      send(res, 200, { user: { id: found.id, email: found.email, username: found.username, role: found.role }, accessToken: token });
      return;
    }

    // Logout
    if (path === "/api/v1/auth/logout" && method === "POST") {
      const sess = getAuth(req);
      if (sess) sessions.delete(sess.userId);
      send(res, 200, { ok: true });
      return;
    }

    // Feed
    if (path === "/api/v1/feed" && method === "GET") {
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const all = Array.from(videos.values()).sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
      send(res, 200, { videos: all.map(v => ({ ...v, likes: 0 })), count: all.length });
      return;
    }

    // Search
    if (path === "/api/v1/search" && method === "GET") {
      const q = (url.searchParams.get("q") || "").toLowerCase();
      if (!q) { send(res, 200, { videos: [], count: 0 }); return; }
      const results = Array.from(videos.values()).filter(v => v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q));
      send(res, 200, { videos: results, count: results.length });
      return;
    }

    // Upload init
    if (path === "/api/v1/uploads" && method === "POST") {
      const sess = getAuth(req); if (!sess) { send(res, 401, { error: "auth required" }); return; }
      const body = await getBody(req);
      if (!body.filename || !body.mimeType || !body.declaredSize) { send(res, 400, { error: "filename, mimeType, declaredSize required" }); return; }
      const uploadId = genId();
      uploads.set(uploadId, { ...body, userId: sess.userId, chunks: [], status: "active" });
      send(res, 201, { uploadId });
      return;
    }

    // Upload chunk
    if (path.match(/\/api\/v1\/uploads\/[^/]+\/chunks\/\d+$/) && method === "PUT") {
      const sess = getAuth(req); if (!sess) { send(res, 401, { error: "auth required" }); return; }
      const parts = path.split("/");
      const uploadId = parts[4]; const index = parseInt(parts[6]);
      const upload = uploads.get(uploadId); if (!upload) { send(res, 404, { error: "upload not found" }); return; }
      const chunkData = [];
      for await (const c of req) chunkData.push(c);
      const buf = Buffer.concat(chunkData);
      upload.chunks[index] = buf;
      send(res, 200, { uploadId, index, size: buf.length, accepted: true });
      return;
    }

    // Complete upload
    if (path.match(/\/api\/v1\/uploads\/[^/]+\/complete$/) && method === "POST") {
      const sess = getAuth(req); if (!sess) { send(res, 401, { error: "auth required" }); return; }
      const uploadId = path.split("/")[4];
      const upload = uploads.get(uploadId); if (!upload) { send(res, 404, { error: "upload not found" }); return; }
      const fullBuf = Buffer.concat(upload.chunks.filter(Boolean));
      const sha256 = hash(fullBuf);
      const videoId = genId();
      const user = users.get(sess.userId);
      const video = { id: videoId, title: upload.filename, description: "", contentHash: sha256, creatorId: user.username, creatorId: user.username, createdAt: Date.now(), views: 0, status: "published" };
      videos.set(videoId, video);
      uploads.delete(uploadId);
      send(res, 200, { uploadId, status: "completed", sha256, size: fullBuf.length, videoId });
      return;
    }

    // Get video
    if (path.match(/\/api\/v1\/videos\/[^/]+$/) && method === "GET") {
      const id = path.split("/")[4];
      const video = videos.get(id);
      if (!video) { send(res, 404, { error: "video not found" }); return; }
      video.views++;
      send(res, 200, video);
      return;
    }

    // Like
    if (path.match(/\/api\/v1\/videos\/[^/]+\/like$/) && method === "POST") {
      const sess = getAuth(req); if (!sess) { send(res, 401, { error: "auth required" }); return; }
      const id = path.split("/")[4];
      const key = sess.userId + ":" + id;
      if (likes.has(key)) { send(res, 200, { liked: false }); return; }
      likes.add(key);
      send(res, 200, { liked: true });
      return;
    }

    // Comments
    if (path.match(/\/api\/v1\/videos\/[^/]+\/comments$/) && method === "POST") {
      const sess = getAuth(req); if (!sess) { send(res, 401, { error: "auth required" }); return; }
      const id = path.split("/")[4];
      const body = await getBody(req);
      if (!body.content || body.content.trim().length === 0) { send(res, 400, { error: "content required" }); return; }
      const user = users.get(sess.userId);
      const comment = { id: genId(), videoId: id, authorId: user.username, content: body.content.slice(0, 2000), createdAt: Date.now(), status: "visible" };
      if (!comments.has(id)) comments.set(id, []);
      comments.get(id).push(comment);
      send(res, 201, comment);
      return;
    }

    if (path.match(/\/api\/v1\/videos\/[^/]+\/comments$/) && method === "GET") {
      const id = path.split("/")[4];
      const list = comments.get(id) || [];
      send(res, 200, { comments: list, count: list.length });
      return;
    }

    // 404
    send(res, 404, { error: "not found", endpoints: ["/api/v1/health", "/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/feed", "/api/v1/search", "/api/v1/uploads"] });
  } catch (err) {
    send(res, 500, { error: "internal error" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[api] listening on ${HOST}:${PORT}`);
  console.log(`[api] health: http://localhost:${PORT}/api/v1/health`);
  console.log(`[api] feed: http://localhost:${PORT}/api/v1/feed`);
});
