import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { sha256Hex, isValidSha256Hex } from "../crypto.js";
import type { ContentStorage } from "@nexastream/shared";

export type UploadStatus = "active" | "completed" | "expired";

interface UploadSession {
  readonly uploadId: string;
  readonly userId: string;
  readonly filename: string;
  readonly mimeType: string;
  readonly declaredSize: number;
  readonly expectedSha256?: string;
  /** indices accepted so far */
  accepted: Set<number>;
  createdAt: number;
  status: UploadStatus;
  /** resulting content hash once finalized */
  contentHash?: string;
  finalizedSize?: number;
}

export interface InitUploadInput {
  readonly userId: string;
  readonly filename: string;
  readonly mimeType: string;
  readonly declaredSize: number;
  readonly expectedSha256?: string;
}

export interface ChunkResult {
  readonly uploadId: string;
  readonly index: number;
  readonly size: number;
  readonly accepted: boolean;
}

export interface CompletionResult {
  readonly uploadId: string;
  readonly status: "completed";
  readonly sha256: string;
  readonly size: number;
}

export class UploadExpiredError extends Error {
  constructor(uploadId: string) {
    super(`upload expired: ${uploadId}`);
    this.name = "UploadExpiredError";
  }
}

export class UploadNotFoundError extends Error {
  constructor(uploadId: string) {
    super(`upload not found: ${uploadId}`);
    this.name = "UploadNotFoundError";
  }
}

export class ChunkValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChunkValidationError";
  }
}

export class HashMismatchError extends Error {
  constructor(expected: string, actual: string) {
    super(`hash mismatch: expected ${expected} got ${actual}`);
    this.name = "HashMismatchError";
  }
}

/**
 * Resumable, content-addressed upload manager.
 *
 * Rules enforced:
 *  - uploadId is server-generated (UUID-like).
 *  - chunk index validated (>= 0, integer, not exceeding expected chunks).
 *  - duplicate chunk with same index is rejected if bytes differ; accepted
 *    idempotently if identical.
 *  - chunk size must not exceed configured max.
 *  - uploads expire after ttl; expired uploads reject chunks/completion.
 *  - SHA-256 is computed on the server during completion.
 *  - client-supplied expectedSha256 is compared, never trusted.
 */
export class UploadManager {
  private readonly sessions = new Map<string, UploadSession>();
  private readonly ttlMs: number;
  private readonly chunkMax: number;
  private readonly totalMax: number;
  private readonly tempDir: string;
  private readonly storage: ContentStorage;

  constructor(opts: {
    tempDir: string;
    storage: ContentStorage;
    ttlSeconds: number;
    chunkSize: number;
    maxUploadSize: number;
  }) {
    this.tempDir = opts.tempDir;
    this.storage = opts.storage;
    this.ttlMs = opts.ttlSeconds * 1000;
    this.chunkMax = opts.chunkSize;
    this.totalMax = opts.maxUploadSize;
  }

  async init(input: InitUploadInput): Promise<{ uploadId: string }> {
    if (input.declaredSize <= 0) {
      throw new ChunkValidationError("declaredSize must be positive");
    }
    if (input.declaredSize > this.totalMax) {
      throw new ChunkValidationError("declared size exceeds max upload size");
    }
    if (input.expectedSha256 && !isValidSha256Hex(input.expectedSha256)) {
      throw new ChunkValidationError("expectedSha256 is not a valid SHA-256 hex");
    }
    const uploadId = randomBytes(16).toString("hex");
    const session: UploadSession = {
      uploadId,
      userId: input.userId,
      filename: input.filename,
      mimeType: input.mimeType,
      declaredSize: input.declaredSize,
      expectedSha256: input.expectedSha256,
      accepted: new Set(),
      createdAt: Date.now(),
      status: "active",
    };
    this.sessions.set(uploadId, session);
    await fs.mkdir(join(this.tempDir, uploadId), { recursive: true });
    return { uploadId };
  }

  private assertAlive(session: UploadSession): void {
    if (session.status === "completed") {
      throw new ChunkValidationError("upload already completed");
    }
    if (session.status === "expired" || Date.now() - session.createdAt > this.ttlMs) {
      session.status = "expired";
      throw new UploadExpiredError(session.uploadId);
    }
  }

