import { describe, it, expect } from "vitest";
import { Ledger5050, IdempotencyError, InvalidRevenueError } from "../src/index.js";

describe("Ledger5050", () => {
  it("records revenue and splits 50/50 on net distributable", () => {
    const ledger = new Ledger5050();
    const { event, creatorAllocation, platformAllocation } = ledger.recordRevenue({
      origin: "subscription",
      grossAmount: 10000n, // 100.00 (minor units)
      currency: "BRL",
      costs: 1000n, // 10.00
      creatorId: "creator-1",
      idempotencyKey: "key-001",
    });

    // Net distributable = 10000 - 1000 = 9000
    // Creator = 4500, Platform = 4500
    expect(creatorAllocation.amount).toBe(4500n);
    expect(platformAllocation.amount).toBe(4500n);
    expect(creatorAllocation.amount + platformAllocation.amount).toBe(9000n);
    expect(event.grossAmount).toBe(10000n);
    expect(event.costs).toBe(1000n);
    expect(event.idempotencyKey).toBe("key-001");
  });

  it("is idempotent — same key does not double-distribute", () => {
    const ledger = new Ledger5050();
    ledger.recordRevenue({
      origin: "ads",
      grossAmount: 5000n,
      currency: "BRL",
      costs: 0n,
      creatorId: "creator-1",
      idempotencyKey: "dup-key",
    });
    expect(() =>
      ledger.recordRevenue({
        origin: "ads",
        grossAmount: 5000n,
        currency: "BRL",
        costs: 0n,
        creatorId: "creator-1",
        idempotencyKey: "dup-key",
      }),
    ).toThrow(IdempotencyError);
  });

  it("rejects zero gross revenue", () => {
    const ledger = new Ledger5050();
    expect(() =>
      ledger.recordRevenue({
        origin: "ads",
        grossAmount: 0n,
        currency: "BRL",
        costs: 0n,
        creatorId: "creator-1",
        idempotencyKey: "k1",
      }),
    ).toThrow(InvalidRevenueError);
  });

  it("rejects costs exceeding gross", () => {
    const ledger = new Ledger5050();
    expect(() =>
      ledger.recordRevenue({
        origin: "ads",
        grossAmount: 100n,
        currency: "BRL",
        costs: 200n,
        creatorId: "creator-1",
        idempotencyKey: "k2",
      }),
    ).toThrow(InvalidRevenueError);
  });

  it("rejects empty idempotency key", () => {
    const ledger = new Ledger5050();
    expect(() =>
      ledger.recordRevenue({
        origin: "ads",
        grossAmount: 100n,
        currency: "BRL",
        costs: 0n,
        creatorId: "creator-1",
        idempotencyKey: "",
      }),
    ).toThrow(InvalidRevenueError);
  });

  it("validates the 50/50 invariant", () => {
    const ledger = new Ledger5050();
    const { event } = ledger.recordRevenue({
      origin: "tips",
      grossAmount: 7777n,
      currency: "BRL",
      costs: 777n,
      creatorId: "creator-2",
      idempotencyKey: "k3",
    });
    expect(ledger.validateInvariant(event.id)).toBe(true);
  });

  it("handles zero costs (full split of gross)", () => {
    const ledger = new Ledger5050();
    const { creatorAllocation, platformAllocation } = ledger.recordRevenue({
      origin: "ads",
      grossAmount: 1000n,
      currency: "BRL",
      costs: 0n,
      creatorId: "creator-1",
      idempotencyKey: "k4",
    });
    expect(creatorAllocation.amount).toBe(500n);
    expect(platformAllocation.amount).toBe(500n);
  });

  it("handles odd net amounts with floor (no float)", () => {
    const ledger = new Ledger5050();
    // net = 7 (odd) -> creator = 3, platform = 4 (creator floored)
    const { creatorAllocation, platformAllocation } = ledger.recordRevenue({
      origin: "ads",
      grossAmount: 7n,
      currency: "BRL",
      costs: 0n,
      creatorId: "creator-1",
      idempotencyKey: "k5",
    });
    expect(creatorAllocation.amount + platformAllocation.amount).toBe(7n);
    expect(creatorAllocation.amount).toBe(3n);
    expect(platformAllocation.amount).toBe(4n);
  });

  it("settles a creator allocation idempotently", () => {
    const ledger = new Ledger5050();
    const { event } = ledger.recordRevenue({
      origin: "subscription",
      grossAmount: 10000n,
      currency: "BRL",
      costs: 0n,
      creatorId: "creator-3",
      idempotencyKey: "k6",
    });
    const s1 = ledger.settle(event.id, "tx-abc");
    const s2 = ledger.settle(event.id, "tx-abc");
    expect(s1.id).toBe(s2.id); // idempotent
    expect(ledger.getCreatorAllocation(event.id)?.status).toBe("settled");
    expect(ledger.getSettlement(event.id)?.txRef).toBe("tx-abc");
  });

  it("produces an audit trail with all entries", () => {
    const ledger = new Ledger5050();
    const { event } = ledger.recordRevenue({
      origin: "ads",
      grossAmount: 10000n,
      currency: "BRL",
      costs: 0n,
      creatorId: "creator-1",
      idempotencyKey: "k7",
    });
    ledger.settle(event.id, "tx-def");
    const trail = ledger.auditTrail(event.id);
    expect(trail.length).toBe(4); // revenue + creator + platform + settlement
    expect(trail.map((e) => e.type)).toEqual([
      "revenue",
      "creator_allocation",
      "platform_allocation",
      "settlement",
    ]);
  });

  it("aggregates totals correctly", () => {
    const ledger = new Ledger5050();
    ledger.recordRevenue({
      origin: "ads",
      grossAmount: 10000n,
      currency: "BRL",
      costs: 1000n,
      creatorId: "creator-1",
      idempotencyKey: "k8",
    });
    ledger.recordRevenue({
      origin: "tips",
      grossAmount: 5000n,
      currency: "BRL",
      costs: 0n,
      creatorId: "creator-2",
      idempotencyKey: "k9",
    });
    expect(ledger.totalRevenue).toBe(15000n);
    expect(ledger.totalNetDistributable).toBe(14000n);
    expect(ledger.totalCreatorAllocated()).toBe(7000n);
    expect(ledger.totalPlatformAllocated()).toBe(7000n);
    expect(ledger.eventCount).toBe(2);
  });
});
