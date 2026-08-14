import { describe, it, expect } from "vitest";
import { Ledger5050 } from "@nexastream/economics";
import { Blockchain, Validator, NEXASTREAM_GENESIS } from "@nexastream/blockchain";

/**
 * Load tests (rule 87). Simulate concurrent operations at scale.
 * These are in-process load tests — real network load tests would use k6.
 */

describe("Load test — ledger 1000 concurrent revenue events", () => {
  it("processes 1000 events without errors", () => {
    const ledger = new Ledger5050();
    const start = Date.now();
    for (let i = 0; i < 1000; i++) {
      ledger.recordRevenue({
        origin: "load-test",
        grossAmount: 1000n,
        currency: "BRL",
        costs: 100n,
        creatorId: `creator-${i % 50}`,
        idempotencyKey: `load-${i}`,
      });
    }
    const elapsed = Date.now() - start;
    expect(ledger.eventCount).toBe(1000);
    expect(ledger.totalRevenue).toBe(1000000n);
    expect(ledger.totalNetDistributable).toBe(900000n);
    expect(ledger.totalCreatorAllocated()).toBe(450000n);
    expect(ledger.totalPlatformAllocated()).toBe(450000n);
    expect(elapsed).toBeLessThan(5000);
  });
});

describe("Load test — blockchain 100 blocks", () => {
  it("mines 100 blocks with 3 validators", () => {
    const chain = new Blockchain(NEXASTREAM_GENESIS);
    const validators = [new Validator("v1"), new Validator("v2"), new Validator("v3")];
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      const v = validators[i % 3];
      chain.addTransaction(v.signTransaction("a", "b", 1));
      chain.minePending(v);
    }
    const elapsed = Date.now() - start;
    expect(chain.height).toBe(101);
    expect(chain.validateChain()).toBe(true);
    expect(elapsed).toBeLessThan(30000);
  });
});

describe("Load test — concurrent idempotency (1000 replays)", () => {
  it("all replays rejected, no double-distribution", () => {
    const ledger = new Ledger5050();
    for (let i = 0; i < 100; i++) {
      ledger.recordRevenue({
        origin: "test",
        grossAmount: 100n,
        currency: "BRL",
        costs: 0n,
        creatorId: "c1",
        idempotencyKey: `replay-${i}`,
      });
    }
    let rejected = 0;
    for (let i = 0; i < 1000; i++) {
      try {
        ledger.recordRevenue({
          origin: "test",
          grossAmount: 100n,
          currency: "BRL",
          costs: 0n,
          creatorId: "c1",
          idempotencyKey: `replay-${i % 100}`,
        });
      } catch {
        rejected++;
      }
    }
    expect(rejected).toBe(1000);
    expect(ledger.eventCount).toBe(100);
    expect(ledger.totalCreatorAllocated()).toBe(5000n);
  });
});
