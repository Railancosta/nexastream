import { describe, it, expect, vi, beforeEach } from "vitest";
import { BinanceService } from "../src/services/exchange/binance-service.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockResponse(ok: boolean, status: number, body?: unknown) {
  return {
    ok, status,
    json: async () => body || {},
    statusText: ok ? "OK" : "Error",
  } as any;
}

beforeEach(() => { mockFetch.mockReset(); });

const config = { apiKey: "test-key", apiSecret: "test-secret", testnet: true };

describe("BinanceService — initialization", () => {
  it("requires API key and secret", () => {
    expect(() => new BinanceService({ apiKey: "", apiSecret: "" })).toThrow("required");
  });

  it("uses testnet URL when testnet=true", () => {
    const b = new BinanceService(config);
    expect((b as any).config.baseUrl).toBe("https://testnet.binance.vision");
  });

  it("uses production URL when testnet=false", () => {
    const b = new BinanceService({ apiKey: "k", apiSecret: "s", testnet: false });
    expect((b as any).config.baseUrl).toBe("https://api.binance.com");
  });
});

describe("BinanceService — prices", () => {
  it("gets price for a symbol", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, { symbol: "BTCUSDT", price: "65000.00" }));
    const b = new BinanceService(config);
    const price = await b.getPrice("BTCUSDT");
    expect(price).toBe(65000);
  });

  it("gets all prices (1000+ pairs)", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, [
      { symbol: "BTCUSDT", price: "65000" },
      { symbol: "ETHUSDT", price: "3500" },
    ]));
    const b = new BinanceService(config);
    const prices = await b.getAllPrices();
    expect(prices.length).toBe(2);
    expect(prices[0].symbol).toBe("BTCUSDT");
  });

  it("throws on invalid symbol", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(false, 400, { code: -1121, msg: "Invalid symbol" }));
    const b = new BinanceService(config);
    await expect(b.getPrice("FAKEUSDT")).rejects.toThrow("Price not found");
  });
});

describe("BinanceService — trading", () => {
  it("places market buy order", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, { orderId: 123456, status: "FILLED", executedQty: "0.001" }));
    const b = new BinanceService(config);
    const order = await b.marketBuy("BTCUSDT", 0.001);
    expect(order.orderId).toBe(123456);
    expect(order.status).toBe("FILLED");
    // Verify the request was signed
    const callUrl = mockFetch.mock.calls[0][0];
    expect(callUrl).toContain("signature=");
    expect(callUrl).toContain("side=BUY");
    expect(callUrl).toContain("type=MARKET");
  });

  it("places market sell order", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, { orderId: 789, status: "FILLED" }));
    const b = new BinanceService(config);
    const order = await b.marketSell("ETHUSDT", 0.5);
    expect(order.orderId).toBe(789);
    const callUrl = mockFetch.mock.calls[0][0];
    expect(callUrl).toContain("side=SELL");
  });

  it("places limit buy order", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, { orderId: 111, status: "NEW" }));
    const b = new BinanceService(config);
    const order = await b.limitBuy("BTCUSDT", 0.001, 60000);
    expect(order.orderId).toBe(111);
    const callUrl = mockFetch.mock.calls[0][0];
    expect(callUrl).toContain("type=LIMIT");
    expect(callUrl).toContain("price=60000");
  });

  it("places limit sell order", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, { orderId: 222, status: "NEW" }));
    const b = new BinanceService(config);
    const order = await b.limitSell("ETHUSDT", 1, 4000);
    expect(order.orderId).toBe(222);
  });

  it("cancels an order", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, { orderId: 333, status: "CANCELED" }));
    const b = new BinanceService(config);
    const result = await b.cancelOrder("BTCUSDT", 333);
    expect(result.status).toBe("CANCELED");
  });
});

describe("BinanceService — account", () => {
  it("gets balances", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, {
      balances: [
        { asset: "BTC", free: "0.5", locked: "0.1" },
        { asset: "USDT", free: "10000", locked: "0" },
        { asset: "ETH", free: "0", locked: "0" }, // should be filtered
      ],
    }));
    const b = new BinanceService(config);
    const balances = await b.getBalances();
    expect(balances.length).toBe(2); // ETH filtered (0 balance)
    expect(balances[0].asset).toBe("BTC");
  });

  it("gets balance for specific asset", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, {
      balances: [{ asset: "BTC", free: "0.5", locked: "0.1" }],
    }));
    const b = new BinanceService(config);
    const bal = await b.getBalance("BTC");
    expect(bal.free).toBe(0.5);
    expect(bal.locked).toBe(0.1);
  });

  it("returns 0 for missing asset", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, { balances: [] }));
    const b = new BinanceService(config);
    const bal = await b.getBalance("DOGE");
    expect(bal.free).toBe(0);
  });
});

describe("BinanceService — deposits/withdrawals", () => {
  it("gets deposit address", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, { asset: "BTC", address: "bc1q...", tag: "" }));
    const b = new BinanceService(config);
    const addr = await b.getDepositAddress("BTC");
    expect(addr.asset).toBe("BTC");
    expect(addr.address).toContain("bc1q");
  });

  it("gets deposit history", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, [{ txId: "123", asset: "USDT", amount: "100" }]));
    const b = new BinanceService(config);
    const history = await b.getDepositHistory("USDT");
    expect(history.length).toBe(1);
  });

  it("gets withdrawal history", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, [{ id: "456", asset: "BTC", amount: "0.1" }]));
    const b = new BinanceService(config);
    const history = await b.getWithdrawalHistory("BTC");
    expect(history.length).toBe(1);
  });

  it("submits withdrawal", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, { id: "789", status: "Processing" }));
    const b = new BinanceService(config);
    const result = await b.withdraw("USDT", "0x123...", 100, "ERC20");
    expect(result.id).toBe("789");
    const callUrl = mockFetch.mock.calls[0][0];
    expect(callUrl).toContain("withdraw");
    expect(callUrl).toContain("address=0x123");
    expect(callUrl).toContain("amount=100");
  });
});

describe("BinanceService — 24hr ticker", () => {
  it("gets 24hr stats", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, {
      symbol: "BTCUSDT", priceChange: "1000", priceChangePercent: "1.5",
      lastPrice: "65000", volume: "1000", highPrice: "66000", lowPrice: "64000",
    }));
    const b = new BinanceService(config);
    const ticker = await b.get24hrTicker("BTCUSDT");
    expect(ticker.priceChangePercent).toBe(1.5);
    expect(ticker.lastPrice).toBe(65000);
  });
});

describe("BinanceService — security", () => {
  it("signs all requests with HMAC-SHA256", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, { orderId: 1 }));
    const b = new BinanceService(config);
    await b.marketBuy("BTCUSDT", 0.001);
    const callUrl = mockFetch.mock.calls[0][0] as string;
    // Signature must be present
    expect(callUrl).toContain("signature=");
    // API key must be in headers
    const callOpts = mockFetch.mock.calls[0][1];
    expect(callOpts.headers["X-MBX-APIKEY"]).toBe("test-key");
  });

  it("includes timestamp in all signed requests", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(true, 200, { orderId: 1 }));
    const b = new BinanceService(config);
    await b.marketBuy("BTCUSDT", 0.001);
    const callUrl = mockFetch.mock.calls[0][0] as string;
    expect(callUrl).toContain("timestamp=");
    expect(callUrl).toContain("recvWindow=5000");
  });
});
