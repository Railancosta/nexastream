import { createHmac } from "node:crypto";

export interface BinanceConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
  testnet?: boolean;
}

export interface BinancePrice { symbol: string; price: number; }
export interface BinanceBalance { asset: string; free: string; locked: string; }

/**
 * Binance API integration — buy/sell 1000+ cryptocurrencies with real money.
 * Features: spot trading (market+limit), balances, prices, deposits, withdrawals.
 * Security: HMAC-SHA256 signed requests, keys via env (never in code).
 */
export class BinanceService {
  private readonly config: Required<BinanceConfig>;

  constructor(config: BinanceConfig) {
    if (!config.apiKey || !config.apiSecret) throw new Error("Binance API key and secret required");
    this.config = {
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      baseUrl: config.baseUrl || (config.testnet ? "https://testnet.binance.vision" : "https://api.binance.com"),
      testnet: config.testnet ?? false,
    };
  }

  private sign(qs: string): string {
    return createHmac("sha256", this.config.apiSecret).update(qs).digest("hex");
  }

  private async req(method: string, path: string, params: Record<string, string | number> = {}): Promise<any> {
    const qs = new URLSearchParams({ ...params, timestamp: Date.now().toString(), recvWindow: "5000" }).toString();
    const sig = this.sign(qs);
    const url = this.config.baseUrl + path + "?" + qs + "&signature=" + sig;
    const res = await fetch(url, { method, headers: { "X-MBX-APIKEY": this.config.apiKey } });
    if (!res.ok) { const e = await res.json().catch(() => ({ msg: "HTTP " + res.status })); throw new Error("Binance: " + e.code + " - " + e.msg); }
    return res.json();
  }

  async getBalances(): Promise<BinanceBalance[]> {
    const d = await this.req("GET", "/api/v3/account");
    return d.balances.filter((b: BinanceBalance) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
  }

  async getBalance(asset: string): Promise<{ asset: string; free: number; locked: number }> {
    const bs = await this.getBalances();
    const b = bs.find((x) => x.asset === asset);
    return { asset, free: b ? parseFloat(b.free) : 0, locked: b ? parseFloat(b.locked) : 0 };
  }

  async getPrice(symbol: string): Promise<number> {
    const r = await fetch(this.config.baseUrl + "/api/v3/ticker/price?symbol=" + symbol);
    if (!r.ok) throw new Error("Price not found: " + symbol);
    return parseFloat((await r.json()).price);
  }

  async getAllPrices(): Promise<BinancePrice[]> {
    const r = await fetch(this.config.baseUrl + "/api/v3/ticker/price");
    if (!r.ok) throw new Error("Failed to get prices");
    return r.json();
  }

  async getSymbols(): Promise<Array<{ symbol: string; baseAsset: string; quoteAsset: string }>> {
    const r = await fetch(this.config.baseUrl + "/api/v3/exchangeInfo");
    if (!r.ok) throw new Error("Failed to get exchange info");
    const d = await r.json();
    return d.symbols.filter((s: any) => s.status === "TRADING").map((s: any) => ({ symbol: s.symbol, baseAsset: s.baseAsset, quoteAsset: s.quoteAsset }));
  }

  async marketBuy(symbol: string, quantity: number): Promise<any> {
    return this.req("POST", "/api/v3/order", { symbol, side: "BUY", type: "MARKET", quantity: quantity.toString() });
  }

  async marketSell(symbol: string, quantity: number): Promise<any> {
    return this.req("POST", "/api/v3/order", { symbol, side: "SELL", type: "MARKET", quantity: quantity.toString() });
  }

  async limitBuy(symbol: string, quantity: number, price: number): Promise<any> {
    return this.req("POST", "/api/v3/order", { symbol, side: "BUY", type: "LIMIT", timeInForce: "GTC", quantity: quantity.toString(), price: price.toString() });
  }

  async limitSell(symbol: string, quantity: number, price: number): Promise<any> {
    return this.req("POST", "/api/v3/order", { symbol, side: "SELL", type: "LIMIT", timeInForce: "GTC", quantity: quantity.toString(), price: price.toString() });
  }

  async cancelOrder(symbol: string, orderId: number): Promise<any> {
    return this.req("DELETE", "/api/v3/order", { symbol, orderId: orderId.toString() });
  }

  async getOrder(symbol: string, orderId: number): Promise<any> {
    return this.req("GET", "/api/v3/order", { symbol, orderId: orderId.toString() });
  }

  async getOpenOrders(symbol?: string): Promise<any[]> {
    const p: Record<string, string> = {}; if (symbol) p.symbol = symbol;
    return this.req("GET", "/api/v3/openOrders", p);
  }

  async getOrderHistory(symbol: string, limit: number = 50): Promise<any[]> {
    return this.req("GET", "/api/v3/allOrders", { symbol, limit: limit.toString() });
  }

  async get24hrTicker(symbol: string): Promise<any> {
    const r = await fetch(this.config.baseUrl + "/api/v3/ticker/24hr?symbol=" + symbol);
    if (!r.ok) throw new Error("Ticker not found: " + symbol);
    const d = await r.json();
    return { symbol: d.symbol, priceChange: parseFloat(d.priceChange), priceChangePercent: parseFloat(d.priceChangePercent), lastPrice: parseFloat(d.lastPrice), volume: parseFloat(d.volume), highPrice: parseFloat(d.highPrice), lowPrice: parseFloat(d.lowPrice) };
  }

  async getDepositAddress(asset: string): Promise<{ asset: string; address: string; tag?: string }> {
    const d = await this.req("GET", "/sapi/v1/capital/deposit/address", { asset });
    return { asset: d.asset, address: d.address, tag: d.tag || undefined };
  }

  async getDepositHistory(asset?: string): Promise<any[]> {
    const p: Record<string, string> = {}; if (asset) p.asset = asset;
    return this.req("GET", "/sapi/v1/capital/deposit/hisrec", p);
  }

  async getWithdrawalHistory(asset?: string): Promise<any[]> {
    const p: Record<string, string> = {}; if (asset) p.asset = asset;
    return this.req("GET", "/sapi/v1/capital/withdraw/history", p);
  }

  async withdraw(asset: string, address: string, amount: number, network?: string): Promise<any> {
    const p: Record<string, string | number> = { asset, address, amount: amount.toString() };
    if (network) p.network = network;
    return this.req("POST", "/sapi/v1/capital/withdraw/apply", p);
  }
}
