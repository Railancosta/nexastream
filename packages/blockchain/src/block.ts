import { createHash } from "node:crypto";

export interface BlockHeader {
  readonly index: number;
  readonly timestamp: number;
  readonly previousHash: string;
  readonly merkleRoot: string;
  readonly nonce: number;
  readonly difficulty: number;
  readonly validatorId: string;
}

export interface Block extends BlockHeader {
  readonly hash: string;
  readonly transactions: readonly Transaction[];
}

export interface Transaction {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly amount: number;
  readonly timestamp: number;
  readonly signature: string;
}

/** Header fields needed to mine a block (merkleRoot is computed inside). */
export type MineableHeader = Omit<BlockHeader, "nonce" | "hash" | "merkleRoot">;

/**
 * Compute SHA-256 hash of a block header (excluding the hash field itself).
 */
export function computeBlockHash(header: Omit<BlockHeader, "hash">): string {
  const data = [
    header.index,
    header.timestamp,
    header.previousHash,
    header.merkleRoot,
    header.nonce,
    header.difficulty,
    header.validatorId,
  ].join("|");
  return createHash("sha256").update(data).digest("hex");
}

/**
 * Compute the merkle root of transactions (simple pairwise SHA-256).
 */
export function computeMerkleRoot(txs: readonly Transaction[]): string {
  if (txs.length === 0) return createHash("sha256").update("").digest("hex");
  let layer = txs.map((t) => createHash("sha256").update(t.id + t.amount + t.from + t.to).digest("hex"));
  while (layer.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : layer[i];
      next.push(createHash("sha256").update(left + right).digest("hex"));
    }
    layer = next;
  }
  return layer[0];
}

/**
 * Check if a hash meets the difficulty target (leading zero bits).
 */
export function meetsDifficulty(hash: string, difficulty: number): boolean {
  const zeroChars = Math.ceil(difficulty / 4);
  const prefix = "0".repeat(zeroChars);
  return hash.startsWith(prefix);
}

/**
 * Mine a block: find a nonce so the hash meets the difficulty target.
 */
export function mineBlock(
  header: MineableHeader,
  transactions: readonly Transaction[],
): Block {
  const merkleRoot = computeMerkleRoot(transactions);
  let nonce = 0;
  let hash = "";
  do {
    hash = computeBlockHash({ ...header, merkleRoot, nonce });
    if (meetsDifficulty(hash, header.difficulty)) break;
    nonce++;
  } while (true);

  return { ...header, merkleRoot, nonce, hash, transactions };
}
