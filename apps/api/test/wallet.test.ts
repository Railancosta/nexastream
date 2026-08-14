import { describe, it, expect, beforeEach } from "vitest";
import { NativeWallet } from "../src/services/wallet/wallet-service.js";

// Mock StateManager for testing
function createMockState() {
  const accounts = new Map<string, { balance: bigint; nonce: number }>();
  return {
    getBalance: (addr: string) => accounts.get(addr)?.balance ?? 0n,
    getNonce: (addr: string) => accounts.get(addr)?.nonce ?? 0,
    mint: (to: string, amount: bigint) => {
      let acc = accounts.get(to);
      if (!acc) { acc = { balance: 0n, nonce: 0 }; accounts.set(to, acc); }
      acc.balance += amount;
    },
    transfer: (from: string, to: string, amount: bigint, nonce: number) => {
      const fromAcc = accounts.get(from);
      if (!fromAcc || fromAcc.balance < amount) throw new Error("insufficient balance");
      if (fromAcc.nonce !== nonce) throw new Error("nonce mismatch");
      let toAcc = accounts.get(to);
      if (!toAcc) { toAcc = { balance: 0n, nonce: 0 }; accounts.set(to, toAcc); }
      fromAcc.balance -= amount;
      toAcc.balance += amount;
      fromAcc.nonce++;
    },
  };
}

describe("NativeWallet", () => {
  let wallet: NativeWallet;
  let state: any;

  beforeEach(() => {
    state = createMockState();
    state.mint("alice", 1000n * 10n ** 18n);
    wallet = new NativeWallet(state);
  });

  it("gets NST balance", () => {
    const balance = wallet.getNstBalance("alice");
    expect(parseFloat(balance)).toBe(1000);
  });

  it("gets all balances with USD value", () => {
    const balances = wallet.getBalances("alice");
    expect(balances[0].symbol).toBe("NST");
    expect(balances[0].isNative).toBe(true);
    expect(balances[0].usdValue).toBe(100); // 1000 NST * $0.10
    expect(balances.length).toBeGreaterThan(1);
  });

  it("gets total USD value", () => {
    const total = wallet.getTotalUsdValue("alice");
    expect(total).toBeGreaterThanOrEqual(100); // at least NST value
  });

  it("gets swap quote between tokens", () => {
    const quote = wallet.getSwapQuote("NST", "USDT", 100);
    expect(quote.fromToken).toBe("NST");
    expect(quote.toToken).toBe("USDT");
    expect(quote.toAmount).toBeGreaterThan(0);
    expect(quote.fee).toBeGreaterThan(0);
    expect(quote.rate).toBeGreaterThan(0);
    expect(quote.expiresAt).toBeGreaterThan(Date.now());
  });

  it("gets swap quote between any two tokens", () => {
    const quote = wallet.getSwapQuote("BTC", "ETH", 1);
    expect(quote.fromToken).toBe("BTC");
    expect(quote.toToken).toBe("ETH");
    expect(quote.toAmount).toBeGreaterThan(0);
  });

  it("rejects unsupported tokens", () => {
    expect(() => wallet.getSwapQuote("FAKE", "USDT", 100)).toThrow("unsupported token: FAKE");
    expect(() => wallet.getSwapQuote("NST", "FAKE", 100)).toThrow("unsupported token: FAKE");
  });

  it("rejects zero or negative amounts", () => {
    expect(() => wallet.getSwapQuote("NST", "USDT", 0)).toThrow("amount must be positive");
    expect(() => wallet.getSwapQuote("NST", "USDT", -10)).toThrow("amount must be positive");
  });

  it("executes swap and records transaction", () => {
    const quote = wallet.getSwapQuote("NST", "USDT", 50);
    const tx = wallet.executeSwap("alice", quote);
    expect(tx.type).toBe("swap");
    expect(tx.status).toBe("confirmed");
    expect(tx.txHash).toBeTruthy();
    expect(tx.token).toContain("NST→USDT");
  });

  it("rejects expired swap quotes", async () => {
    const quote = wallet.getSwapQuote("NST", "USDT", 50);
    quote.expiresAt = Date.now() - 1000;
    expect(() => wallet.executeSwap("alice", quote)).toThrow("quote expired");
  });

  it("sends NST between addresses", () => {
    const tx = wallet.sendNST("alice", "bob", 100);
    expect(tx.type).toBe("send");
    expect(tx.from).toBe("alice");
    expect(tx.to).toBe("bob");
    expect(tx.status).toBe("confirmed");
    expect(parseFloat(wallet.getNstBalance("alice"))).toBe(900);
    expect(parseFloat(wallet.getNstBalance("bob"))).toBe(100);
  });

  it("rejects send with insufficient balance", () => {
    expect(() => wallet.sendNST("alice", "bob", 100000)).toThrow("insufficient balance");
  });

  it("records transaction history", () => {
    wallet.sendNST("alice", "bob", 100);
    wallet.sendNST("alice", "charlie", 50);
    const history = wallet.getTransactionHistory("alice");
    expect(history.length).toBe(2);
    expect(history[0].timestamp).toBeGreaterThanOrEqual(history[1].timestamp);
  });

  it("gets supported tokens list", () => {
    const tokens = wallet.getSupportedTokens();
    expect(tokens.length).toBeGreaterThan(10);
    expect(tokens.find(t => t.symbol === "NST")).toBeTruthy();
    expect(tokens.find(t => t.symbol === "BTC")).toBeTruthy();
    expect(tokens.find(t => t.symbol === "ETH")).toBeTruthy();
  });

  it("generates new wallet address", () => {
    const addr = NativeWallet.generateAddress();
    expect(addr).toMatch(/^0x[0-9a-f]{40}$/);
  });

  it("includes NST, BTC, ETH, USDT, USDC, BNB, SOL in supported tokens", () => {
    const tokens = wallet.getSupportedTokens();
    const symbols = tokens.map(t => t.symbol);
    ["NST", "BTC", "ETH", "USDT", "USDC", "BNB", "SOL", "XRP", "ADA", "DOGE"].forEach(sym => {
      expect(symbols).toContain(sym);
    });
  });
});
