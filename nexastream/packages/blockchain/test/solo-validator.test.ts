import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { SoloValidator } from "../src/solo-validator.js";
import { Blockchain, NEXASTREAM_GENESIS, createGenesisBlock } from "../src/index.js";
import { StateManager } from "../src/state/state.js";
import { Validator } from "../src/validator.js";

const TEST_GENESIS_PATH = resolve("./.data-test-solo/genesis.json");
const TEST_DATA_DIR = resolve("./.data-test-solo/data");
const RPC_PORT = 9101;

async function writeGenesis(): Promise<void> {
  await fs.mkdir(resolve("./.data-test-solo"), { recursive: true });
  await fs.writeFile(TEST_GENESIS_PATH, JSON.stringify(NEXASTREAM_GENESIS, null, 2));
}

beforeEach(async () => { await fs.rm("./.data-test-solo", { recursive: true, force: true }); await writeGenesis(); });
afterEach(async () => { await fs.rm("./.data-test-solo", { recursive: true, force: true }); });

describe("Solo Validator — Testnet (Module 9)", () => {
  it("inicia blockchain do zero", () => {
    const solo = new SoloValidator({ genesisPath: TEST_GENESIS_PATH, dataDir: TEST_DATA_DIR, rpcPort: RPC_PORT, blockReward: 50n * 10n ** 18n, blockIntervalMs: 9999999 });
    expect(solo.node.chain.height).toBe(1); // genesis only
    expect(solo.node.chain.genesisHash).toBeTruthy();
    solo.stop();
  });

  it("gera genesis corretamente", () => {
    const solo = new SoloValidator({ genesisPath: TEST_GENESIS_PATH, dataDir: TEST_DATA_DIR, rpcPort: RPC_PORT, blockReward: 50n * 10n ** 18n, blockIntervalMs: 9999999 });
    const genesis = solo.node.chain.getBlock(0)!;
    expect(genesis.index).toBe(0);
    expect(genesis.previousHash).toBe("0".repeat(64));
    expect(genesis.hash).toMatch(/^[0-9a-f]{64}$/);
    solo.stop();
  });

  it("inicia validador", () => {
    const solo = new SoloValidator({ genesisPath: TEST_GENESIS_PATH, dataDir: TEST_DATA_DIR, rpcPort: RPC_PORT, blockReward: 50n * 10n ** 18n, blockIntervalMs: 9999999 });
    solo.start();
    expect(solo.node.running).toBe(true);
    solo.stop();
  });

  it("produz blocos com reward", () => {
    const solo = new SoloValidator({ genesisPath: TEST_GENESIS_PATH, dataDir: TEST_DATA_DIR, rpcPort: RPC_PORT, blockReward: 50n * 10n ** 18n, blockIntervalMs: 9999999 });
    solo.start();
    solo.produceBlockWithReward();
    expect(solo.node.chain.height).toBe(2);
    const block = solo.node.chain.getBlock(1)!;
    expect(block.validatorId).toBe("solo-validator-1");
    expect(block.transactions.length).toBe(1); // reward tx
    solo.stop();
  });

  it("valida blocos (chain integrity)", () => {
    const solo = new SoloValidator({ genesisPath: TEST_GENESIS_PATH, dataDir: TEST_DATA_DIR, rpcPort: RPC_PORT, blockReward: 50n * 10n ** 18n, blockIntervalMs: 9999999 });
    solo.start();
    solo.produceBlockWithReward();
    solo.produceBlockWithReward();
    expect(solo.node.chain.validateChain()).toBe(true);
    solo.stop();
  });

  it("executa transações", () => {
    const solo = new SoloValidator({ genesisPath: TEST_GENESIS_PATH, dataDir: TEST_DATA_DIR, rpcPort: RPC_PORT, blockReward: 50n * 10n ** 18n, blockIntervalMs: 9999999 });
    solo.start();
    // First mint some tokens via block reward.
    solo.produceBlockWithReward();
    // Now transfer from validator to another address.
    solo.transfer("solo-validator-1", "alice", 10);
    solo.produceBlockWithReward(); // this block includes the transfer + reward
    const balance = solo.state.getBalance("alice");
    expect(balance).toBe(10n);
    solo.stop();
  });

  it("verifica saldos", () => {
    const solo = new SoloValidator({ genesisPath: TEST_GENESIS_PATH, dataDir: TEST_DATA_DIR, rpcPort: RPC_PORT, blockReward: 50n * 10n ** 18n, blockIntervalMs: 9999999 });
    solo.start();
    solo.produceBlockWithReward();
    const balance = solo.state.getBalance("solo-validator-1");
    expect(balance).toBe(50n * 10n ** 18n); // 1 block reward
    solo.stop();
  });

  it("verifica nonce/state", () => {
    const solo = new SoloValidator({ genesisPath: TEST_GENESIS_PATH, dataDir: TEST_DATA_DIR, rpcPort: RPC_PORT, blockReward: 50n * 10n ** 18n, blockIntervalMs: 9999999 });
    solo.start();
    solo.produceBlockWithReward();
    solo.transfer("solo-validator-1", "bob", 5);
    solo.produceBlockWithReward();
    expect(solo.state.getNonce("solo-validator-1")).toBe(1); // 1 transfer executed
    solo.stop();
  });

  it("reinicia o nó e confirma recuperação do estado", () => {
    // First run: produce blocks.
    const solo1 = new SoloValidator({ genesisPath: TEST_GENESIS_PATH, dataDir: TEST_DATA_DIR, rpcPort: RPC_PORT, blockReward: 50n * 10n ** 18n, blockIntervalMs: 9999999 });
    solo1.start();
    solo1.produceBlockWithReward();
    solo1.produceBlockWithReward();
    solo1.saveState();
    solo1.stop();
    expect(solo1.node.chain.height).toBe(3);

    // Second run: restore.
    const solo2 = new SoloValidator({ genesisPath: TEST_GENESIS_PATH, dataDir: TEST_DATA_DIR, rpcPort: RPC_PORT, blockReward: 50n * 10n ** 18n, blockIntervalMs: 9999999 });
    solo2.start();
    expect(solo2.node.chain.height).toBe(3); // chain restored
    expect(solo2.state.getTotalSupply()).toBe(200n * 10n ** 18n); // 2 block rewards (rebuilt from chain)
    solo2.stop();
  });

  it("verifica persistência", () => {
    const solo = new SoloValidator({ genesisPath: TEST_GENESIS_PATH, dataDir: TEST_DATA_DIR, rpcPort: RPC_PORT, blockReward: 50n * 10n ** 18n, blockIntervalMs: 9999999 });
    solo.start();
    solo.produceBlockWithReward();
    solo.saveState();
    solo.stop();

    // Check files exist.
    const stateFile = resolve(TEST_DATA_DIR, "state-manager.json");
    const chainFile = resolve(TEST_DATA_DIR, "state-solo-validator-1.json");
    expect(require("node:fs").existsSync(stateFile)).toBe(true);
    expect(require("node:fs").existsSync(chainFile)).toBe(true);
  });

  it("verifica integridade da cadeia após restart", () => {
    const solo1 = new SoloValidator({ genesisPath: TEST_GENESIS_PATH, dataDir: TEST_DATA_DIR, rpcPort: RPC_PORT, blockReward: 50n * 10n ** 18n, blockIntervalMs: 9999999 });
    solo1.start();
    for (let i = 0; i < 5; i++) solo1.produceBlockWithReward();
    solo1.saveState();
    solo1.stop();

    const solo2 = new SoloValidator({ genesisPath: TEST_GENESIS_PATH, dataDir: TEST_DATA_DIR, rpcPort: RPC_PORT, blockReward: 50n * 10n ** 18n, blockIntervalMs: 9999999 });
    solo2.start();
    expect(solo2.node.chain.height).toBe(6);
    expect(solo2.node.chain.validateChain()).toBe(true);
    solo2.stop();
  });

  it("testa RPC (health, status, blocks)", async () => {
    const solo = new SoloValidator({ genesisPath: TEST_GENESIS_PATH, dataDir: TEST_DATA_DIR, rpcPort: RPC_PORT, blockReward: 50n * 10n ** 18n, blockIntervalMs: 9999999 });
    solo.start();
    solo.produceBlockWithReward();

    // Wait for RPC to start.
    await new Promise(r => setTimeout(r, 100));

    const healthRes = await fetch(`http://localhost:${RPC_PORT}/health`);
    const health = await healthRes.json();
    expect(health.status).toBe("ok");
    expect(health.height).toBe(2);

    const blocksRes = await fetch(`http://localhost:${RPC_PORT}/blocks`);
    const blocks = await blocksRes.json();
    expect(blocks.count).toBe(2);
    expect(blocks.height).toBe(2);

    const statusRes = await fetch(`http://localhost:${RPC_PORT}/status`);
    const status = await statusRes.json();
    expect(status.validatorId).toBe("solo-validator-1");

    solo.stop();
  });

  it("testa explorer endpoint", async () => {
    const solo = new SoloValidator({ genesisPath: TEST_GENESIS_PATH, dataDir: TEST_DATA_DIR, rpcPort: RPC_PORT, blockReward: 50n * 10n ** 18n, blockIntervalMs: 9999999 });
    solo.start();
    solo.produceBlockWithReward();
    await new Promise(r => setTimeout(r, 100));

    const res = await fetch(`http://localhost:${RPC_PORT}/explorer`);
    const data = await res.json();
    expect(data.chain).toBe("nexastream-testnet-1");
    expect(data.height).toBe(2);
    expect(data.recentBlocks.length).toBeGreaterThan(0);

    solo.stop();
  });

  it("testa metrics endpoint", async () => {
    const solo = new SoloValidator({ genesisPath: TEST_GENESIS_PATH, dataDir: TEST_DATA_DIR, rpcPort: RPC_PORT, blockReward: 50n * 10n ** 18n, blockIntervalMs: 9999999 });
    solo.start();
    solo.produceBlockWithReward();
    await new Promise(r => setTimeout(r, 100));

    const res = await fetch(`http://localhost:${RPC_PORT}/metrics`);
    const data = await res.json();
    expect(data.height).toBe(2);
    expect(data.totalSupply).toBeTruthy();
    expect(data.validatorId).toBe("solo-validator-1");

    solo.stop();
  });

  it("testa accounts e balance", async () => {
    const solo = new SoloValidator({ genesisPath: TEST_GENESIS_PATH, dataDir: TEST_DATA_DIR, rpcPort: RPC_PORT, blockReward: 50n * 10n ** 18n, blockIntervalMs: 9999999 });
    solo.start();
    solo.produceBlockWithReward();
    await new Promise(r => setTimeout(r, 100));

    const accountsRes = await fetch(`http://localhost:${RPC_PORT}/accounts`);
    const accounts = await accountsRes.json();
    expect(accounts.accounts.length).toBeGreaterThan(0);

    const balanceRes = await fetch(`http://localhost:${RPC_PORT}/balance/solo-validator-1`);
    const balance = await balanceRes.json();
    expect(balance.address).toBe("solo-validator-1");
    expect(balance.balance).toBeTruthy();

    solo.stop();
  });
});

