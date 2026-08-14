import http from "node:http";
import type { BlockchainNode } from "../node/node.js";
import type { StateManager } from "../state/state.js";

/**
 * RPC API server for the blockchain node.
 * Provides: status, blocks, transactions, balances, explorer, health, metrics.
 *
 * Solo Validator Mode: works with 1 validator.
 * Multi-validator ready: architecture unchanged (rule 9.1).
 */
export class RpcServer {
  private server: http.Server | null = null;

  constructor(
    private readonly node: BlockchainNode,
    private readonly state: StateManager,
    private readonly port: number,
  ) {}

  start(): void {
    this.server = http.createServer((req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");

      const url = new URL(req.url || "/", `http://localhost:${this.port}`);
      const path = url.pathname;

      try {
        if (path === "/health" || path === "/") {
          this.json(res, 200, this.health());
        } else if (path === "/status") {
          this.json(res, 200, this.node.getStats());
        } else if (path === "/blocks") {
          const limit = parseInt(url.searchParams.get("limit") || "50");
          const blocks = this.node.chain.getBlocks().slice(-limit).map((b) => ({
            index: b.index,
            hash: b.hash,
            previousHash: b.previousHash,
            validatorId: b.validatorId,
            timestamp: b.timestamp,
            txCount: b.transactions.length,
            nonce: b.nonce,
            difficulty: b.difficulty,
          }));
          this.json(res, 200, { blocks, count: blocks.length, height: this.node.chain.height });
        } else if (path.startsWith("/blocks/")) {
          const idx = parseInt(path.split("/")[2]);
          const block = this.node.chain.getBlock(idx);
          if (!block) { this.json(res, 404, { error: "block not found" }); return; }
          this.json(res, 200, block);
        } else if (path === "/transactions") {
          const txs = this.node.chain.getBlocks().flatMap((b) => b.transactions);
          this.json(res, 200, { transactions: txs.slice(-50), count: txs.length });
        } else if (path === "/accounts") {
          this.json(res, 200, { accounts: this.state.getAccounts(), totalSupply: this.state.getTotalSupply().toString() });
        } else if (path.startsWith("/balance/")) {
          const addr = path.split("/")[2];
          this.json(res, 200, { address: addr, balance: this.state.getBalance(addr).toString(), nonce: this.state.getNonce(addr) });
        } else if (path === "/metrics") {
          const stats = this.node.getStats();
          this.json(res, 200, {
            height: stats.height,
            blockCount: stats.blockCount,
            mempoolSize: stats.mempoolSize,
            uptime: stats.uptime,
            isSynced: stats.isSynced,
            totalSupply: this.state.getTotalSupply().toString(),
            maxSupply: "55000000000000000000000000",
            validatorId: stats.validatorId,
            genesisHash: stats.genesisHash,
          });
        } else if (path === "/explorer") {
          const blocks = this.node.chain.getBlocks().slice(-20).map((b) => ({
            index: b.index,
            hash: b.hash.slice(0, 16) + "...",
            validator: b.validatorId,
            txs: b.transactions.length,
            time: new Date(b.timestamp).toISOString(),
          }));
          this.json(res, 200, {
            chain: "nexastream-testnet-1",
            height: this.node.chain.height,
            totalSupply: this.state.getTotalSupply().toString(),
            accounts: this.state.getAccounts().length,
            recentBlocks: blocks,
          });
        } else {
          this.json(res, 404, { error: "not found", endpoints: ["/health", "/status", "/blocks", "/blocks/:index", "/transactions", "/accounts", "/balance/:address", "/metrics", "/explorer"] });
        }
      } catch (err) {
        this.json(res, 500, { error: "internal error" });
      }
    });
    this.server.listen(this.port, () => {
      console.log(`[rpc] listening on port ${this.port}`);
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log("[rpc] stopped");
    }
  }

  private health(): { status: string; height: number; synced: boolean } {
    const stats = this.node.getStats();
    return { status: "ok", height: stats.height, synced: stats.isSynced };
  }

  private json(res: http.ServerResponse, code: number, data: any): void {
    res.statusCode = code;
    res.end(JSON.stringify(data, null, 2));
  }
}
