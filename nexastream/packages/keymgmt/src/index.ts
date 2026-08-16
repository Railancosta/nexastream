export class MissingSecretError extends Error {
  constructor(name: string) { super(`missing required secret: ${name}`); this.name = "MissingSecretError"; }
}

export class WeakSecretError extends Error {
  constructor(name: string, reason: string) { super(`weak secret ${name}: ${reason}`); this.name = "WeakSecretError"; }
}

/**
 * Key management (rule 106, 189).
 * Production MUST use: secure key storage, environment injection, secret manager,
 * hardware security when appropriate. Never: const PRIVATE_KEY = "...".
 *
 * This module validates that secrets are properly injected from environment
 * and fail-fast if missing or weak.
 */
export class KeyManager {
  private readonly env: Record<string, string | undefined>;

  constructor(env: Record<string, string | undefined> = process.env) {
    this.env = env;
  }

  /** Require a secret from environment. Throws if missing (rule 106). */
  requireSecret(name: string): string {
    const value = this.env[name];
    if (!value || value.trim() === "") {
      throw new MissingSecretError(name);
    }
    return value.trim();
  }

  /** Require a JWT secret with minimum length validation. */
  requireJwtSecret(name = "JWT_SECRET"): string {
    const secret = this.requireSecret(name);
    if (secret.length < 32) {
      throw new WeakSecretError(name, "must be at least 32 characters");
    }
    return secret;
  }

  /** Require a private key. Never stored in code (rule 106). */
  requirePrivateKey(name: string): string {
    const key = this.requireSecret(name);
    if (!key.startsWith("0x") && !key.startsWith("-----BEGIN")) {
      throw new WeakSecretError(name, "must be hex (0x...) or PEM format");
    }
    return key;
  }

  /** Optional secret — returns undefined if not set (for optional features like TURN). */
  optionalSecret(name: string): string | undefined {
    const value = this.env[name];
    return value && value.trim() !== "" ? value.trim() : undefined;
  }

  /** Validate that no hardcoded secrets exist in a code string (rule 106). */
  static scanForHardcodedSecrets(code: string): string[] {
    const findings: string[] = [];
    const patterns = [
      /PRIVATE_KEY\s*=\s*["']0x[0-9a-fA-F]{64}["']/g,
      /JWT_SECRET\s*=\s*["'][^"']{8,}["']/g,
      /password\s*=\s*["'][^"']{4,}["']/g,
      /API_KEY\s*=\s*["'][^"']{10,}["']/g,
    ];
    for (const pattern of patterns) {
      const matches = code.match(pattern);
      if (matches) findings.push(...matches);
    }
    return findings;
  }

  /** Generate a high-entropy secret for development (NOT for production). */
  static generateDevSecret(bytes = 48): string {
    const { randomBytes } = require("node:crypto") as typeof import("node:crypto");
    return randomBytes(bytes).toString("hex");
  }
}