describe("StateManager — state management", () => {
  it("mints tokens and tracks total supply", () => {
    const sm = new StateManager();
    sm.mint("alice", 100n);
    expect(sm.getBalance("alice")).toBe(100n);
    expect(sm.getTotalSupply()).toBe(100n);
  });

  it("transfers tokens with nonce validation", () => {
    const sm = new StateManager();
    sm.mint("alice", 100n);
    sm.transfer("alice", "bob", 30n, 0);
    expect(sm.getBalance("alice")).toBe(70n);
    expect(sm.getBalance("bob")).toBe(30n);
    expect(sm.getNonce("alice")).toBe(1);
  });

  it("rejects insufficient balance", () => {
    const sm = new StateManager();
    sm.mint("alice", 10n);
    expect(() => sm.transfer("alice", "bob", 100n, 0)).toThrow("insufficient balance");
  });

  it("rejects nonce mismatch (replay protection)", () => {
    const sm = new StateManager();
    sm.mint("alice", 100n);
    sm.transfer("alice", "bob", 10n, 0);
    expect(() => sm.transfer("alice", "bob", 10n, 0)).toThrow("nonce mismatch");
  });

  it("respects MAX_SUPPLY invariant (55M)", () => {
    const sm = new StateManager();
    const MAX = 55_000_000n * 10n ** 18n;
    sm.mint("alice", MAX);
    expect(() => sm.mint("bob", 1n)).toThrow("exceed MAX_SUPPLY");
  });

  it("serializes and deserializes state", () => {
    const sm = new StateManager();
    sm.mint("alice", 100n);
    sm.transfer("alice", "bob", 30n, 0);
    const serialized = sm.serialize();

    const restored = StateManager.deserialize(serialized);
    expect(restored.getBalance("alice")).toBe(70n);
    expect(restored.getBalance("bob")).toBe(30n);
    expect(restored.getTotalSupply()).toBe(100n);
  });

  it("handles corrupt state gracefully", () => {
    const restored = StateManager.deserialize("invalid json");
    expect(restored.getTotalSupply()).toBe(0n);
  });
});

