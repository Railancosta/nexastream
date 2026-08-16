import { randomBytes } from "node:crypto";

/**
 * Server-generated peer identifiers. The client never supplies its own
 * peer id (anti-spoofing).
 */
export function generatePeerId(): string {
  return randomBytes(12).toString("base64url");
}
