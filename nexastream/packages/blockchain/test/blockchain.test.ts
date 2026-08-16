import { describe, it, expect } from "vitest";
import {
  Blockchain,
  Validator,
  NEXASTREAM_GENESIS,
  createGenesisBlock,
  genesisHash,
  computeBlockHash,
  computeMerkleRoot,
  meetsDifficulty,
  mineBlock,
  type Transaction,
} from "../src/index.js";

describe("Genesis", () => {
  it("produces a deterministic genesis block", () => {
    const g1 = createGenesisBlock(NEXASTREAM_GENESIS);
    const g2 = createGenesisBlock(NEXASTREAM_GENESIS);
    expect(g1.hash).toBe(g2.hash);
    expect(g1.index).toBe(0);
    expect(g1.previousHash).toBe("0".repeat(64));
  });

  it("genesis hash is stable and non-empty", () => {
    const hash = genesisHash(NEXASTREAM_GENESIS);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe("0".repeat(64));
  });

  it("genesis meets difficulty target", () => {
    const genesis = createGenesisBlock(NEXASTREAM_GENESIS);
    expect(meetsDifficulty(genesis.hash, NEXASTREAM_GENESIS.difficulty)).toBe(true);
  });

  it("different genesis configs produce different hashes", () => {
    const alt = { ...NEXASTREAM_GENESIS, chainId: "different-chain" };
    expect(genesisHash(alt)).not.toBe(genesisHash(NEXASTREAM_GENESIS));
  });

  it("has 3 independent validators in genesis", () => {
    expect(NEXASTREAM_GENESIS.initialValidators.length).toBe(3);
    const ids = NEXASTREAM_GENESIS.initialValidators.map((v) => v.id);
    expect(new Set(ids).size).toBe(3); // all unique
    const keys = NEXASTREAM_GENESIS.initialValidators.map((v) => v.publicKey);
    expect(new Set(keys).size).toBe(3); // all unique keys
  });
});

describe("Validator independence", () => {
  it("each validator has a unique key pair", () => {
    const v1 = new Validator("v1");
    const v2 = new Validator("v2");
    const v3 = new Validator("v3");
    expect(v1.publicKey).not.toBe(v2.publicKey);
    expect(v1.publicKey).not.toBe(v3.publicKey);
    expect(v2.publicKey).not.toBe(v3.publicKey);
  });

  it("validators sign transactions with their own keys", () => {
    const v = new Validator("v1");
    const tx = v.signTransaction("addr-a", "addr-b", 100);
    expect(tx.signature).toBeTruthy();
    expect(tx.from).toBe("addr-a");
    expect(tx.to).toBe("addr-b");
    expect(tx.amount).toBe(100);
  });
});

