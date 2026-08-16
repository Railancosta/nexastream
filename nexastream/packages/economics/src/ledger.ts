import { randomBytes } from "node:crypto";
import type {
  CreatorAllocation,
  LedgerEntry,
  PlatformAllocation,
  RevenueEvent,
  Settlement,
} from "./types.js";
import { IdempotencyError, InvalidRevenueError } from "./types.js";
import type { MinorUnits } from "./units.js";

function genId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("hex")}`;
}

export interface RevenueInput {
  origin: string;
  grossAmount: MinorUnits;
  currency: RevenueEvent["currency"];
  costs: MinorUnits;
  creatorId: string;
  idempotencyKey: string;
  auditRef?: string;
  timestamp?: number;
}

/**
 * The 50/50 economy engine.
 *
 * Rule 23: separate "gross revenue" from "eligible net distributable revenue".
 * Rule 25: operations must be idempotent.
 * Rule 24: no floating point — all amounts are bigint minor units.
 */
export class Ledger5050 {
  private readonly events = new Map<string, RevenueEvent>();
  private readonly processedKeys = new Set<string>();
  private readonly creatorAllocations = new Map<string, CreatorAllocation>();
  private readonly platformAllocations = new Map<string, PlatformAllocation>();
  private readonly settlements = new Map<string, Settlement>();
  private readonly entries: LedgerEntry[] = [];
  private readonly creatorIds = new Map<string, string>();

  static readonly CREATOR_SHARE_BPS = 5000;
  static readonly PLATFORM_SHARE_BPS = 5000;
  static readonly BPS_DENOMINATOR = 10000;

  recordRevenue(input: RevenueInput): {
    event: RevenueEvent;
    creatorAllocation: CreatorAllocation;
    platformAllocation: PlatformAllocation;
  } {
    if (input.grossAmount <= 0n) throw new InvalidRevenueError("grossAmount must be positive");
    if (input.costs < 0n) throw new InvalidRevenueError("costs must be non-negative");
    if (input.costs > input.grossAmount) throw new InvalidRevenueError("costs cannot exceed grossAmount");
    if (!input.idempotencyKey || input.idempotencyKey.length === 0) throw new InvalidRevenueError("idempotencyKey is required");
    if (this.processedKeys.has(input.idempotencyKey)) throw new IdempotencyError(input.idempotencyKey);

    const net = input.grossAmount - input.costs;
    const creatorAmount = this.split(net, Ledger5050.CREATOR_SHARE_BPS);
    const platformAmount = net - creatorAmount;

    const event: RevenueEvent = {
      id: genId("evt"),
      timestamp: input.timestamp ?? Date.now(),
      origin: input.origin,
      grossAmount: input.grossAmount,
      currency: input.currency,
      costs: input.costs,
      idempotencyKey: input.idempotencyKey,
      auditRef: input.auditRef,
    };

    const creatorAllocation: CreatorAllocation = {
      eventId: event.id,
      creatorId: input.creatorId,
      amount: creatorAmount,
      currency: input.currency,
      status: "pending",
      createdAt: event.timestamp,
    };

    const platformAllocation: PlatformAllocation = {
      eventId: event.id,
      amount: platformAmount,
      currency: input.currency,
      status: "pending",
      createdAt: event.timestamp,
    };

    this.processedKeys.add(input.idempotencyKey);
    this.events.set(event.id, event);
    this.creatorAllocations.set(event.id, creatorAllocation);
    this.platformAllocations.set(event.id, platformAllocation);
    this.creatorIds.set(event.id, input.creatorId);

    this.entries.push({ id: genId("led"), eventId: event.id, timestamp: event.timestamp, type: "revenue", amount: event.grossAmount, currency: event.currency, auditRef: event.auditRef });
    this.entries.push({ id: genId("led"), eventId: event.id, timestamp: event.timestamp, type: "creator_allocation", amount: creatorAmount, currency: event.currency, counterpartyId: input.creatorId });
    this.entries.push({ id: genId("led"), eventId: event.id, timestamp: event.timestamp, type: "platform_allocation", amount: platformAmount, currency: event.currency });

    return { event, creatorAllocation, platformAllocation };
  }

  private split(net: MinorUnits, bps: number): MinorUnits {
    if (net <= 0n) return 0n;
    return (net * BigInt(bps)) / BigInt(Ledger5050.BPS_DENOMINATOR);
  }

  settle(eventId: string, txRef?: string): Settlement {
    const allocation = this.creatorAllocations.get(eventId);
    if (!allocation) throw new InvalidRevenueError(`no creator allocation for event ${eventId}`);
    if (this.settlements.has(eventId)) return this.settlements.get(eventId)!;
    const settlement: Settlement = { id: genId("stl"), eventId, creatorId: allocation.creatorId, amount: allocation.amount, currency: allocation.currency, settledAt: Date.now(), txRef };
    this.settlements.set(eventId, settlement);
    this.creatorAllocations.set(eventId, { ...allocation, status: "settled" });
    const plat = this.platformAllocations.get(eventId);
    if (plat) this.platformAllocations.set(eventId, { ...plat, status: "settled" });
    this.entries.push({ id: genId("led"), eventId, timestamp: settlement.settledAt, type: "settlement", amount: settlement.amount, currency: settlement.currency, counterpartyId: settlement.creatorId, auditRef: txRef });
    return settlement;
  }

  validateInvariant(eventId: string): boolean {
    const event = this.events.get(eventId);
    if (!event) return false;
    const creator = this.creatorAllocations.get(eventId);
    const platform = this.platformAllocations.get(eventId);
    if (!creator || !platform) return false;
    const net = event.grossAmount - event.costs;
    return creator.amount + platform.amount === net;
  }

  getEvent(eventId: string): RevenueEvent | undefined { return this.events.get(eventId); }
  getCreatorAllocation(eventId: string): CreatorAllocation | undefined { return this.creatorAllocations.get(eventId); }
  getPlatformAllocation(eventId: string): PlatformAllocation | undefined { return this.platformAllocations.get(eventId); }
  getSettlement(eventId: string): Settlement | undefined { return this.settlements.get(eventId); }
  auditTrail(eventId: string): LedgerEntry[] { return this.entries.filter((e) => e.eventId === eventId); }

  get totalRevenue(): MinorUnits { let t = 0n; for (const e of this.events.values()) t += e.grossAmount; return t; }
  get totalNetDistributable(): MinorUnits { let t = 0n; for (const e of this.events.values()) t += e.grossAmount - e.costs; return t; }
  totalCreatorAllocated(): MinorUnits { let t = 0n; for (const a of this.creatorAllocations.values()) t += a.amount; return t; }
  totalPlatformAllocated(): MinorUnits { let t = 0n; for (const a of this.platformAllocations.values()) t += a.amount; return t; }
  get eventCount(): number { return this.events.size; }
}
