import type { Currency, MinorUnits } from "./units.js";

export type AllocationStatus = "pending" | "settled" | "failed";

export interface RevenueEvent {
  readonly id: string;
  readonly timestamp: number;
  /** origin: what generated the revenue (e.g. "subscription", "ads", "tips") */
  readonly origin: string;
  /** gross revenue received */
  readonly grossAmount: MinorUnits;
  readonly currency: Currency;
  /** costs deducted to reach net distributable */
  readonly costs: MinorUnits;
  /** idempotency key — the same event processed twice must not double-distribute */
  readonly idempotencyKey: string;
  readonly auditRef?: string;
}

export interface CreatorAllocation {
  readonly eventId: string;
  readonly creatorId: string;
  readonly amount: MinorUnits;
  readonly currency: Currency;
  readonly status: AllocationStatus;
  readonly createdAt: number;
}

export interface PlatformAllocation {
  readonly eventId: string;
  readonly amount: MinorUnits;
  readonly currency: Currency;
  readonly status: AllocationStatus;
  readonly createdAt: number;
}

export interface LedgerEntry {
  readonly id: string;
  readonly eventId: string;
  readonly timestamp: number;
  readonly type: "revenue" | "creator_allocation" | "platform_allocation" | "settlement";
  readonly amount: MinorUnits;
  readonly currency: Currency;
  readonly counterpartyId?: string;
  readonly auditRef?: string;
}

export interface Settlement {
  readonly id: string;
  readonly eventId: string;
  readonly creatorId: string;
  readonly amount: MinorUnits;
  readonly currency: Currency;
  readonly settledAt: number;
  readonly txRef?: string;
}

export class LedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LedgerError";
  }
}

export class IdempotencyError extends LedgerError {
  constructor(key: string) {
    super(`duplicate revenue event: ${key}`);
    this.name = "IdempotencyError";
  }
}

export class InvalidRevenueError extends LedgerError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRevenueError";
  }
}