describe("Blockchain — block production and validation", () => {
  it("initializes with a genesis block", () => {
    const chain = new Blockchain(NEXASTREAM_GENESIS);
    expect(chain.height).toBe(1);
    expect(chain.latestBlock.index).toBe(0);
  });

  it("mines and appends a valid block", () => {
    const chain = new Blockchain(NEXASTREAM_GENESIS);
    const validator = new Validator("validator-1");
    const tx = validator.signTransaction("addr-a", "addr-b", 50);
    chain.addTransaction(tx);
    const block = chain.minePending(validator);
    expect(block).not.toBeNull();
    expect(chain.height).toBe(2);
    expect(chain.latestBlock.index).toBe(1);
    expect(chain.latestBlock.previousHash).toBe(chain.getBlock(0)!.hash);
  });

  it("validates the full chain", () => {
    const chain = new Blockchain(NEXASTREAM_GENESIS);
    const v1 = new Validator("v1");
    const v2 = new Validator("v2");
    chain.addTransaction(v1.signTransaction("a", "b", 10));
    chain.minePending(v1);
    chain.addTransaction(v2.signTransaction("b", "c", 20));
    chain.minePending(v2);
    expect(chain.validateChain()).toBe(true);
  });

  it("detects tampered block hash", () => {
    const chain = new Blockchain(NEXASTREAM_GENESIS);
    const v = new Validator("v");
    chain.addTransaction(v.signTransaction("a", "b", 10));
    const block = chain.minePending(v)!;
    // Tamper: create a fake block with wrong hash.
    const fakeBlock = { ...block, hash: "0".repeat(64) };
    expect(() => chain.validateBlock(fakeBlock, chain.getBlock(0)!)).toThrow();
  });

  it("detects broken chain linkage", () => {
    const chain = new Blockchain(NEXASTREAM_GENESIS);
    const v = new Validator("v");
    chain.addTransaction(v.signTransaction("a", "b", 10));
    const block = chain.minePending(v)!;
    // Tamper: wrong previousHash.
    const fakeBlock = { ...block, previousHash: "f".repeat(64) };
    expect(() => chain.validateBlock(fakeBlock, chain.getBlock(0)!)).toThrow();
  });

  it("rejects block with invalid index", () => {
    const chain = new Blockchain(NEXASTREAM_GENESIS);
    const v = new Validator("v");
    chain.addTransaction(v.signTransaction("a", "b", 10));
    const block = chain.minePending(v)!;
    // Tamper: wrong index.
    const fakeBlock = { ...block, index: 99 };
    expect(() => chain.validateBlock(fakeBlock, chain.getBlock(0)!)).toThrow();
  });

  it("rejects negative-amount transactions", () => {
    const chain = new Blockchain(NEXASTREAM_GENESIS);
    const badTx: Transaction = {
      id: "bad",
      from: "a",
      to: "b",
      amount: -5,
      timestamp: Date.now(),
      signature: "sig",
    };
    expect(() => chain.addTransaction(badTx)).toThrow();
  });

  it("returns null when mining empty mempool", () => {
    const chain = new Blockchain(NEXASTREAM_GENESIS);
    const v = new Validator("v");
    expect(chain.minePending(v)).toBeNull();
  });
});

describe("Multi-validator consensus (round-robin)", () => {
  it("3 validators take turns producing blocks", () => {
    const chain = new Blockchain(NEXASTREAM_GENESIS);
    const validators = [
      new Validator("validator-1"),
      new Validator("validator-2"),
      new Validator("validator-3"),
    ];

    // Each validator produces one block in turn.
    for (let i = 0; i < 3; i++) {
      const v = validators[i];
      chain.addTransaction(v.signTransaction("a", "b", (i + 1) * 10));
      const block = chain.minePending(v);
      expect(block).not.toBeNull();
      expect(block!.validatorId).toBe(v.id);
    }

    expect(chain.height).toBe(4); // genesis + 3 blocks
    expect(chain.validateChain()).toBe(true);

    // All 3 validators should have produced blocks.
    const blockValidators = [chain.getBlock(1)!, chain.getBlock(2)!, chain.getBlock(3)!].map(
      (b) => b.validatorId,
    );
    expect(new Set(blockValidators).size).toBe(3);
  });
});

describe("Block hashing and merkle", () => {
  it("computes merkle root for transactions", () => {
    const txs: Transaction[] = [
      { id: "tx1", from: "a", to: "b", amount: 1, timestamp: 1, signature: "s1" },
      { id: "tx2", from: "b", to: "c", amount: 2, timestamp: 2, signature: "s2" },
    ];
    const root = computeMerkleRoot(txs);
    expect(root).toMatch(/^[0-9a-f]{64}$/);
    expect(computeMerkleRoot(txs)).toBe(root); // deterministic
  });

  it("empty merkle root is deterministic", () => {
    const root = computeMerkleRoot([]);
    expect(root).toMatch(/^[0-9a-f]{64}$/);
    expect(computeMerkleRoot([])).toBe(root);
  });

  it("meetsDifficulty checks leading zeros", () => {
    expect(meetsDifficulty("00abc", 8)).toBe(true);
    expect(meetsDifficulty("0abc", 8)).toBe(false);
    expect(meetsDifficulty("0000abc", 16)).toBe(true);
  });
});
