import { createHash } from "node:crypto";
import type { ContentPutResult, ContentStorage } from "@nexastream/shared";
import { ContentNotFoundError, InvalidHashError } from "@nexastream/shared";

function isValidSha256Hex(hash: string): boolean {
  return /^[0-9a-f]{64}$/.test(hash);
}

export interface IpfsConfig {
  /** Kubo RPC API URL (default: http://localhost:5001/api/v0) */
  apiBaseUrl: string;
  /** Public gateway URL for serving content (default: https://ipfs.io/ipfs/) */
  gatewayUrl: string;
  /** Optional: pin content (default: true) */
  pin?: boolean;
}

/**
 * IPFS (InterPlanetary File System) content-addressed storage adapter.
 * Uses Kubo (go-ipfs) RPC API for put/get/pin operations.
 *
 * Rule 16: "IPFS-compatible" means the adapter is implemented AND tested.
 * This adapter implements the ContentStorage interface using a real Kubo node.
 *
 * Rule 17: ContentStorage interface (put/get/has/delete).
 *
 * SHA-256 is computed on the server. IPFS CIDs are content-addressed by nature.
 * The adapter stores both the SHA-256 hash (for platform integrity) and the
 * IPFS CID (for retrieval from the IPFS network).
 *
 * Usage:
 *   const storage = new IpfsStorage({
 *     apiBaseUrl: "http://localhost:5001/api/v0",
 *     gatewayUrl: "https://ipfs.io/ipfs/",
 *   });
 */
export class IpfsStorage implements ContentStorage {
  private readonly config: IpfsConfig;
  private readonly cidMap = new Map<string, string>(); // sha256 -> CID

  constructor(config: IpfsConfig) {
    this.config = {
      pin: true,
      ...config,
    };
  }

  async put(content: Buffer): Promise<ContentPutResult> {
    // Compute SHA-256 on the server (rule 15).
    const hash = createHash("sha256").update(content).digest("hex");

    // Check if already stored (dedup by SHA-256).
    if (this.cidMap.has(hash)) {
      return { hash, size: content.length };
    }

    // Add to IPFS via Kubo RPC API.
    const cid = await this.ipfsAdd(content);

    // Pin if configured (ensures content persists on this node).
    if (this.config.pin) {
      await this.ipfsPin(cid);
    }

    this.cidMap.set(hash, cid);
    return { hash, size: content.length };
  }

  async get(hash: string): Promise<Buffer> {
    if (!isValidSha256Hex(hash)) throw new InvalidHashError(hash);
    const cid = this.cidMap.get(hash);
    if (!cid) throw new ContentNotFoundError(hash);

    // Fetch from IPFS via Kubo RPC API.
    const data = await this.ipfsCat(cid);
    // Verify integrity (SHA-256 match).
    const actualHash = createHash("sha256").update(data).digest("hex");
    if (actualHash !== hash) {
      throw new Error("content integrity check failed: hash mismatch");
    }
    return data;
  }

  async has(hash: string): Promise<boolean> {
    if (!isValidSha256Hex(hash)) return false;
    return this.cidMap.has(hash);
  }

  async delete(hash: string): Promise<void> {
    if (!isValidSha256Hex(hash)) throw new InvalidHashError(hash);
    const cid = this.cidMap.get(hash);
    if (cid) {
      // Unpin before removing (IPFS garbage collection).
      if (this.config.pin) {
        await this.ipfsUnpin(cid).catch(() => {});
      }
      this.cidMap.delete(hash);
    }
  }

  /** Get the IPFS CID for a SHA-256 hash (for gateway URLs). */
  getCid(hash: string): string | undefined {
    return this.cidMap.get(hash);
  }

  /** Get the public gateway URL for content. */
  getGatewayUrl(hash: string): string | undefined {
    const cid = this.cidMap.get(hash);
    if (!cid) return undefined;
    return this.config.gatewayUrl + cid;
  }

  // === Kubo RPC API methods ===

  /** Add content to IPFS (POST /api/v0/add). */
  private async ipfsAdd(content: Buffer): Promise<string> {
    const formData = new FormData();
    formData.append("file", new Blob([content]), "content");

    const res = await fetch(`${this.config.apiBaseUrl}/add?pin=false&cid-version=1`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`IPFS add failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as { Hash: string };
    return data.Hash;
  }

  /** Cat (read) content from IPFS (POST /api/v0/cat). */
  private async ipfsCat(cid: string): Promise<Buffer> {
    const res = await fetch(`${this.config.apiBaseUrl}/cat?arg=${cid}`, {
      method: "POST",
    });

    if (!res.ok) {
      if (res.status === 404) throw new ContentNotFoundError(cid);
      throw new Error(`IPFS cat failed: ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /** Pin content to IPFS (POST /api/v0/pin/add). */
  private async ipfsPin(cid: string): Promise<void> {
    const res = await fetch(`${this.config.apiBaseUrl}/pin/add?arg=${cid}`, {
      method: "POST",
    });
    if (!res.ok) {
      throw new Error(`IPFS pin failed: ${res.status}`);
    }
  }

  /** Unpin content from IPFS (POST /api/v0/pin/rm). */
  private async ipfsUnpin(cid: string): Promise<void> {
    const res = await fetch(`${this.config.apiBaseUrl}/pin/rm?arg=${cid}`, {
      method: "POST",
    });
    if (!res.ok) {
      // Idempotent: not pinned is not an error.
    }
  }

  /** Check if a CID is pinned (POST /api/v0/pin/ls). */
  async isPinned(hash: string): Promise<boolean> {
    const cid = this.cidMap.get(hash);
    if (!cid) return false;
    const res = await fetch(`${this.config.apiBaseUrl}/pin/ls?arg=${cid}`, {
      method: "POST",
    });
    if (!res.ok) return false;
    const data = await res.json() as { Keys: Record<string, unknown> };
    return cid in (data.Keys || {});
  }
}
