import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
}

export interface TokenService {
  issueAccessToken(user: { id: string; email: string; role: string }): string;
  verifyAccessToken(token: string): AccessTokenPayload;
  issueRefreshToken(): { token: string; hash: string };
  hashToken(token: string): string;
}

/**
 * JWT token service. Access tokens are short-lived (15 min). Refresh tokens
 * are high-entropy random strings, hashed at rest (never stored plaintext).
 *
 * Rule 130: JWT is not an eternal session. Rule 131: refresh tokens are
 * rotatable and revocable.
 */
export class JwtTokenService implements TokenService {
  private readonly secret: string;
  private readonly accessTtlSeconds: number;

  constructor(secret: string, accessTtlSeconds = 900) {
    if (secret.length < 32) {
      throw new Error("JWT secret must be at least 32 characters");
    }
    this.secret = secret;
    this.accessTtlSeconds = accessTtlSeconds;
  }

  issueAccessToken(user: { id: string; email: string; role: string }): string {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return jwt.sign(payload, this.secret, {
      expiresIn: this.accessTtlSeconds,
      algorithm: "HS256",
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const decoded = jwt.verify(token, this.secret, { algorithms: ["HS256"] });
    if (typeof decoded === "string") {
      throw new Error("invalid token");
    }
    return decoded as AccessTokenPayload;
  }

  /** Generate a high-entropy refresh token (48 bytes base64url). */
  issueRefreshToken(): { token: string; hash: string } {
    const token = randomBytes(48).toString("base64url");
    return { token, hash: this.hashToken(token) };
  }

  /** SHA-256 hash of the refresh token for storage. Never store raw token. */
  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
