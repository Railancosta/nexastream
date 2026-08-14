import { describe, it, expect } from "vitest";
import {
  pqHash, pqMemoryHash, generateQuantumSeed, pqMerkleRoot,
  meetsPqDifficulty, minePqHash, PQ_HASH_BITS, SHA256_BITS, QUANTUM_RESISTANCE,
  DOMAINS,
} from "../src/index.js";

describe("Post-Quantum Hash — pqHash", () => {
  it("produces a 512-bit (128 hex char) hash", () => {
    const hash = pqHash("test-data", "block");
    expect(hash).toHaveLength(128);
    expect(hash).toMatch(/^[0-9a-f]{128}$/);
  });

  it("is deterministic (same input = same hash)", () => {
    const h1 = pqHash("same-data", "block");
    const h2 = pqHash("same-data", "block");
    expect(h1).toBe(h2);
  });

  it("produces different hashes for different inputs", () => {
    const h1 = pqHash("data-1", "block");
    const h2 = pqHash("data-2", "block");
    expect(h1).not.toBe(h2);
  });

  it("uses domain separation (different domains = different hashes)", () => {
    const h1 = pqHash("same-data", "block");
    const h2 = pqHash("same-data", "transaction");
    const h3 = pqHash("same-data", "genesis");
    expect(h1).not.toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h2).not.toBe(h3);
  });

  it("is different from plain SHA-256 (superior)", () => {
    const pq = pqHash("comparison", "block");
    const sha256 = require("node:crypto").createHash("sha256").update("comparison").digest("hex");
    expect(pq).not.toBe(sha256);
    expect(pq.length).toBeGreaterThan(sha256.length); // 128 > 64
  });

  it("is different from plain SHA-512 (cascade + salt + domain)", () => {
    const pq = pqHash("comparison", "block");
    const sha512 = require("node:crypto").createHash("sha512").update("comparison").digest("hex");
    expect(pq).not.toBe(sha512);
  });
});

describe("Post-Quantum Memory Hash — pqMemoryHash", () => {
  it("produces a 512-bit hash", () => {
    const hash = pqMemoryHash("test-input");
    expect(hash).toHaveLength(128);
  });

  it("is deterministic", () => {
    const h1 = pqMemoryHash("same");
    const h2 = pqMemoryHash("same");
    expect(h1).toBe(h2);
  });

  it("is memory-hard (takes measurable time)", () => {
    const start = Date.now();
    pqMemoryHash("performance-test");
    const elapsed = Date.now() - start;
    // scrypt with N=16384 should take at least a few ms
    expect(elapsed).toBeGreaterThan(5);
  });
});

describe("Quantum Seed Generation", () => {
  it("generates a unique seed each time", () => {
    const s1 = generateQuantumSeed();
    const s2 = generateQuantumSeed();
    expect(s1.seed).not.toBe(s2.seed);
    expect(s1.derived).not.toBe(s2.derived);
  });

  it("seed is 128 hex chars (64 bytes = 512 bits entropy)", () => {
    const { seed } = generateQuantumSeed();
    expect(seed).toHaveLength(128);
    expect(seed).toMatch(/^[0-9a-f]{128}$/);
  });

  it("derived key is 128 hex chars (512 bits)", () => {
    const { derived } = generateQuantumSeed();
    expect(derived).toHaveLength(128);
  });
});

describe("Post-Quantum Merkle Root", () => {
  it("computes merkle root from items", () => {
    const root = pqMerkleRoot(["tx1", "tx2", "tx3", "tx4"]);
    expect(root).toHaveLength(128);
    expect(root).toMatch(/^[0-9a-f]{128}$/);
  });

  it("is deterministic", () => {
    const r1 = pqMerkleRoot(["a", "b"]);
    const r2 = pqMerkleRoot(["a", "b"]);
    expect(r1).toBe(r2);
  });

  it("changes when items change", () => {
    const r1 = pqMerkleRoot(["a", "b"]);
    const r2 = pqMerkleRoot(["a", "c"]);
    expect(r1).not.toBe(r2);
  });

  it("handles single item", () => {
    const root = pqMerkleRoot(["single"]);
    expect(root).toHaveLength(128);
  });

  it("handles empty list", () => {
    const root = pqMerkleRoot([]);
    expect(root).toHaveLength(128);
  });
});

describe("Post-Quantum Difficulty", () => {
  it("meets difficulty with leading zeros", () => {
    expect(meetsPqDifficulty("00abc", 8)).toBe(true);
    expect(meetsPqDifficulty("0abc", 8)).toBe(false);
    expect(meetsPqDifficulty("0000abc", 16)).toBe(true);
  });

  it("mines a hash meeting difficulty", () => {
    const { nonce, hash } = minePqHash("mine-test", "block", 4);
    expect(meetsPqDifficulty(hash, 4)).toBe(true);
    expect(nonce).toBeGreaterThanOrEqual(0);
  });

  it("mined hash is 512-bit", () => {
    const { hash } = minePqHash("size-test", "block", 4);
    expect(hash).toHaveLength(128);
  });
});

describe("Quantum Resistance Comparison", () => {
  it("PQ hash has 512 bits (vs 256 for SHA-256)", () => {
    expect(PQ_HASH_BITS).toBe(512);
    expect(SHA256_BITS).toBe(256);
    expect(PQ_HASH_BITS).toBeGreaterThan(SHA256_BITS);
  });

  it("documents quantum resistance levels", () => {
    expect(QUANTUM_RESISTANCE.sha256).toContain("2^128");
    expect(QUANTUM_RESISTANCE.pqHash).toContain("2^256");
    expect(QUANTUM_RESISTANCE.pqMemoryHash).toContain("memory-hard");
  });
});

describe("Domain Separation", () => {
  it("has all required domains", () => {
    expect(DOMAINS.block).toBe("NST-BLOCK:");
    expect(DOMAINS.transaction).toBe("NST-TX:");
    expect(DOMAINS.merkle).toBe("NST-MERKLE:");
    expect(DOMAINS.state).toBe("NST-STATE:");
    expect(DOMAINS.genesis).toBe("NST-GENESIS:");
    expect(DOMAINS.validator).toBe("NST-VALID:");
    expect(DOMAINS.wallet).toBe("NST-WALLET:");
  });
});
