import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import type {
  ContentPutResult,
  ContentStorage,
} from "@nexastream/shared";
import { ContentNotFoundError, InvalidHashError } from "@nexastream/shared";

function isValidSha256Hex(hash: string): boolean {
  return /^[0-9a-f]{64}$/.test(hash);
}

function shardPath(hash: string): string {
  // Sharded layout (2-level) to avoid huge flat directories.
  return join(hash.slice(0, 2), hash.slice(2, 4), hash);
}

/**
 * Local filesystem content-addressed storage. Implements the shared
 * ContentStorage contract. SHA-256 is computed server-side on `put`.
 *
 * This is the first implementation; an IpfsStorageAdapter may later
 * implement the same interface — but IPFS support is NOT declared until
 * such an adapter exists and is tested.
 */
export class LocalContentStorage implements ContentStorage {
  constructor(private readonly rootDir: string) {}

  async put(content: Buffer): Promise<ContentPutResult> {
    const hash = createHash("sha256").update(content).digest("hex");
    const filePath = join(this.rootDir, shardPath(hash));
    // If it already exists we don't rewrite it (dedup by content hash).
    try {
      await fs.access(filePath);
      return { hash, size: content.length };
    } catch {
      // not present — proceed to write.
    }
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
    return { hash, size: content.length };
  }

  async get(hash: string): Promise<Buffer> {
    if (!isValidSha256Hex(hash)) throw new InvalidHashError(hash);
    const filePath = join(this.rootDir, shardPath(hash));
    try {
      return await fs.readFile(filePath);
    } catch {
      throw new ContentNotFoundError(hash);
    }
  }

  async has(hash: string): Promise<boolean> {
    if (!isValidSha256Hex(hash)) return false;
    const filePath = join(this.rootDir, shardPath(hash));
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async delete(hash: string): Promise<void> {
    if (!isValidSha256Hex(hash)) throw new InvalidHashError(hash);
    const filePath = join(this.rootDir, shardPath(hash));
    try {
      await fs.unlink(filePath);
    } catch (err: unknown) {
      // Idempotent: missing is not an error.
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
}
