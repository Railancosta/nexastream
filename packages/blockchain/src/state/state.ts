import type { Transaction } from "../block.js";
// MAX_SUPPLY constant — 55,000,000 NST * 10^18 base units
const NST_DECIMALS = 18;
const NST_BASE_UNIT = 10n ** BigInt(NST_DECIMALS);
const MAX_SUPPLY = 55_000_000n * NST_BASE_UNIT;

export interface AccountState {
  balance: bigint;
  nonce: number;
}

/**
 * Blockchain state manager — tracks account balances and nonces.
 * Rule 24: no floating point. All balances are bigint (wei-equivalent).
 * Rule 46: MAX_SUPPLY (55M) is an invariant — total supply can never exceed it.
 */
export class StateManager {
  private readonly accounts = new Map<string, AccountState>();
  private totalSupply = 0n;

  getBalance(address: string): bigint {
    return this.accounts.get(address)?.balance ?? 0n;
  }

  getNonce(address: string): number {
    return this.accounts.get(address)?.nonce ?? 0;
  }

  getTotalSupply(): bigint {
    return this.totalSupply;
  }

  /** Mint NST tokens (block reward). Respects MAX_SUPPLY invariant. */
  mint(to: string, amount: bigint): void {
    if (amount <= 0n) throw new Error("mint amount must be positive");
    if (this.totalSupply + amount > MAX_SUPPLY) {
      throw new Error("mint would exceed MAX_SUPPLY (55,000,000 NST)");
    }
    const acc = this.getOrCreate(to);
    acc.balance += amount;
    this.totalSupply += amount;
  }

  /** Transfer NST between accounts. Validates balance and nonce. */
  transfer(from: string, to: string, amount: bigint, nonce: number): void {
    if (amount <= 0n) throw new Error("transfer amount must be positive");
    const fromAcc = this.accounts.get(from);
    if (!fromAcc || fromAcc.balance < amount) {
      throw new Error("insufficient balance");
    }
    if (fromAcc.nonce !== nonce) {
      throw new Error(`nonce mismatch: expected ${fromAcc.nonce}, got ${nonce}`);
    }
    const toAcc = this.getOrCreate(to);
    fromAcc.balance -= amount;
    toAcc.balance += amount;
    fromAcc.nonce++;
  }

  /** Apply a transaction to the state. */
  applyTransaction(tx: Transaction): void {
    if (tx.from === "0x0" && tx.to === "0x0") {
      // Genesis transaction — skip.
      return;
    }
    if (tx.from === "0x0") {
      // Mint (block reward).
      this.mint(tx.to, BigInt(tx.amount));
    } else {
      // Regular transfer.
      this.transfer(tx.from, tx.to, BigInt(tx.amount), tx.nonce ?? 0);
    }
  }

  /** Apply all transactions in a block. */
  applyBlock(txs: readonly Transaction[]): void {
    for (const tx of txs) {
      this.applyTransaction(tx);
    }
  }

  /** Get all account states (for explorer/API). */
  getAccounts(): Array<{ address: string; balance: string; nonce: number }> {
    return Array.from(this.accounts.entries()).map(([address, state]) => ({
      address,
      balance: state.balance.toString(),
      nonce: state.nonce,
    }));
  }

  /** Serialize state for persistence. */
  serialize(): string {
    return JSON.stringify({
      accounts: Array.from(this.accounts.entries()).map(([addr, s]) => [addr, s.balance.toString(), s.nonce]),
      totalSupply: this.totalSupply.toString(),
    });
  }

  /** Deserialize and restore state. */
  static deserialize(data: string): StateManager {
    const sm = new StateManager();
    try {
      const parsed = JSON.parse(data);
      for (const [addr, balance, nonce] of parsed.accounts) {
        sm.accounts.set(addr, { balance: BigInt(balance), nonce });
      }
      sm.totalSupply = BigInt(parsed.totalSupply);
    } catch {
      // Corrupt state — start fresh.
    }
    return sm;
  }

  private getOrCreate(address: string): AccountState {
    let acc = this.accounts.get(address);
    if (!acc) {
      acc = { balance: 0n, nonce: 0 };
      this.accounts.set(address, acc);
    }
    return acc;
  }
}
