import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { UploadManager } from "../src/services/upload-manager.js";
import { LocalContentStorage } from "../src/storage/local-storage.js";
import {
  ChunkValidationError,
  UploadExpiredError,
  UploadNotFoundError,
  HashMismatchError,
} from "../src/services/upload-manager.js";

const TMP = "./.data-test/uploads";
const STORE = "./.data-test/storage";
const CHUNK = 4; // tiny chunks for unit testing
const TTL = 3600;
const MAX = 1024 * 1024;

function rmrf(p: string) {
  return fs.rm(p, { recursive: true, force: true });
}

async function makeManager() {
  await fs.mkdir(TMP, { recursive: true });
  await fs.mkdir(STORE, { recursive: true });
  const storage = new LocalContentStorage(STORE);
  return new UploadManager({
    tempDir: TMP,
    storage,
    ttlSeconds: TTL,
    chunkSize: CHUNK,
    maxUploadSize: MAX,
  });
}

beforeEach(async () => {
  await rmrf(TMP);
  await rmrf(STORE);
});
afterEach(async () => {
  await rmrf(TMP);
  await rmrf(STORE);
});

function chunkBuf(content: string, size: number): Buffer {
  const b = Buffer.from(content);
  const out = Buffer.alloc(size);
  b.copy(out);
  return out;
}

