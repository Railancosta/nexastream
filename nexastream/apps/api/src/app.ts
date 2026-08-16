import express, { type Request, type Response, type NextFunction } from "express";
import type { ApiConfig } from "./config.js";
import type { UploadManager } from "./services/upload-manager.js";
import type { UserService } from "./services/auth/user-service.js";
import type { PlatformService } from "./services/platform/platform-service.js";
import type { TokenService } from "./services/auth/token-service.js";
import { healthRouter } from "./routes/health.js";
import { uploadsRouter } from "./routes/uploads.js";
import { authRouter } from "./routes/auth.js";
import { platformRouter } from "./routes/platform.js";

export interface AppDeps {
  readonly config: ApiConfig;
  readonly uploads: UploadManager;
  readonly users: UserService;
  readonly platform: PlatformService;
  readonly tokens: TokenService;
  readonly isReady: () => Promise<boolean>;
}

export function createApp(deps: AppDeps): express.Express {
  const app = express();

  // Strict CORS — never "*" for authenticated endpoints.
  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.header("origin");
    if (origin && deps.config.corsAllowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-user-id");
      res.setHeader("Access-Control-Max-Age", "600");
    }
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "256kb" }));

  // Raw body parsing ONLY for chunk uploads.
  const rawChunkLimit = Math.ceil(deps.config.chunkSize * 1.1);
  const rawParser = express.raw({
    type: () => true,
    limit: `${rawChunkLimit}bytes`,
  });
  app.use(
    "/api/v1/uploads",
    (req: Request, _res: Response, next: NextFunction) => {
      if (req.method === "PUT" && /\/chunks\/\d+$/.test(req.path)) {
        return rawParser(req, _res, next);
      }
      next();
    },
  );

  // Versioned API.
  app.use("/api/v1", healthRouter({ isReady: deps.isReady }));
  app.use("/api/v1/auth", authRouter({ users: deps.users, tokens: deps.tokens }));
  app.use("/api/v1", platformRouter({ platform: deps.platform, tokens: deps.tokens }));
  app.use(
    "/api/v1/uploads",
    uploadsRouter({ uploads: deps.uploads, chunkMaxBytes: deps.config.chunkSize }),
  );

  app.get("/health", (_req, res) => res.json({ status: "ok", service: "nexastream-api" }));

  // Central error handler — never leak internals.
  app.use(
    (err: Error & { type?: string }, _req: Request, res: Response, _next: NextFunction) => {
      if (err.type === "entity.too.large") {
        res.status(413).json({ error: "chunk too large" });
        return;
      }
      if (err.type === "entity.parse.failed") {
        res.status(400).json({ error: "invalid JSON" });
        return;
      }
      res.status(500).json({ error: "internal error" });
    },
  );

  return app;
}
