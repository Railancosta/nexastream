import type { Block, Transaction } from "./block.js";
import { computeBlockHash, computeMerkleRoot, meetsDifficulty, } from "./block.js";
import { createGenesisBlock, type GenesisConfig } from "./genesis.js";
import type { Validator } from "./validator.js";



export class ChainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChainValidationError";
  }
}

/**
 * The blockchain. A sequence of blocks, each linking to the previous via hash.
 * The chain validates every block: hash correctness, difficulty, previousHash
 * linkage, merkle root, and index sequence.
 */
export class Blockchain {
  private readonly blocks: Block[] = [];
  private readonly mempool: Transaction[] = [];
  readonly genesisConfig: GenesisConfig;
  readonly genesisHash: string;
  readonly difficulty: number;

  constructor(genesisConfig: GenesisConfig) {
    this.genesisConfig = genesisConfig;
    this.difficulty = genesisConfig.difficulty;
    const genesis = createGenesisBlock(genesisConfig);
    this.blocks.push(genesis);
    this.genesisHash = genesis.hash;
  }

  get height(): number {
    return this.blocks.length;
  }

  get latestBlock(): Block {
    return this.blocks[this.blocks.length - 1];
  }

  getBlock(index: number): Block | undefined {
    return this.blocks[index];
  }

  /** Add a transaction to the mempool. */
  addTransaction(tx: Transaction): void {
    if (tx.amount < 0) throw new ChainValidationError("negative amount");
    this.mempool.push(tx);
  }

  /**
   * Append a block produced by a validator. The block is fully validated
   * before being accepted. Rejects invalid blocks.
   */
  appendBlock(block: Block): void {
    this.validateBlock(block, this.latestBlock);
    this.blocks.push(block);
    // Remove included transactions from mempool.
    for (const tx of block.transactions) {
      const idx = this.mempool.findIndex((t) => t.id === tx.id);
      if (idx >= 0) this.mempool.splice(idx, 1);
    }
  }

  /**
   * Validate a block against its parent. Checks:
   * 1. Index is parent.index + 1
   * 2. previousHash matches parent.hash
   * 3. Hash meets difficulty target
   * 4. Hash is correctly computed from header
   * 5. Merkle root is correct
   */
  validateBlock(block: Block, parent: Block): void {
    if (block.index !== parent.index + 1) {
      throw new ChainValidationError(`invalid index: expected ${parent.index + 1}, got ${block.index}`);
    }
    if (block.previousHash !== parent.hash) {
      throw new ChainValidationError("previousHash mismatch");
    }
    if (!meetsDifficulty(block.hash, block.difficulty)) {
      throw new ChainValidationError("hash does not meet difficulty target");
    }
    const recomputedHash = computeBlockHash({
      index: block.index,
      timestamp: block.timestamp,
      previousHash: block.previousHash,
      merkleRoot: block.merkleRoot,
      nonce: block.nonce,
      difficulty: block.difficulty,
      validatorId: block.validatorId,
    });
    if (recomputedHash !== block.hash) {
      throw new ChainValidationError("hash mismatch — block may be tampered");
    }
    const expectedMerkle = computeMerkleRoot(block.transactions);
    if (expectedMerkle !== block.merkleRoot) {
      throw new ChainValidationError("merkle root mismatch");
    }
  }

  /**
   * Validate the entire chain from genesis. Catches any tampering.
   */
  validateChain(): boolean {
    // Validate genesis.
    const genesis = this.blocks[0];
    if (genesis.previousHash !== "0".repeat(64)) {
      throw new ChainValidationError("genesis has invalid previousHash");
    }
    // Validate each subsequent block.
    for (let i = 1; i < this.blocks.length; i++) {
      this.validateBlock(this.blocks[i], this.blocks[i - 1]);
    }
    return true;
  }

  /** Mine and append a block from the current mempool using a validator. */
  minePending(validator: Validator): Block | null {
    if (this.mempool.length === 0) return null;
    const txs = [...this.mempool];
    const block = validator.produceBlock(
      this.latestBlock.index + 1,
      this.latestBlock.hash,
      txs,
      this.difficulty,
    );
    this.appendBlock(block);
    return block;
  }

  getMempoolSize(): number {
    return this.mempool.length;
  }

  getBlocks(): readonly Block[] {
    return [...this.blocks];
  }
}
