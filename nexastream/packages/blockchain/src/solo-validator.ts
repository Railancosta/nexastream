import { BlockchainNode } from "./node/node.js";
import { StateManager } from "./state/state.js";
import { RpcServer } from "./rpc/rpc-server.js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface SoloValidatorConfig {
  genesisPath: string;
  dataDir: string;
  rpcPort: number;
  blockReward: bigint;
  blockIntervalMs: number;
}

/**
 * Solo Validator — operates the chain with a single validator.
 * Multi-validator ready: architecture unchanged (Módulo 9.1).
 * When more validators join, the protocol works identically.
 */
export class SoloValidator {
  readonly node: BlockchainNode;
  readonly state: StateManager;
  readonly rpc: RpcServer;
  private readonly config: SoloValidatorConfig;
  private blockTimer: NodeJS.Timeout | null = null;
  private statePath: string;

  constructor(config: SoloValidatorConfig) {
    this.config = config;
    this.statePath = resolve(config.dataDir, "state-manager.json");

    this.node = new BlockchainNode({
      genesisPath: config.genesisPath,
      validatorId: "solo-validator-1",
      stake: 10000,
      dataDir: config.dataDir,
      port: config.rpcPort,
      peers: [],
    });

    this.state = this.restoreState();
    this.rpc = new RpcServer(this.node, this.state, config.rpcPort);
  }

  start(): void {
    this.node.start();
    this.rpc.start();

    // Apply existing blocks to state (rebuild state on restart).
    const blocks = this.node.chain.getBlocks();
    for (let i = 1; i < blocks.length; i++) {
      this.state.applyBlock(blocks[i].transactions);
    }

    // Start block production.
    this.blockTimer = setInterval(() => {
      this.produceBlockWithReward();
    }, this.config.blockIntervalMs);

    console.log(`[solo-validator] started | RPC port ${this.config.rpcPort} | reward=${this.config.blockReward} NST`);
  }

  stop(): void {
    if (this.blockTimer) clearInterval(this.blockTimer);
    this.saveState();
    this.node.stop();
    this.rpc.stop();
    console.log("[solo-validator] stopped");
  }

  /** Produce a block with a block reward mint transaction. */
  produceBlockWithReward(): void {
    if (!this.node.running) return;

    // Create block reward transaction (mint to validator).
    const rewardTx = this.node.validator.signTransaction(
      "0x0",
      "solo-validator-1",
      Number(this.config.blockReward),
    );
    this.node.chain.addTransaction(rewardTx);

    // Also process any pending transactions from mempool.
    const block = this.node.produceBlock();
    if (block) {
      // Apply block to state.
      this.state.applyBlock(block.transactions);
      this.saveState();
      console.log(`[solo-validator] block #${block.index} | hash=${block.hash.slice(0, 16)}... | txs=${block.transactions.length} | supply=${this.state.getTotalSupply().toString().slice(0, 10)}...`);
    }
  }

  /** Submit a transfer transaction. */
  transfer(from: string, to: string, amount: number): void {
    const nonce = this.state.getNonce(from);
    const tx = this.node.validator.signTransaction(from, to, amount);
    // Override nonce.
    (tx as any).nonce = nonce;
    this.node.chain.addTransaction(tx);
  }

  /** Save state to disk. */
  saveState(): void {
    const dir = dirname(this.statePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(this.statePath, this.state.serialize());
  }

  /** Restore state from disk. */
  private restoreState(): StateManager {
    if (!existsSync(this.statePath)) return new StateManager();
    try {
      const data = readFileSync(this.statePath, "utf8");
      return StateManager.deserialize(data);
    } catch {
      return new StateManager();
    }
  }
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const getArg = (name: string): string => {
    const idx = args.indexOf(`--${name}`);
    return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : "";
  };

  const genesisPath = getArg("genesis") || resolve(__dirname, "../../../blockchain/testnet/genesis.json");
  const dataDir = getArg("data-dir") || resolve(__dirname, "../../../.data/solo-validator");
  const rpcPort = parseInt(getArg("port") || "9001", 10);
  const blockInterval = parseInt(getArg("interval") || "10000", 10);

  const solo = new SoloValidator({
    genesisPath,
    dataDir,
    rpcPort,
    blockReward: 50n * 10n ** 18n, // 50 NST per block
    blockIntervalMs: blockInterval,
  });

  solo.start();

  process.on("SIGINT", () => { solo.stop(); process.exit(0); });
  process.on("SIGTERM", () => { solo.stop(); process.exit(0); });
}
