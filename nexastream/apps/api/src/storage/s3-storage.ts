import { createHash } from "node:crypto";
import type { ContentPutResult, ContentStorage } from "@nexastream/shared";
import { ContentNotFoundError, InvalidHashError } from "@nexastream/shared";

function isValidSha256Hex(hash: string): boolean {
  return /^[0-9a-f]{64}$/.test(hash);
}

function shardPath(hash: string): string {
  return hash.slice(0, 2) + "/" + hash.slice(2, 4) + "/" + hash;
}

export interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}

/**
 * S3-compatible content-addressed storage adapter (rule 16, 17, 155).
 * Works with: MinIO, AWS S3, Cloudflare R2, Backblaze B2, DO Spaces.
 * SHA-256 computed on server before upload. Content stored by hash (sharded).
 */
export class S3ContentStorage implements ContentStorage {
  private readonly config: S3Config;

  constructor(config: S3Config) {
    this.config = config;
  }

  async put(content: Buffer): Promise<ContentPutResult> {
    const hash = createHash("sha256").update(content).digest("hex");
    const key = shardPath(hash);
    if (await this.has(hash)) return { hash, size: content.length };
    const url = this.objectUrl(key);
    const res = await fetch(url, {
      method: "PUT",
      body: content,
      headers: { "Content-Type": "application/octet-stream", "Content-Length": String(content.length) },
    });
    if (!res.ok) throw new Error("S3 put failed: " + res.status + " " + res.statusText);
    return { hash, size: content.length };
  }

  async get(hash: string): Promise<Buffer> {
    if (!isValidSha256Hex(hash)) throw new InvalidHashError(hash);
    const key = shardPath(hash);
    const url = this.objectUrl(key);
    const res = await fetch(url);
    if (!res.ok) {
      if (res.status === 404) throw new ContentNotFoundError(hash);
      throw new Error("S3 get failed: " + res.status);
    }
    return Buffer.from(await res.arrayBuffer());
  }

  async has(hash: string): Promise<boolean> {
    if (!isValidSha256Hex(hash)) return false;
    const key = shardPath(hash);
    const url = this.objectUrl(key);
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  }

  async delete(hash: string): Promise<void> {
    if (!isValidSha256Hex(hash)) throw new InvalidHashError(hash);
    const key = shardPath(hash);
    const url = this.objectUrl(key);
    await fetch(url, { method: "DELETE" });
  }

  private objectUrl(key: string): string {
    if (this.config.forcePathStyle) {
      return this.config.endpoint + "/" + this.config.bucket + "/" + key;
    }
    return "https://" + this.config.bucket + "." + this.config.endpoint.replace(/^https?:\/\//, "") + "/" + key;
  }
}
