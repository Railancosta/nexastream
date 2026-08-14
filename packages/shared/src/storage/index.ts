/**
 * Content-addressed storage contract.
 *
 * The primary identifier for content MUST derive from the actual bytes
 * (SHA-256). The server never trusts a client-supplied hash as proof.
 */
export interface ContentPutResult {
  /** hex SHA-256 of the stored bytes */
  readonly hash: string;
  /** byte length of the stored content */
  readonly size: number;
}

export interface ContentStorage {
  /**
   * Persist `content` and return its content hash + size.
   * Implementations MUST compute SHA-256 server-side.
   */
  put(content: Buffer, metadata?: Record<string, string>): Promise<ContentPutResult>;

  /** Fetch the bytes for a content hash. Throws if missing. */
  get(hash: string): Promise<Buffer>;

  /** True if content for `hash` is present. */
  has(hash: string): Promise<boolean>;

  /** Remove content for `hash`. Idempotent. */
  delete(hash: string): Promise<void>;
}

export class ContentNotFoundError extends Error {
  constructor(hash: string) {
    super(`content not found: ${hash}`);
    this.name = "ContentNotFoundError";
  }
}

export class InvalidHashError extends Error {
  constructor(hash: string) {
    super(`invalid content hash: ${hash}`);
    this.name = "InvalidHashError";
  }
}
