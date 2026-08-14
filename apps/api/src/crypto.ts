import { createHash } from "node:crypto";

/**
 * SHA-256 hex of a buffer. This is the content-addressing primitive used
 * across the platform. The server always computes this; client-supplied
 * hashes are only compared, never trusted.
 */
export function sha256Hex(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** True if `hash` is a 64-char lowercase hex string. */
export function isValidSha256Hex(hash: string): boolean {
  return /^[0-9a-f]{64}$/.test(hash);
}