  private expectedChunkCount(session: UploadSession): number {
    return Math.ceil(session.declaredSize / this.chunkMax);
  }

  async putChunk(uploadId: string, index: number, bytes: Buffer): Promise<ChunkResult> {
    const session = this.sessions.get(uploadId);
    if (!session) throw new UploadNotFoundError(uploadId);
    this.assertAlive(session);

    if (!Number.isInteger(index) || index < 0) {
      throw new ChunkValidationError("invalid chunk index");
    }
    if (bytes.byteLength === 0) {
      throw new ChunkValidationError("empty chunk");
    }
    if (bytes.byteLength > this.chunkMax) {
      throw new ChunkValidationError("chunk exceeds max chunk size");
    }
    const total = this.expectedChunkCount(session);
    if (index >= total) {
      throw new ChunkValidationError("chunk index out of range");
    }

    const chunkPath = join(this.tempDir, uploadId, `${index}.part`);

    // Idempotency: if already accepted, only accept if identical.
    if (session.accepted.has(index)) {
      const existing = await fs.readFile(chunkPath);
      const existingHash = sha256Hex(existing);
      const newHash = sha256Hex(bytes);
      if (existingHash !== newHash) {
        throw new ChunkValidationError("duplicate chunk index with different bytes");
      }
      return { uploadId, index, size: bytes.byteLength, accepted: true };
    }

    await fs.writeFile(chunkPath, bytes);
    session.accepted.add(index);
    return { uploadId, index, size: bytes.byteLength, accepted: true };
  }

  async status(uploadId: string): Promise<{
    uploadId: string;
    status: UploadStatus;
    acceptedIndices: number[];
    declaredSize: number;
    contentHash?: string;
    finalizedSize?: number;
  }> {
    const session = this.sessions.get(uploadId);
    if (!session) throw new UploadNotFoundError(uploadId);
    if (session.status === "active" && Date.now() - session.createdAt > this.ttlMs) {
      session.status = "expired";
    }
    return {
      uploadId,
      status: session.status,
      acceptedIndices: Array.from(session.accepted).sort((a, b) => a - b),
      declaredSize: session.declaredSize,
      contentHash: session.contentHash,
      finalizedSize: session.finalizedSize,
    };
  }

  async complete(uploadId: string): Promise<CompletionResult> {
    const session = this.sessions.get(uploadId);
    if (!session) throw new UploadNotFoundError(uploadId);
    this.assertAlive(session);

    const expected = this.expectedChunkCount(session);
    for (let i = 0; i < expected; i++) {
      if (!session.accepted.has(i)) {
        throw new ChunkValidationError(`missing chunk index ${i}`);
      }
    }

    // Reconstruct in order, hashing incrementally to bound memory.
    const hash = createHash("sha256");
    let totalSize = 0;
    for (let i = 0; i < expected; i++) {
      const buf = await fs.readFile(join(this.tempDir, uploadId, `${i}.part`));
      hash.update(buf);
      totalSize += buf.byteLength;
    }
    const contentHash = hash.digest("hex");

    if (session.expectedSha256 && session.expectedSha256 !== contentHash) {
      // Do NOT finalize the upload on mismatch.
      throw new HashMismatchError(session.expectedSha256, contentHash);
    }

    // Persist to content-addressed storage: rebuild once more to write.
    // (For large files a streaming implementation is preferable; this is the
    // correct first implementation and is bounded by chunk count.)
    const parts: Buffer[] = [];
    for (let i = 0; i < expected; i++) {
      parts.push(await fs.readFile(join(this.tempDir, uploadId, `${i}.part`)));
    }
    const full = Buffer.concat(parts, totalSize);
    await this.storage.put(full);

    session.status = "completed";
    session.contentHash = contentHash;
    session.finalizedSize = totalSize;

    // Clean temp dir.
    await fs.rm(join(this.tempDir, uploadId), { recursive: true, force: true });

    return { uploadId, status: "completed", sha256: contentHash, size: totalSize };
  }

  /** Remove expired sessions and their temp dirs. */
  async purgeExpired(): Promise<number> {
    let removed = 0;
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (session.status === "completed") continue;
      if (now - session.createdAt > this.ttlMs) {
        await fs.rm(join(this.tempDir, id), { recursive: true, force: true });
        this.sessions.delete(id);
        removed++;
      }
    }
    return removed;
  }
}
