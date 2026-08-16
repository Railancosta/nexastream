import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import { BlockchainNode } from "../src/node/node.js";
import { NEXASTREAM_GENESIS, genesisHash } from "../src/genesis.js";

const TEST_GENESIS_PATH = resolve("./.data-test-node/genesis.json");
const TEST_DATA_DIR = resolve("./.data-test-node/data");

async function writeTestGenesis(): Promise<void> {
  await fs.mkdir(resolve("./.data-test-node"), { recursive: true });
  await fs.writeFile(TEST_GENESIS_PATH, JSON.stringify(NEXASTREAM_GENESIS, null, 2));
}

beforeEach(async () => {
  await fs.rm("./.data-test-node", { recursive: true, force: true });
  await writeTestGenesis();
});

afterEach(async () => {
  await fs.rm("./.data-test-node", { recursive: true, force: true });
});

describe("BlockchainNode — startup and genesis loading (rule 54)", () => {
  it("loads genesis and starts", () => {
    const node = new BlockchainNode({
      genesisPath: TEST_GENESIS_PATH,
      validatorId: "validator-1",
      stake: 10000,
      dataDir: TEST_DATA_DIR,
      port: 0,
      peers: [],
    });
    node.start();
    expect(node.running).toBe(true);
    expect(node.chain.height).toBe(1); // genesis block
    expect(node.chain.genesisHash).toBe(genesisHash(NEXASTREAM_GENESIS));
    node.stop();
  });

  it("produces blocks with its validator identity", () => {
    const node = new BlockchainNode({
      genesisPath: TEST_GENESIS_PATH,
      validatorId: "validator-1",
      stake: 10000,
      dataDir: TEST_DATA_DIR,
      port: 0,
      peers: [],
    });
    node.start();
    node.submitTransaction("addr-a", "addr-b", 100);
    const block = node.produceBlock();
    expect(block).not.toBeNull();
    expect(block!.validatorId).toBe("validator-1");
    expect(block!.index).toBe(1);
    expect(node.chain.height).toBe(2);
    node.stop();
  });

  it("validates chain is synced", () => {
    const node = new BlockchainNode({
      genesisPath: TEST_GENESIS_PATH,
      validatorId: "validator-1",
      stake: 10000,
      dataDir: TEST_DATA_DIR,
      port: 0,
      peers: [],
    });
    node.start();
    node.submitTransaction("a", "b", 10);
    node.produceBlock();
    node.submitTransaction("b", "c", 20);
    node.produceBlock();
    const stats = node.getStats();
    expect(stats.isSynced).toBe(true);
    expect(stats.height).toBe(3);
    expect(stats.blockCount).toBe(2);
    node.stop();
  });
});

describe("BlockchainNode — restart recovery (rule 54)", () => {
  it("saves and restores state across restart", async () => {
    // First run: produce blocks and save state.
    const node1 = new BlockchainNode({
      genesisPath: TEST_GENESIS_PATH,
      validatorId: "validator-1",
      stake: 10000,
      dataDir: TEST_DATA_DIR,
      port: 0,
      peers: [],
    });
    node1.start();
    node1.submitTransaction("a", "b", 10);
    node1.produceBlock();
    node1.submitTransaction("b", "c", 20);
    node1.produceBlock();
    node1.saveState();
    node1.stop();
    expect(node1.chain.height).toBe(3);

    // Second run: should restore state.
    const node2 = new BlockchainNode({
      genesisPath: TEST_GENESIS_PATH,
      validatorId: "validator-1",
      stake: 10000,
      dataDir: TEST_DATA_DIR,
      port: 0,
      peers: [],
    });
    node2.start();
    expect(node2.chain.height).toBe(3); // restored
    expect(node2.chain.validateChain()).toBe(true);
    node2.stop();
  });

  it("ignores saved state with wrong genesis hash", async () => {
    // Write a different genesis.
    const altGenesis = { ...NEXASTREAM_GENESIS, chainId: "different-chain" };
    const altPath = resolve("./.data-test-node/alt-genesis.json");
    await fs.writeFile(altPath, JSON.stringify(altGenesis));

    const node1 = new BlockchainNode({
      genesisPath: TEST_GENESIS_PATH,
      validatorId: "validator-1",
      stake: 10000,
      dataDir: TEST_DATA_DIR,
      port: 0,
      peers: [],
    });
    node1.start();
    node1.submitTransaction("a", "b", 10);
    node1.produceBlock();
    node1.saveState();
    node1.stop();

    // Start with different genesis — should NOT restore.
    const node2 = new BlockchainNode({
      genesisPath: altPath,
      validatorId: "validator-1",
      stake: 10000,
      dataDir: TEST_DATA_DIR,
      port: 0,
      peers: [],
    });
    node2.start();
    expect(node2.chain.height).toBe(1); // only genesis, no restore
    node2.stop();
  });
});

