import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { IpfsStorage, type IpfsConfig } from "../src/storage/ipfs-storage.js";

const config: IpfsConfig = {
  apiBaseUrl: "http://localhost:5001/api/v0",
  gatewayUrl: "https://ipfs.io/ipfs/",
  pin: true,
};

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockResponse(ok: boolean, status: number, body?: unknown) {
  return {
    ok, status,
    json: async () => body || {},
    arrayBuffer: async () => {
      if (Buffer.isBuffer(body)) return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
      return new ArrayBuffer(0);
    },
    statusText: ok ? "OK" : "Not Found",
  } as any;
}

beforeEach(() => { mockFetch.mockReset(); });
function sha256(data: Buffer): string { return createHash("sha256").update(data).digest("hex"); }

describe("IpfsStorage", () => {
  it("adds content to IPFS and returns SHA-256 hash", async () => {
    const cid = "bafyreig" + "a".repeat(52);
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, { Hash: cid })); // add
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, {})); // pin

    const storage = new IpfsStorage(config);
    const content = Buffer.from("video-content-for-ipfs");
    const result = await storage.put(content);

    expect(result.hash).toBe(sha256(content));
    expect(result.size).toBe(content.length);
    expect(storage.getCid(result.hash)).toBe(cid);
  });

  it("skips upload if content already exists (dedup)", async () => {
    const cid = "bafyreig" + "b".repeat(52);
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, { Hash: cid }));
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, {}));

    const storage = new IpfsStorage(config);
    const content = Buffer.from("duplicate-content");
    await storage.put(content);
    const result = await storage.put(content);

    // Should only call fetch once (no second add/pin).
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.hash).toBe(sha256(content));
  });

  it("retrieves content from IPFS and verifies integrity", async () => {
    const cid = "bafyreig" + "c".repeat(52);
    const content = Buffer.from("retrieved-content");
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, { Hash: cid })); // add
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, {})); // pin
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, content)); // cat

    const storage = new IpfsStorage(config);
    await storage.put(content);
    const result = await storage.get(sha256(content));

    expect(result.equals(content)).toBe(true);
  });

  it("throws ContentNotFoundError for missing content", async () => {
    const storage = new IpfsStorage(config);
    await expect(storage.get("a".repeat(64))).rejects.toThrow("content not found");
  });

  it("rejects invalid hash on get", async () => {
    const storage = new IpfsStorage(config);
    await expect(storage.get("not-a-hash")).rejects.toThrow("invalid content hash");
  });

  it("has() returns false for invalid hash", async () => {
    const storage = new IpfsStorage(config);
    expect(await storage.has("not-a-hash")).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("has() returns true when content exists", async () => {
    const cid = "bafyreig" + "d".repeat(52);
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, { Hash: cid }));
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, {}));

    const storage = new IpfsStorage(config);
    const result = await storage.put(Buffer.from("exists-test"));
    expect(await storage.has(result.hash)).toBe(true);
  });

  it("delete() unpins and removes content", async () => {
    const cid = "bafyreig" + "e".repeat(52);
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, { Hash: cid })); // add
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, {})); // pin
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, {})); // unpin

    const storage = new IpfsStorage(config);
    const result = await storage.put(Buffer.from("delete-test"));
    await storage.delete(result.hash);

    expect(await storage.has(result.hash)).toBe(false);
    expect(storage.getCid(result.hash)).toBeUndefined();
  });

  it("rejects invalid hash on delete", async () => {
    const storage = new IpfsStorage(config);
    await expect(storage.delete("not-a-hash")).rejects.toThrow("invalid content hash");
  });

  it("getGatewayUrl returns IPFS gateway URL", async () => {
    const cid = "bafyreig" + "f".repeat(52);
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, { Hash: cid }));
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, {}));

    const storage = new IpfsStorage(config);
    const result = await storage.put(Buffer.from("gateway-test"));
    const url = storage.getGatewayUrl(result.hash);

    expect(url).toBe("https://ipfs.io/ipfs/" + cid);
  });

  it("isPinned() checks pin status", async () => {
    const cid = "bafyreig" + "1".repeat(52);
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, { Hash: cid }));
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, {}));
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, { Keys: { [cid]: { Type: "recursive" } } }));

    const storage = new IpfsStorage(config);
    const result = await storage.put(Buffer.from("pin-test"));
    const pinned = await storage.isPinned(result.hash);
    expect(pinned).toBe(true);
  });

  it("isPinned() returns false for unknown hash", async () => {
    const storage = new IpfsStorage(config);
    expect(await storage.isPinned("a".repeat(64))).toBe(false);
  });

  it("uses CIDv1 by default", async () => {
    const cid = "bafyreig" + "2".repeat(52);
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, { Hash: cid }));
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, {}));

    const storage = new IpfsStorage(config);
    await storage.put(Buffer.from("cid-version-test"));

    const addCall = mockFetch.mock.calls[0][0] as string;
    expect(addCall).toContain("cid-version=1");
  });

  it("pins content after adding (when pin is enabled)", async () => {
    const cid = "bafyreig" + "3".repeat(52);
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, { Hash: cid }));
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, {}));

    const storage = new IpfsStorage(config);
    await storage.put(Buffer.from("pin-enabled-test"));

    const pinCall = mockFetch.mock.calls[1];
    expect(pinCall[0]).toContain("/pin/add");
  });

  it("does not pin when pin is disabled", async () => {
    const cid = "bafyreig" + "4".repeat(52);
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, { Hash: cid }));

    const storage = new IpfsStorage({ ...config, pin: false });
    await storage.put(Buffer.from("no-pin-test"));

    expect(mockFetch).toHaveBeenCalledTimes(1); // only add, no pin
  });
});
