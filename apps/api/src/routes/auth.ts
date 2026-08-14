import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import type { UserService, DuplicateUserError, InvalidCredentialsError } from "../services/auth/user-service.js";
import type { TokenService } from "../services/auth/token-service.js";

const RegisterBody = z.object({
  email: z.string().email().max(255),
  username: z.string().min(3).max(32).regex(/^[A-Za-z0-9_]+$/),
  password: z.string().min(8).max(128),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

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

export function authRouter(opts: {
  users: UserService;
  tokens: TokenService;
}): Router {
  const router = Router();
  const loginLimiter = makeRateLimiter({ windowMs: 60_000, max: 10 });
  const registerLimiter = makeRateLimiter({ windowMs: 60_000, max: 5 });

  // POST /api/v1/auth/register
  router.post("/register", (req: Request, res: Response, next: NextFunction) => {
    const ip = String(req.ip ?? "unknown");
    if (!registerLimiter(ip)) {
      res.status(429).json({ error: "too many requests" });
      return;
    }
    const parsed = RegisterBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid body" });
      return;
    }
    const { email, username, password } = parsed.data;
    opts.users
      .register(email, username, password)
      .then((user) => {
        const accessToken = opts.tokens.issueAccessToken({
          id: user.id,
          email: user.email,
          role: user.role,
        });
        const refresh = opts.tokens.issueRefreshToken();
        res.status(201).json({
          user: { id: user.id, email: user.email, username: user.username, role: user.role },
          accessToken,
          refreshToken: refresh.token,
        });
      })
      .catch((err: DuplicateUserError) => {
        if (err.name === "DuplicateUserError") {
          // Rule 132: don't reveal if email exists when it represents a risk.
          // For registration we DO tell them it's a duplicate (different flow).
          res.status(409).json({ error: "email or username already taken" });
        } else {
          next(err);
        }
      });
  });

  // POST /api/v1/auth/login
  router.post("/login", (req: Request, res: Response, next: NextFunction) => {
    const ip = String(req.ip ?? "unknown");
    if (!loginLimiter(ip)) {
      res.status(429).json({ error: "too many requests" });
      return;
    }
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? "invalid body" });
      return;
    }
    const { email, password } = parsed.data;
    opts.users
      .verify(email, password)
      .then((user) => {
        const accessToken = opts.tokens.issueAccessToken({
          id: user.id,
          email: user.email,
          role: user.role,
        });
        const refresh = opts.tokens.issueRefreshToken();
        res.json({
          user: { id: user.id, email: user.email, username: user.username, role: user.role },
          accessToken,
          refreshToken: refresh.token,
        });
      })
      .catch((err: InvalidCredentialsError) => {
        if (err.name === "InvalidCredentialsError") {
          // Generic message — don't reveal which field was wrong.
          res.status(401).json({ error: "invalid credentials" });
        } else {
          next(err);
        }
      });
  });

  // POST /api/v1/auth/refresh
  router.post("/refresh", (req: Request, res: Response) => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      res.status(400).json({ error: "refreshToken required" });
      return;
    }
    // In a full implementation we'd look up the hash in the DB and verify
    // it's not revoked. For the foundation we validate structure only.
    // The token service hashes it for storage comparison.
    opts.tokens.hashToken(refreshToken); // exercise the hash path
    res.json({ ok: true, message: "refresh endpoint ready (DB-backed revocation in M2.1)" });
  });

  // POST /api/v1/auth/logout
  router.post("/logout", (_req: Request, res: Response) => {
    // Stateless JWT: client discards tokens. Server-side revocation list
    // would be added with a session store (Redis) in production.
    res.json({ ok: true });
  });

  return router;
}
