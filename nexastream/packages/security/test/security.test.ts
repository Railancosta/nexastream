import { describe, it, expect } from "vitest";
import { Ledger5050, InvalidRevenueError, IdempotencyError } from "@nexastream/economics";
import { Blockchain, Validator, NEXASTREAM_GENESIS } from "@nexastream/blockchain";
import {
  fuzzEmail,
  fuzzChunkSizes,
  fuzzJsonPayloads,
  sqlInjectionPatterns,
  xssPatterns,
  randomString,
} from "../src/index.js";

describe("Security — ledger idempotency under fuzzing", () => {
  it("rejects duplicate idempotency keys with different data", () => {
    const ledger = new Ledger5050();
    ledger.recordRevenue({
      origin: "ads",
      grossAmount: 10000n,
      currency: "BRL",
      costs: 0n,
      creatorId: "creator-1",
      idempotencyKey: "fuzz-key-1",
    });
    expect(() =>
      ledger.recordRevenue({
        origin: "ads",
        grossAmount: 99999n,
        currency: "BRL",
        costs: 0n,
        creatorId: "creator-2",
        idempotencyKey: "fuzz-key-1",
      }),
    ).toThrow(IdempotencyError);
  });

  it("rejects negative amounts", () => {
    const ledger = new Ledger5050();
    expect(() =>
      ledger.recordRevenue({
        origin: "ads",
        grossAmount: -1n,
        currency: "BRL",
        costs: 0n,
        creatorId: "c1",
        idempotencyKey: "neg-1",
      }),
    ).toThrow(InvalidRevenueError);
  });

  it("handles 1000 rapid revenue events without double-distribution", () => {
    const ledger = new Ledger5050();
    for (let i = 0; i < 1000; i++) {
      ledger.recordRevenue({
        origin: "bulk",
        grossAmount: 100n,
        currency: "BRL",
        costs: 0n,
        creatorId: "c1",
        idempotencyKey: `bulk-${i}`,
      });
    }
    let rejections = 0;
    for (let i = 0; i < 1000; i++) {
      try {
        ledger.recordRevenue({
          origin: "bulk",
          grossAmount: 100n,
          currency: "BRL",
          costs: 0n,
          creatorId: "c1",
          idempotencyKey: `bulk-${i}`,
        });
      } catch {
        rejections++;
      }
    }
    expect(rejections).toBe(1000);
    expect(ledger.eventCount).toBe(1000);
    expect(ledger.totalCreatorAllocated()).toBe(50000n);
  });
});

describe("Security — blockchain tamper resistance", () => {
  it("rejects blocks with tampered transactions", () => {
    const chain = new Blockchain(NEXASTREAM_GENESIS);
    const v = new Validator("v1");
    chain.addTransaction(v.signTransaction("a", "b", 10));
    const block = chain.minePending(v)!;
    const tampered = {
      ...block,
      transactions: [{ ...block.transactions[0], amount: 9999 }],
    };
    expect(() => chain.validateBlock(tampered, chain.getBlock(0)!)).toThrow();
  });

  it("rejects blocks with wrong validator attribution", () => {
    const chain = new Blockchain(NEXASTREAM_GENESIS);
    const v1 = new Validator("v1");
    chain.addTransaction(v1.signTransaction("a", "b", 10));
    const block = chain.minePending(v1)!;
    const tampered = { ...block, validatorId: "fake-validator" };
    expect(() => chain.validateBlock(tampered, chain.getBlock(0)!)).toThrow();
  });
});

describe("Security — SQL injection patterns rejected", () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const pattern of sqlInjectionPatterns()) {
    it(`rejects SQL injection as email: "${pattern.slice(0, 30)}..."`, () => {
      expect(emailRegex.test(pattern)).toBe(false);
    });
  }
});

describe("Security — XSS patterns detected", () => {
  it("identifies script tags in XSS payloads", () => {
    for (const payload of xssPatterns()) {
      const hasScript = /<script|onerror=|onload=|javascript:/i.test(payload);
      expect(hasScript || payload.includes("alert")).toBe(true);
    }
  });
});

describe("Security — fuzz inputs", () => {
  it("generates varied email fuzz inputs", () => {
    const emails = Array.from({ length: 20 }, () => fuzzEmail());
    expect(emails.length).toBe(20);
    expect(new Set(emails).size).toBeGreaterThan(1);
  });

  it("generates chunk size edge cases", () => {
    const sizes = fuzzChunkSizes(8388608);
    expect(sizes).toContain(0);
    expect(sizes).toContain(8388608);
    expect(sizes).toContain(-1);
    expect(sizes).toContain(8388609);
  });

  it("generates malformed JSON payloads", () => {
    const payloads = fuzzJsonPayloads();
    expect(payloads.length).toBeGreaterThan(10);
    expect(payloads).toContain("");
  });

  it("randomString produces variable-length output", () => {
    const s10 = randomString(10);
    const s100 = randomString(100);
    expect(s10.length).toBe(10);
    expect(s100.length).toBe(100);
  });
});
