import { createHash } from "node:crypto";

export interface VideoSegment {
  readonly index: number;
  readonly contentHash: string;
  readonly data: Buffer;
  readonly size: number;
}

/** Create a video segment with content hash (SHA-256). */
export function createSegment(index: number, data: Buffer): VideoSegment {
  return {
    index,
    contentHash: createHash("sha256").update(data).digest("hex"),
    data,
    size: data.length,
  };
}

/** Verify a segment's integrity. */
export function verifySegment(segment: VideoSegment): boolean {
  const actualHash = createHash("sha256").update(segment.data).digest("hex");
  return actualHash === segment.contentHash;
}