describe("BlockchainNode — block propagation (rule 54)", () => {
  it("node A produces block, node B receives and validates it", () => {
    const nodeA = new BlockchainNode({
      genesisPath: TEST_GENESIS_PATH,
      validatorId: "validator-1",
      stake: 10000,
      dataDir: resolve(TEST_DATA_DIR, "a"),
      port: 0,
      peers: [],
    });
    const nodeB = new BlockchainNode({
      genesisPath: TEST_GENESIS_PATH,
      validatorId: "validator-2",
      stake: 10000,
      dataDir: resolve(TEST_DATA_DIR, "b"),
      port: 0,
      peers: [],
    });
    nodeA.start();
    nodeB.start();

    // Node A produces a block.
    nodeA.submitTransaction("a", "b", 100);
    const block = nodeA.produceBlock();
    expect(block).not.toBeNull();

    // Node B receives and validates it.
    const accepted = nodeB.receiveBlock(block!);
    expect(accepted).toBe(true);
    expect(nodeB.chain.height).toBe(2);
    expect(nodeB.chain.validateChain()).toBe(true);

    nodeA.stop();
    nodeB.stop();
  });

  it("node B rejects block with wrong previousHash", () => {
    const nodeA = new BlockchainNode({
      genesisPath: TEST_GENESIS_PATH,
      validatorId: "validator-1",
      stake: 10000,
      dataDir: resolve(TEST_DATA_DIR, "a"),
      port: 0,
      peers: [],
    });
    const nodeB = new BlockchainNode({
      genesisPath: TEST_GENESIS_PATH,
      validatorId: "validator-2",
      stake: 10000,
      dataDir: resolve(TEST_DATA_DIR, "b"),
      port: 0,
      peers: [],
    });
    nodeA.start();
    nodeB.start();

    nodeA.submitTransaction("a", "b", 100);
    const block = nodeA.produceBlock()!;
    // Tamper: wrong previousHash.
    const tampered = { ...block, previousHash: "f".repeat(64) };
    expect(nodeB.receiveBlock(tampered)).toBe(false);
    expect(nodeB.chain.height).toBe(1); // not accepted

    nodeA.stop();
    nodeB.stop();
  });
});

describe("BlockchainNode — 3 validators (rule 52)", () => {
  it("each validator has a unique public key (independent identity — rule 107)", () => {
    const node1 = new BlockchainNode({
      genesisPath: TEST_GENESIS_PATH, validatorId: "validator-1", stake: 10000,
      dataDir: resolve(TEST_DATA_DIR, "v1"), port: 0, peers: [],
    });
    const node2 = new BlockchainNode({
      genesisPath: TEST_GENESIS_PATH, validatorId: "validator-2", stake: 10000,
      dataDir: resolve(TEST_DATA_DIR, "v2"), port: 0, peers: [],
    });
    const node3 = new BlockchainNode({
      genesisPath: TEST_GENESIS_PATH, validatorId: "validator-3", stake: 10000,
      dataDir: resolve(TEST_DATA_DIR, "v3"), port: 0, peers: [],
    });
    expect(node1.validator.publicKey).not.toBe(node2.validator.publicKey);
    expect(node1.validator.publicKey).not.toBe(node3.validator.publicKey);
    expect(node2.validator.publicKey).not.toBe(node3.validator.publicKey);
  });

  it("all 3 nodes share the same genesis hash (deterministic)", () => {
    const node1 = new BlockchainNode({
      genesisPath: TEST_GENESIS_PATH, validatorId: "validator-1", stake: 10000,
      dataDir: resolve(TEST_DATA_DIR, "v1"), port: 0, peers: [],
    });
    const node2 = new BlockchainNode({
      genesisPath: TEST_GENESIS_PATH, validatorId: "validator-2", stake: 10000,
      dataDir: resolve(TEST_DATA_DIR, "v2"), port: 0, peers: [],
    });
    const node3 = new BlockchainNode({
      genesisPath: TEST_GENESIS_PATH, validatorId: "validator-3", stake: 10000,
      dataDir: resolve(TEST_DATA_DIR, "v3"), port: 0, peers: [],
    });
    expect(node1.chain.genesisHash).toBe(node2.chain.genesisHash);
    expect(node2.chain.genesisHash).toBe(node3.chain.genesisHash);
  });
});

describe("BlockchainNode — stats", () => {
  it("reports accurate stats", () => {
    const node = new BlockchainNode({
      genesisPath: TEST_GENESIS_PATH, validatorId: "validator-1", stake: 10000,
      dataDir: TEST_DATA_DIR, port: 0, peers: [],
    });
    node.start();
    node.submitTransaction("a", "b", 10);
    node.produceBlock();
    const stats = node.getStats();
    expect(stats.validatorId).toBe("validator-1");
    expect(stats.height).toBe(2);
    expect(stats.blockCount).toBe(1);
    expect(stats.uptime).toBeGreaterThanOrEqual(0);
    expect(stats.isSynced).toBe(true);
    node.stop();
  });
});
