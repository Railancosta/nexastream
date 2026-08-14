import type { Request, Response, NextFunction } from "express";
import type { TokenService, AccessTokenPayload } from "./token-service.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload;
    }
  }
}

/**
 * Auth middleware. Extracts Bearer token from Authorization header, verifies
 * it, and attaches the payload to req.user. Returns 401 if missing/invalid.
 */
export function requireAuth(tokenService: TokenService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.header("authorization");
    if (!header || !header.startsWith("Bearer ")) {
      res.status(401).json({ error: "authentication required" });
      return;
    }
    const token = header.slice(7);
    try {
      req.user = tokenService.verifyAccessToken(token);
      next();
    } catch {
      res.status(401).json({ error: "invalid or expired token" });
    }
  };
}

/** Optional auth — attaches req.user if token is valid, but doesn't block. */
export function optionalAuth(tokenService: TokenService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.header("authorization");
    if (header && header.startsWith("Bearer ")) {
      const token = header.slice(7);
      try {
        req.user = tokenService.verifyAccessToken(token);
      } catch {
        // Ignore — optional.
      }
    }
    next();
  };
}
