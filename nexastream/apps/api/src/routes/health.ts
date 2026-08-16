import { Router, type Request, type Response } from "express";
import { readVersion } from "../version.js";

export function healthRouter(opts: {
  isReady: () => Promise<boolean>;
}): Router {
  const router = Router();

  // Liveness: process is up.
  router.get("/live", (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      service: "nexastream-api",
      version: readVersion(),
    });
  });

  // Readiness: critical deps (storage dir, etc.) available.
  router.get("/ready", async (_req: Request, res: Response) => {
    try {
      const ready = await opts.isReady();
      res.status(ready ? 200 : 503).json({
        status: ready ? "ok" : "not-ready",
        service: "nexastream-api",
        version: readVersion(),
      });
    } catch (err) {
      // Never leak internal details.
      res.status(503).json({ status: "not-ready", service: "nexastream-api" });
    }
  });

  // Backwards-compatible aggregate health.
  router.get("/health", async (_req: Request, res: Response) => {
    try {
      const ready = await opts.isReady();
      res.status(ready ? 200 : 503).json({
        status: ready ? "ok" : "degraded",
        service: "nexastream-api",
        version: readVersion(),
      });
    } catch {
      res.status(503).json({ status: "degraded", service: "nexastream-api" });
    }
  });

  router.get("/version", (_req: Request, res: Response) => {
    res.json({ version: readVersion(), service: "nexastream-api" });
  });

  return router;
}