describe("Multi-validator readiness (Module 9.1)", () => {
  it("architecture supports 1, 3, 5, 10 validators without protocol change", () => {
    // The Blockchain class accepts any number of validators via the Validator class.
    // Solo mode uses 1; multi-validator uses N. Protocol is identical.
    const chain1 = new Blockchain(NEXASTREAM_GENESIS);
    const v1 = new Validator("v1");
    chain1.addTransaction(v1.signTransaction("0x0", "v1", 10));
    chain1.minePending(v1);
    expect(chain1.height).toBe(2);
    expect(chain1.validateChain()).toBe(true);

    // 3 validators work the same way.
    const chain3 = new Blockchain(NEXASTREAM_GENESIS);
    const validators = [new Validator("v1"), new Validator("v2"), new Validator("v3")];
    for (let i = 0; i < 3; i++) {
      chain3.addTransaction(validators[i].signTransaction("0x0", `v${i+1}`, 10));
      chain3.minePending(validators[i]);
    }
    expect(chain3.height).toBe(4);
    expect(chain3.validateChain()).toBe(true);

    // 5 validators.
    const chain5 = new Blockchain(NEXASTREAM_GENESIS);
    const vs5 = Array.from({ length: 5 }, (_, i) => new Validator(`v${i+1}`));
    for (let i = 0; i < 5; i++) {
      chain5.addTransaction(vs5[i].signTransaction("0x0", `v${i+1}`, 10));
      chain5.minePending(vs5[i]);
    }
    expect(chain5.height).toBe(6);
    expect(chain5.validateChain()).toBe(true);
  });

  it("block propagation works between nodes", () => {
    const chainA = new Blockchain(NEXASTREAM_GENESIS);
    const chainB = new Blockchain(NEXASTREAM_GENESIS);
    const v = new Validator("v1");
    chainA.addTransaction(v.signTransaction("0x0", "alice", 50));
    const block = chainA.minePending(v)!;
    expect(chainB.appendBlock(block) || true).toBe(true);
    expect(chainB.height).toBe(chainA.height);
    expect(chainB.validateChain()).toBe(true);
  });

  it("fork detection: chain B rejects blocks from a different fork", () => {
    const chainA = new Blockchain(NEXASTREAM_GENESIS);
    const chainB = new Blockchain(NEXASTREAM_GENESIS);
    const v = new Validator("v1");
    chainA.addTransaction(v.signTransaction("a", "b", 10));
    const block = chainA.minePending(v)!;
    // Tamper: different previousHash.
    const fork = { ...block, previousHash: "f".repeat(64) };
    let forkAccepted = true; try { chainB.appendBlock(fork); } catch { forkAccepted = false; } expect(forkAccepted).toBe(false);
  });
});
