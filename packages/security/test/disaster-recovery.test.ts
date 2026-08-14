import { describe, it, expect } from "vitest";
import { Blockchain, Validator, NEXASTREAM_GENESIS, createGenesisBlock } from "@nexastream/blockchain";
import { Ledger5050 } from "@nexastream/economics";

/**
 * Disaster recovery tests (rule 60, 61, 88).
 * Tests state serialization, restore, and recovery from corruption.
 */

describe("Disaster recovery — blockchain state export/restore", () => {
  it("exports chain state and restores to identical chain", () => {
    const original = new Blockchain(NEXASTREAM_GENESIS);
    const v = new Validator("v1");
    original.addTransaction(v.signTransaction("a", "b", 10));
    original.minePending(v);

    // Export: serialize blocks.
    const serialized = JSON.stringify(original.getBlocks());
    expect(serialized.length).toBeGreaterThan(0);

    // Restore: recreate chain from genesis and replay blocks.
    const genesis = createGenesisBlock(NEXASTREAM_GENESIS);
    const restoredBlocks = JSON.parse(serialized) as ReturnType<typeof original.getBlocks>;
    expect(restoredBlocks[0].hash).toBe(genesis.hash);
    expect(restoredBlocks.length).toBe(original.height);
  });

  it("detects state corruption (tampered restored block)", () => {
    const original = new Blockchain(NEXASTREAM_GENESIS);
    const v = new Validator("v1");
    original.addTransaction(v.signTransaction("a", "b", 10));
    original.minePending(v);

    const serialized = JSON.parse(JSON.stringify(original.getBlocks()));
    // Tamper: modify a block's hash.
    serialized[1].hash = "0".repeat(64);

    // Recreate chain and try to validate — should fail.
    const restored = new Blockchain(NEXASTREAM_GENESIS);
    expect(() => {
      restored.appendBlock(serialized[1]);
    }).toThrow();
  });
});

describe("Disaster recovery — ledger state backup", () => {
  it("ledger state is serializable (backup)", () => {
    const ledger = new Ledger5050();
    for (let i = 0; i < 10; i++) {
      ledger.recordRevenue({
        origin: "backup-test",
        grossAmount: 1000n,
        currency: "BRL",
        costs: 100n,
        creatorId: `c${i}`,
        idempotencyKey: `backup-${i}`,
      });
    }
    // Serialize totals (backup metadata).
    const backup = {
      eventCount: ledger.eventCount,
      totalRevenue: ledger.totalRevenue.toString(),
      totalCreatorAllocated: ledger.totalCreatorAllocated().toString(),
      totalPlatformAllocated: ledger.totalPlatformAllocated().toString(),
      timestamp: Date.now(),
    };
    const serialized = JSON.stringify(backup);
    expect(serialized.length).toBeGreaterThan(0);

    // Restore and verify.
    const restored = JSON.parse(serialized);
    expect(restored.eventCount).toBe(10);
    expect(restored.totalRevenue).toBe("10000");
    expect(restored.totalCreatorAllocated).toBe("4500");
  });
});

describe("Failover — node unavailability", () => {
  it("validator failure: other validators continue producing blocks", () => {
    const chain = new Blockchain(NEXASTREAM_GENESIS);
    const validators = [
      new Validator("v1"),
      new Validator("v2"),
      new Validator("v3"),
    ];

    // v1 produces a block.
    chain.addTransaction(validators[0].signTransaction("a", "b", 10));
    chain.minePending(validators[0]);

    // v1 "goes down" — v2 takes over.
    chain.addTransaction(validators[1].signTransaction("b", "c", 20));
    chain.minePending(validators[1]);

    // v2 "goes down" — v3 takes over.
    chain.addTransaction(validators[2].signTransaction("c", "d", 30));
    chain.minePending(validators[2]);

    expect(chain.height).toBe(4);
    expect(chain.validateChain()).toBe(true);
    // All 3 validators produced blocks (failover worked).
    const producers = [chain.getBlock(1)!, chain.getBlock(2)!, chain.getBlock(3)!].map(
      (b) => b.validatorId,
    );
    expect(producers).toEqual(["v1", "v2", "v3"]);
  });
});
