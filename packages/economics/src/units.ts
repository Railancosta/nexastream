/**
 * Minimum monetary unit. All monetary values in the ledger are represented as
 * integer multiples of this base unit — never as floating point.
 *
 * 1 NST = 10^18 base units (wei-equivalent). Revenue in fiat is represented
 * as integer minor units (e.g. cents) — 1.00 BRL = 100 minor units.
 */
export const NST_DECIMALS = 18;
export const NST_BASE_UNIT = 10n ** BigInt(NST_DECIMALS);
export const MAX_SUPPLY = 55_000_000n * NST_BASE_UNIT; // 55M * 10^18

export type Currency = "BRL" | "USD" | "NST";

/**
 * A signed integer monetary amount in minor units. BigInt guarantees no
 * floating-point drift — rule 24: "Never use floating point for monetary
 * values. Use minimum integer units."
 */
export type MinorUnits = bigint;
