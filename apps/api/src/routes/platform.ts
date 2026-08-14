import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { PlatformService } from "../services/platform/platform-service.js";
import type { TokenService } from "../services/auth/token-service.js";
import { requireAuth } from "../services/auth/middleware.js";

const CommentBody = z.object({ content: z.string().min(1).max(2000) });

function makeRateLimiter(opts: { windowMs: number; max: number }) {
  const hits = new Map<string, number[]>();
  return (key: string): boolean => {
    const now = Date.now();
    const arr = (hits.get(key) ?? []).filter((t) => t > now - opts.windowMs);
    if (arr.length >= opts.max) { hits.set(key, arr); return false; }
    arr.push(now); hits.set(key, arr); return true;
  };
}

export function platformRouter(opts: {
  platform: PlatformService;
  tokens: TokenService;
}): Router {
  const router = Router();
  const commentLimiter = makeRateLimiter({ windowMs: 60_000, max: 20 });
  const likeLimiter = makeRateLimiter({ windowMs: 60_000, max: 60 });
  const searchLimiter = makeRateLimiter({ windowMs: 60_000, max: 30 });

  router.get("/feed", (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;
    const videos = opts.platform.getFeed(limit, offset).map((v) => ({
      id: v.id, title: v.title, description: v.description, creatorId: v.creatorId,
      createdAt: v.createdAt, views: v.views, likes: v.likes.size, status: v.status,
    }));
    res.json({ videos, count: videos.length });
  });

  router.get("/search", (req: Request, res: Response) => {
    const ip = String(req.ip ?? "unknown");
    if (!searchLimiter(ip)) { res.status(429).json({ error: "too many requests" }); return; }
    const q = String(req.query.q ?? "");
    if (!q || q.length > 200) { res.json({ videos: [], count: 0 }); return; }
    const results = opts.platform.search(q).map((v) => ({
      id: v.id, title: v.title, description: v.description, creatorId: v.creatorId,
      createdAt: v.createdAt, views: v.views, likes: v.likes.size,
    }));
    res.json({ videos: results, count: results.length });
  });

  router.get("/videos/:id", (req: Request, res: Response) => {
    const v = opts.platform.getVideo(String(req.params.id));
    if (!v) { res.status(404).json({ error: "video not found" }); return; }
    opts.platform.incrementViews(v.id);
    res.json({ id: v.id, title: v.title, description: v.description, contentHash: v.contentHash, creatorId: v.creatorId, createdAt: v.createdAt, views: v.views + 1, likes: v.likes.size, status: v.status });
  });

  router.post("/videos/:id/like", requireAuth(opts.tokens), (req: Request, res: Response) => {
    const ip = String(req.ip ?? "unknown");
    if (!likeLimiter(ip)) { res.status(429).json({ error: "too many requests" }); return; }
    if (!req.user) { res.status(401).json({ error: "auth required" }); return; }
    res.json(opts.platform.likeVideo(req.user.sub, String(req.params.id)));
  });

  router.post("/videos/:id/unlike", requireAuth(opts.tokens), (req: Request, res: Response) => {
    if (!req.user) { res.status(401).json({ error: "auth required" }); return; }
    res.json(opts.platform.unlikeVideo(req.user.sub, String(req.params.id)));
  });

  router.post("/videos/:id/comments", requireAuth(opts.tokens), (req: Request, res: Response) => {
    const ip = String(req.ip ?? "unknown");
    if (!commentLimiter(ip)) { res.status(429).json({ error: "too many requests" }); return; }
    if (!req.user) { res.status(401).json({ error: "auth required" }); return; }
    const parsed = CommentBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid body" }); return; }
    const comment = opts.platform.addComment(String(req.params.id), req.user.sub, parsed.data.content);
    res.status(201).json(comment);
  });

  router.get("/videos/:id/comments", (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const comments = opts.platform.getComments(String(req.params.id), limit);
    res.json({ comments, count: comments.length });
  });

  router.delete("/comments/:id", requireAuth(opts.tokens), (req: Request, res: Response) => {
    if (!req.user) { res.status(401).json({ error: "auth required" }); return; }
    const removed = opts.platform.removeComment(String(req.params.id), req.user.sub);
    if (!removed) { res.status(403).json({ error: "cannot remove comment" }); return; }
    res.json({ removed: true });
  });

  router.post("/subscriptions/:creatorId", requireAuth(opts.tokens), (req: Request, res: Response) => {
    if (!req.user) { res.status(401).json({ error: "auth required" }); return; }
    res.json(opts.platform.subscribe(req.user.sub, String(req.params.creatorId)));
  });

  router.delete("/subscriptions/:creatorId", requireAuth(opts.tokens), (req: Request, res: Response) => {
    if (!req.user) { res.status(401).json({ error: "auth required" }); return; }
    res.json(opts.platform.unsubscribe(req.user.sub, String(req.params.creatorId)));
  });

  return router;
}