describe("UploadManager", () => {
  it("initializes an upload session", async () => {
    const m = await makeManager();
    const { uploadId } = await m.init({
      userId: "u1",
      filename: "v.mp4",
      mimeType: "video/mp4",
      declaredSize: 10,
    });
    expect(uploadId).toMatch(/^[0-9a-f]{32}$/);
  });

  it("accepts a valid chunk and reports status", async () => {
    const m = await makeManager();
    const { uploadId } = await m.init({
      userId: "u1",
      filename: "v.mp4",
      mimeType: "video/mp4",
      declaredSize: 10,
    });
    const res = await m.putChunk(uploadId, 0, chunkBuf("hello", 4));
    expect(res.accepted).toBe(true);
    expect(res.size).toBe(4);
    const status = await m.status(uploadId);
    expect(status.acceptedIndices).toEqual([0]);
    expect(status.status).toBe("active");
  });

  it("rejects an invalid chunk index", async () => {
    const m = await makeManager();
    const { uploadId } = await m.init({
      userId: "u1",
      filename: "v.mp4",
      mimeType: "video/mp4",
      declaredSize: 8,
    });
    await expect(m.putChunk(uploadId, -1, chunkBuf("x", 4))).rejects.toBeInstanceOf(
      ChunkValidationError,
    );
  });

  it("rejects a chunk index beyond range", async () => {
    const m = await makeManager();
    const { uploadId } = await m.init({
      userId: "u1",
      filename: "v.mp4",
      mimeType: "video/mp4",
      declaredSize: 4,
    });
    await expect(m.putChunk(uploadId, 5, chunkBuf("x", 4))).rejects.toBeInstanceOf(
      ChunkValidationError,
    );
  });

  it("accepts duplicate chunk with identical bytes idempotently", async () => {
    const m = await makeManager();
    const { uploadId } = await m.init({
      userId: "u1",
      filename: "v.mp4",
      mimeType: "video/mp4",
      declaredSize: 4,
    });
    const c = chunkBuf("abcd", 4);
    await m.putChunk(uploadId, 0, c);
    const dup = await m.putChunk(uploadId, 0, c);
    expect(dup.accepted).toBe(true);
  });

  it("rejects duplicate chunk with different bytes", async () => {
    const m = await makeManager();
    const { uploadId } = await m.init({
      userId: "u1",
      filename: "v.mp4",
      mimeType: "video/mp4",
      declaredSize: 4,
    });
    await m.putChunk(uploadId, 0, chunkBuf("abcd", 4));
    await expect(m.putChunk(uploadId, 0, chunkBuf("zzzz", 4))).rejects.toBeInstanceOf(
      ChunkValidationError,
    );
  });

  it("completes a multi-chunk upload and computes SHA-256 on the server", async () => {
    const m = await makeManager();
    const content = "abcdefgh"; // 8 bytes -> 2 chunks of 4
    const { uploadId } = await m.init({
      userId: "u1",
      filename: "v.mp4",
      mimeType: "video/mp4",
      declaredSize: content.length,
    });
    await m.putChunk(uploadId, 0, Buffer.from(content.slice(0, 4)));
    await m.putChunk(uploadId, 1, Buffer.from(content.slice(4, 8)));
    const result = await m.complete(uploadId);
    const expectedHash = createHash("sha256").update(content).digest("hex");
    expect(result.sha256).toBe(expectedHash);
    expect(result.size).toBe(8);
  });

  it("rejects completion when a chunk is missing", async () => {
    const m = await makeManager();
    const { uploadId } = await m.init({
      userId: "u1",
      filename: "v.mp4",
      mimeType: "video/mp4",
      declaredSize: 8,
    });
    await m.putChunk(uploadId, 0, Buffer.from("abcd"));
    await expect(m.complete(uploadId)).rejects.toBeInstanceOf(ChunkValidationError);
  });

  it("fails completion on expected hash mismatch (422 path)", async () => {
    const m = await makeManager();
    const content = "abcdefgh";
    const { uploadId } = await m.init({
      userId: "u1",
      filename: "v.mp4",
      mimeType: "video/mp4",
      declaredSize: content.length,
      expectedSha256: "0".repeat(64),
    });
    await m.putChunk(uploadId, 0, Buffer.from(content.slice(0, 4)));
    await m.putChunk(uploadId, 1, Buffer.from(content.slice(4, 8)));
    await expect(m.complete(uploadId)).rejects.toBeInstanceOf(HashMismatchError);
  });

  it("succeeds when expected hash matches server-computed hash", async () => {
    const m = await makeManager();
    const content = "abcdefgh";
    const expected = createHash("sha256").update(content).digest("hex");
    const { uploadId } = await m.init({
      userId: "u1",
      filename: "v.mp4",
      mimeType: "video/mp4",
      declaredSize: content.length,
      expectedSha256: expected,
    });
    await m.putChunk(uploadId, 0, Buffer.from(content.slice(0, 4)));
    await m.putChunk(uploadId, 1, Buffer.from(content.slice(4, 8)));
    const result = await m.complete(uploadId);
    expect(result.sha256).toBe(expected);
  });

  it("returns not found for unknown upload", async () => {
    const m = await makeManager();
    await expect(m.status("nope")).rejects.toBeInstanceOf(UploadNotFoundError);
    await expect(m.complete("nope")).rejects.toBeInstanceOf(UploadNotFoundError);
  });

  it("purges expired sessions", async () => {
    const storage = new LocalContentStorage(STORE);
    const m = new UploadManager({
      tempDir: TMP,
      storage,
      ttlSeconds: 1,
      chunkSize: CHUNK,
      maxUploadSize: MAX,
    });
    const { uploadId } = await m.init({
      userId: "u1",
      filename: "v.mp4",
      mimeType: "video/mp4",
      declaredSize: 8,
    });
    await m.putChunk(uploadId, 0, Buffer.from("abcd"));
    // Force expiry by backdating createdAt via internal map.
    const sessions = (m as unknown as { sessions: Map<string, { createdAt: number }> }).sessions;
    const s = sessions.get(uploadId);
    if (s) s.createdAt = Date.now() - 10_000;
    await expect(m.putChunk(uploadId, 1, Buffer.from("efgh"))).rejects.toBeInstanceOf(
      UploadExpiredError,
    );
    const removed = await m.purgeExpired();
    expect(removed).toBeGreaterThanOrEqual(1);
  });
});

describe("LocalContentStorage", () => {
  it("put/get/has/delete round-trips with server-computed SHA-256", async () => {
    const storage = new LocalContentStorage(STORE);
    const content = Buffer.from("nexastream-content");
    const expected = createHash("sha256").update(content).digest("hex");
    const put = await storage.put(content);
    expect(put.hash).toBe(expected);
    expect(await storage.has(expected)).toBe(true);
    const got = await storage.get(expected);
    expect(got.equals(content)).toBe(true);
    await storage.delete(expected);
    expect(await storage.has(expected)).toBe(false);
  });

  it("dedupes identical content", async () => {
    const storage = new LocalContentStorage(STORE);
    const content = Buffer.from("dup");
    const a = await storage.put(content);
    const b = await storage.put(content);
    expect(a.hash).toBe(b.hash);
  });

  it("rejects malformed hash on get", async () => {
    const storage = new LocalContentStorage(STORE);
    await expect(storage.get("not-a-hash")).rejects.toThrow();
  });
});
