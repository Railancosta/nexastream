import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { S3ContentStorage, type S3Config } from "../src/storage/s3-storage.js";

const config: S3Config = {
  endpoint: "http://localhost:9000", region: "us-east-1", bucket: "nexastream-test",
  accessKeyId: "test-key", secretAccessKey: "test-secret", forcePathStyle: true,
};

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockResponse(ok: boolean, status: number, body?: ArrayBuffer) {
  return { ok, status, arrayBuffer: async () => body ? body : new ArrayBuffer(0), statusText: ok ? "OK" : "Not Found" } as any;
}

beforeEach(() => { mockFetch.mockReset(); });
function sha256(data: Buffer): string { return createHash("sha256").update(data).digest("hex"); }

describe("S3ContentStorage", () => {
  it("computes SHA-256 and uploads to S3", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(false, 404)).mockResolvedValueOnce(mockResponse(true, 200));
    const storage = new S3ContentStorage(config);
    const content = Buffer.from("test-content-for-s3");
    const result = await storage.put(content);
    expect(result.hash).toBe(sha256(content));
    expect(result.size).toBe(content.length);
    expect(mockFetch.mock.calls[1][1].method).toBe("PUT");
  });

  it("skips upload if content already exists (dedup)", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200));
    const storage = new S3ContentStorage(config);
    const result = await storage.put(Buffer.from("duplicate"));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("gets content from S3", async () => {
    const data = Buffer.from("retrieved-content");
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), statusText: "OK" } as any);
    const storage = new S3ContentStorage(config);
    const result = await storage.get(sha256(data));
    expect(result.length).toBe(data.length);
  });

  it("throws ContentNotFoundError for missing content", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(false, 404));
    const storage = new S3ContentStorage(config);
    await expect(storage.get("a".repeat(64))).rejects.toThrow("content not found");
  });

  it("rejects invalid hash on get", async () => {
    const storage = new S3ContentStorage(config);
    await expect(storage.get("not-a-hash")).rejects.toThrow("invalid content hash");
  });

  it("has() returns false for invalid hash", async () => {
    const storage = new S3ContentStorage(config);
    expect(await storage.has("not-a-hash")).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("has() returns true when content exists", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200));
    const storage = new S3ContentStorage(config);
    expect(await storage.has("a".repeat(64))).toBe(true);
  });

  it("has() returns false when content does not exist", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(false, 404));
    const storage = new S3ContentStorage(config);
    expect(await storage.has("b".repeat(64))).toBe(false);
  });

  it("delete() calls DELETE", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(true, 204));
    const storage = new S3ContentStorage(config);
    await storage.delete("c".repeat(64));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][1].method).toBe("DELETE");
  });

  it("rejects invalid hash on delete", async () => {
    const storage = new S3ContentStorage(config);
    await expect(storage.delete("not-a-hash")).rejects.toThrow("invalid content hash");
  });

  it("uses sharded key path", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(false, 404)).mockResolvedValueOnce(mockResponse(true, 200));
    const storage = new S3ContentStorage(config);
    const content = Buffer.from("shard-test");
    await storage.put(content);
    const url = mockFetch.mock.calls[1][0] as string;
    const hash = sha256(content);
    expect(url).toContain(hash.slice(0, 2));
    expect(url).toContain(hash.slice(2, 4));
    expect(url).toContain(hash);
  });

  it("supports path-style URLs (MinIO)", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(false, 404)).mockResolvedValueOnce(mockResponse(true, 200));
    const storage = new S3ContentStorage(config);
    await storage.put(Buffer.from("minio-test"));
    const url = mockFetch.mock.calls[1][0] as string;
    expect(url).toContain("localhost:9000");
    expect(url).toContain("nexastream-test");
  });

  it("supports virtual-hosted-style URLs (AWS S3)", async () => {
    const awsConfig: S3Config = { endpoint: "https://s3.amazonaws.com", region: "us-east-1", bucket: "my-bucket", accessKeyId: "key", secretAccessKey: "secret", forcePathStyle: false };
    mockFetch.mockResolvedValueOnce(mockResponse(false, 404)).mockResolvedValueOnce(mockResponse(true, 200));
    const storage = new S3ContentStorage(awsConfig);
    await storage.put(Buffer.from("aws-test"));
    const url = mockFetch.mock.calls[1][0] as string;
    expect(url).toContain("my-bucket.s3.amazonaws.com");
  });
});
