import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import type { UploadManager } from "../services/upload-manager.js";
import {
  ChunkValidationError,
  HashMismatchError,
  UploadExpiredError,
  UploadNotFoundError,
} from "../services/upload-manager.js";

const allowedMimeTypes = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
] as const;

const InitBody = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(allowedMimeTypes),
  declaredSize: z.number().int().positive(),
  expectedSha256: z.string().regex(/^[0-9a-f]{64}$/).optional(),
});

// In-memory per-IP rate limiter for upload initialization. A Redis-backed
// limiter replaces this in production.
function makeRateLimiter(opts: { windowMs: number; max: number }) {
  const hits = new Map<string, number[]>();
  return (key: string): boolean => {
    const now = Date.now();
    const arr = (hits.get(key) ?? []).filter((t) => t > now - opts.windowMs);
    if (arr.length >= opts.max) {
      hits.set(key, arr);
      return false;
    }
    arr.push(now);
    hits.set(key, arr);
    return true;
  };
}

export function uploadsRouter(opts: {
  uploads: UploadManager;
  /** Max raw body bytes for a chunk request. */
  chunkMaxBytes: number;
}): Router {
  const router = Router();
  const initLimiter = makeRateLimiter({ windowMs: 60_000, max: 30 });
  const chunkLimiter = makeRateLimiter({ windowMs: 60_000, max: 300 });

  // POST /api/v1/uploads — initialize a resumable upload.
  router.post("/", (req: Request, res: Response, next: NextFunction) => {
    const ip = String(req.ip ?? "unknown");
    if (!initLimiter(ip)) {
      res.status(429).json({ error: "too many requests" });
      return;
    }
    const parsed = InitBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid body" });
      return;
    }
    // NOTE: a real auth middleware injects req.userId. For the foundation we
    // require an x-user-id header; auth/jwt lands in Module 2.
    const userId = String(req.header("x-user-id") ?? "");
    if (!userId || userId.length > 128) {
      res.status(401).json({ error: "authentication required" });
      return;
    }
    opts.uploads
      .init({
        userId,
        filename: parsed.data.filename,
        mimeType: parsed.data.mimeType,
        declaredSize: parsed.data.declaredSize,
        expectedSha256: parsed.data.expectedSha256,
      })
      .then(({ uploadId }) => res.status(201).json({ uploadId }))
      .catch((err) => {
        if (err instanceof ChunkValidationError) {
          res.status(400).json({ error: err.message });
        } else {
          next(err);
        }
      });
  });

  // PUT /api/v1/uploads/:uploadId/chunks/:index — upload one chunk.
  router.put("/:uploadId/chunks/:index", (req: Request, res: Response, next: NextFunction) => {
    const ip = String(req.ip ?? "unknown");
    if (!chunkLimiter(ip)) {
      res.status(429).json({ error: "too many requests" });
      return;
    }
    const uploadId = String(req.params.uploadId);
    const index = Number.parseInt(req.params.index, 10);
    if (!Number.isInteger(index) || index < 0) {
      res.status(400).json({ error: "invalid index" });
      return;
    }
    const bytes = req.body as Buffer;
    if (!Buffer.isBuffer(bytes)) {
      res.status(400).json({ error: "expected raw body" });
      return;
    }
    opts.uploads
      .putChunk(uploadId, index, bytes)
      .then((result) => res.json(result))
      .catch((err) => {
        if (err instanceof UploadNotFoundError) {
          res.status(404).json({ error: "upload not found" });
        } else if (err instanceof UploadExpiredError) {
          res.status(410).json({ error: "upload expired" });
        } else if (err instanceof ChunkValidationError) {
          res.status(400).json({ error: err.message });
        } else {
          next(err);
        }
      });
  });

  // POST /api/v1/uploads/:uploadId/complete — finalize and compute SHA-256.
  router.post("/:uploadId/complete", (req: Request, res: Response, next: NextFunction) => {
    const uploadId = String(req.params.uploadId);
    opts.uploads
      .complete(uploadId)
      .then((result) => res.json(result))
      .catch((err) => {
        if (err instanceof UploadNotFoundError) {
          res.status(404).json({ error: "upload not found" });
        } else if (err instanceof UploadExpiredError) {
          res.status(410).json({ error: "upload expired" });
        } else if (err instanceof HashMismatchError) {
          // Integrity failure — do not finalize. (Rule 15/202.)
          res.status(422).json({ error: "checksum mismatch", expected: err.message });
        } else if (err instanceof ChunkValidationError) {
          res.status(400).json({ error: err.message });
        } else {
          next(err);
        }
      });
  });

  // GET /api/v1/uploads/:uploadId — status (resumable).
  router.get("/:uploadId", (req: Request, res: Response, next: NextFunction) => {
    const uploadId = String(req.params.uploadId);
    opts.uploads
      .status(uploadId)
      .then((result) => res.json(result))
      .catch((err) => {
        if (err instanceof UploadNotFoundError) {
          res.status(404).json({ error: "upload not found" });
        } else {
          next(err);
        }
      });
  });

  return router;
}
