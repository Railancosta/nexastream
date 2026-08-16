/**
 * NexaStream API — Cloudflare Workers Edition
 * 100% free, 24/7, global edge, no VPS needed
 * Uses Cloudflare KV for storage (free tier)
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Content-Type": "application/json",
    };

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const json = (code, data) => new Response(JSON.stringify(data), { status: code, headers: corsHeaders });

    try {
      // Health
      if (path === "/api/v1/health" && method === "GET") {
        return json(200, { status: "ok", service: "nexastream-api", version: "1.0.0", runtime: "cloudflare-workers" });
      }

      // Register
      if (path === "/api/v1/auth/register" && method === "POST") {
        const body = await request.json();
        if (!body.email || !body.username || !body.password) return json(400, { error: "email, username, password required" });
        if (body.password.length < 8) return json(400, { error: "password min 8 chars" });
        
        const userId = crypto.randomUUID();
        const user = { id: userId, email: body.email, username: body.username, role: "user", createdAt: Date.now() };
        
        // Store in KV
        await env.NST_USERS.put(`email:${body.email}`, JSON.stringify({ ...user, password: body.password }));
        await env.NST_USERS.put(`user:${userId}`, JSON.stringify({ ...user, password: body.password }));
        
        const token = crypto.randomUUID() + crypto.randomUUID();
        await env.NST_SESSIONS.put(`session:${token}`, JSON.stringify({ userId, expires: Date.now() + 86400000 }));
        
        return json(201, { user: { id: userId, email: user.email, username: user.username, role: user.role }, accessToken: token });
      }

      // Login
      if (path === "/api/v1/auth/login" && method === "POST") {
        const body = await request.json();
        if (!body.email || !body.password) return json(400, { error: "email, password required" });
        
        const data = await env.NST_USERS.get(`email:${body.email}`);
        if (!data) return json(401, { error: "invalid credentials" });
        const user = JSON.parse(data);
        if (user.password !== body.password) return json(401, { error: "invalid credentials" });
        
        const token = crypto.randomUUID() + crypto.randomUUID();
        await env.NST_SESSIONS.put(`session:${token}`, JSON.stringify({ userId: user.id, expires: Date.now() + 86400000 }));
        
        return json(200, { user: { id: user.id, email: user.email, username: user.username, role: user.role }, accessToken: token });
      }

      // Logout
      if (path === "/api/v1/auth/logout" && method === "POST") {
        const auth = request.headers.get("Authorization");
        if (auth && auth.startsWith("Bearer ")) {
          const token = auth.slice(7);
          await env.NST_SESSIONS.delete(`session:${token}`);
        }
        return json(200, { ok: true });
      }

      // Feed
      if (path === "/api/v1/feed" && method === "GET") {
        const list = await env.NST_VIDEOS.list({ limit: 20 });
        const videos = [];
        for (const key of list.keys) {
          const v = JSON.parse(await env.NST_VIDEOS.get(key.name));
          videos.push(v);
        }
        videos.sort((a, b) => b.createdAt - a.createdAt);
        return json(200, { videos, count: videos.length });
      }

      // Search
      if (path === "/api/v1/search" && method === "GET") {
        const q = (url.searchParams.get("q") || "").toLowerCase();
        const list = await env.NST_VIDEOS.list({ limit: 100 });
        const results = [];
        for (const key of list.keys) {
          const v = JSON.parse(await env.NST_VIDEOS.get(key.name));
          if (v.title.toLowerCase().includes(q) || (v.description || "").toLowerCase().includes(q)) {
            results.push(v);
          }
        }
        return json(200, { videos: results, count: results.length });
      }

      // Upload init
      if (path === "/api/v1/uploads" && method === "POST") {
        const auth = request.headers.get("Authorization");
        if (!auth || !auth.startsWith("Bearer ")) return json(401, { error: "auth required" });
        const token = auth.slice(7);
        const sess = JSON.parse(await env.NST_SESSIONS.get(`session:${token}`) || "{}");
        if (!sess.userId || Date.now() > sess.expires) return json(401, { error: "session expired" });

        const body = await request.json();
        const uploadId = crypto.randomUUID();
        await env.NST_VIDEOS.put(`upload:${uploadId}`, JSON.stringify({ ...body, userId: sess.userId, status: "active" }));
        return json(201, { uploadId });
      }

      // Complete upload
      if (path.match(/\/api\/v1\/uploads\/[^/]+\/complete$/) && method === "POST") {
        const auth = request.headers.get("Authorization");
        if (!auth || !auth.startsWith("Bearer ")) return json(401, { error: "auth required" });
        const token = auth.slice(7);
        const sess = JSON.parse(await env.NST_SESSIONS.get(`session:${token}`) || "{}");
        if (!sess.userId) return json(401, { error: "session expired" });

        const uploadId = path.split("/")[4];
        const upload = JSON.parse(await env.NST_VIDEOS.get(`upload:${uploadId}`) || "{}");
        if (!upload.filename) return json(404, { error: "upload not found" });

        const videoId = crypto.randomUUID();
        const user = JSON.parse(await env.NST_USERS.get(`user:${sess.userId}`) || "{}");
        const video = {
          id: videoId,
          title: upload.filename,
          description: "",
          creatorId: user.username || "unknown",
          createdAt: Date.now(),
          views: 0,
          status: "published",
        };
        await env.NST_VIDEOS.put(`video:${videoId}`, JSON.stringify(video));
        await env.NST_VIDEOS.delete(`upload:${uploadId}`);
        return json(200, { uploadId, status: "completed", videoId });
      }

      // Get video
      if (path.match(/\/api\/v1\/videos\/[^/]+$/) && method === "GET") {
        const id = path.split("/")[4];
        const data = await env.NST_VIDEOS.get(`video:${id}`);
        if (!data) return json(404, { error: "video not found" });
        const video = JSON.parse(data);
        video.views = (video.views || 0) + 1;
        await env.NST_VIDEOS.put(`video:${id}`, JSON.stringify(video));
        return json(200, video);
      }

      return json(404, { error: "not found", endpoints: ["/api/v1/health", "/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/feed", "/api/v1/search", "/api/v1/uploads"] });
    } catch (err) {
      return json(500, { error: "internal error" });
    }
  },
};
