import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { GenesisConfig } from "../genesis.js";
import { Blockchain } from "../chain.js";
import { Validator } from "../validator.js";
import type { Block } from "../block.js";
import type { Transaction } from "../block.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface NodeConfig {
  readonly genesisPath: string;
  readonly validatorId: string;
  readonly stake: number;
  readonly dataDir: string;
  readonly port: number;
  readonly peers: string[];
}

export interface NodeStats {
  validatorId: string;
  height: number;
  genesisHash: string;
  blockCount: number;
  mempoolSize: number;
  uptime: number;
  isSynced: boolean;
}

/**
 * Blockchain node — loads genesis, maintains chain state, produces blocks.
 *
 * Rule 54: tests node startup, genesis loading, block production, validation,
 * transaction propagation, state synchronization, restart recovery.
 * Rule 107: each validator has its own identity and key.
 */
export class BlockchainNode {
  readonly config: NodeConfig;
  readonly chain: Blockchain;
  readonly validator: Validator;
  private readonly startTime: number;
  private statePath: string;
  private isRunning = false;

  constructor(config: NodeConfig) {
    this.config = config;
    this.startTime = Date.now();
    this.statePath = resolve(config.dataDir, `state-${config.validatorId}.json`);

    // Load genesis config.
    const genesisRaw = readFileSync(config.genesisPath, "utf8");
    const genesisConfig = JSON.parse(genesisRaw) as GenesisConfig;

    // Initialize chain with genesis.
    this.chain = new Blockchain(genesisConfig);

    // Create validator with its own independent key pair.
    this.validator = new Validator(config.validatorId, config.stake);

    // Try to restore state.
    this.restoreState();
  }

  /** Start the node — begins block production. */
  start(): void {
    this.isRunning = true;
    console.log(`[node:${this.config.validatorId}] started | genesis=${this.chain.genesisHash.slice(0, 16)}... | height=${this.chain.height}`);
  }

  stop(): void {
    this.isRunning = false;
    this.saveState();
    console.log(`[node:${this.config.validatorId}] stopped | height=${this.chain.height}`);
  }

  /** Produce a block from pending transactions (if any). */
  produceBlock(): Block | null {
    if (!this.isRunning) return null;
    return this.chain.minePending(this.validator);
  }

  /** Submit a transaction to the mempool. */
  submitTransaction(from: string, to: string, amount: number): Transaction {
    const tx = this.validator.signTransaction(from, to, amount);
    this.chain.addTransaction(tx);
    return tx;
  }

  /** Receive a block from a peer and validate it. */
  receiveBlock(block: Block): boolean {
    try {
      this.chain.appendBlock(block);
      return true;
    } catch {
      return false;
    }
  }

  /** Get node statistics. */
  getStats(): NodeStats {
    return {
      validatorId: this.config.validatorId,
      height: this.chain.height,
      genesisHash: this.chain.genesisHash,
      blockCount: this.chain.height - 1,
      mempoolSize: this.chain.getMempoolSize(),
      uptime: Date.now() - this.startTime,
      isSynced: this.chain.validateChain(),
    };
  }

  /** Save chain state to disk (for restart recovery — rule 54). */
  saveState(): void {
    const blocks = this.chain.getBlocks();
    const state = {
      validatorId: this.config.validatorId,
      genesisHash: this.chain.genesisHash,
      height: this.chain.height,
      blocks: blocks.map((b) => ({
        ...b,
        transactions: b.transactions.map((t) => ({ ...t })),
      })),
    };
    const dir = dirname(this.statePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.statePath, JSON.stringify(state, null, 2));
  }

  /** Restore chain state from disk (restart recovery — rule 54). */
  private restoreState(): void {
    if (!existsSync(this.statePath)) return;
    try {
      const raw = readFileSync(this.statePath, "utf8");
      const state = JSON.parse(raw);
      // Verify genesis hash matches.
      if (state.genesisHash !== this.chain.genesisHash) {
        console.warn(`[node:${this.config.validatorId}] state genesis mismatch, ignoring saved state`);
        return;
      }
      // Replay blocks (genesis already loaded, skip index 0).
      const blocks = state.blocks as Block[];
      for (let i = 1; i < blocks.length; i++) {
        try {
          this.chain.appendBlock(blocks[i]);
        } catch {
          console.warn(`[node:${this.config.validatorId}] failed to replay block ${i}`);
          break;
        }
      }
      console.log(`[node:${this.config.validatorId}] restored ${this.chain.height - 1} blocks from disk`);
    } catch {
      // Ignore corrupt state.
    }
  }

  get running(): boolean {
    return this.isRunning;
  }
}

// CLI entrypoint: node dist/node/node.js --genesis <path> --validator <id> --port <n>
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const getArg = (name: string): string => {
    const idx = args.indexOf(`--${name}`);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : "";
  };

  const genesisPath = getArg("genesis") || resolve(__dirname, "../../../blockchain/testnet/genesis.json");
  const validatorId = getArg("validator") || "validator-1";
  const port = parseInt(getArg("port") || "0", 10);
  const dataDir = getArg("data-dir") || resolve(__dirname, "../../../.data/blockchain");

  const node = new BlockchainNode({
    genesisPath,
    validatorId,
    stake: 10000,
    dataDir,
    port,
    peers: [],
  });

  node.start();

  // Simulate block production.
  setInterval(() => {
    if (node.running) {
      // Submit a random transaction and produce a block.
      node.submitTransaction(`addr-${validatorId}`, `addr-other`, 1);
      const block = node.produceBlock();
      if (block) {
        console.log(`[node:${validatorId}] block #${block.index} mined | hash=${block.hash.slice(0, 16)}... | txs=${block.transactions.length}`);
      }
    }
  }, 5000);

  // Save state periodically.
  setInterval(() => {
    if (node.running) node.saveState();
  }, 30000);

  process.on("SIGINT", () => {
    node.stop();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    node.stop();
    process.exit(0);
  });
}
