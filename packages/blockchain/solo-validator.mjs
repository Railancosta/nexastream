import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { randomBytes, generateKeyPairSync, createSign } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

// === Constants ===
const NST_DECIMALS = 18;
const NST_BASE_UNIT = 10n ** BigInt(NST_DECIMALS);
const MAX_SUPPLY = 55_000_000n * NST_BASE_UNIT;

// === Genesis ===
const NEXASTREAM_GENESIS = {
  chainId: "nexastream-testnet-1",
  networkId: "nexastream-testnet",
  version: 1,
  timestamp: 1735689600,
  difficulty: 8,
  initialValidators: [
    { id: "validator-1", publicKey: "0x" + "a1".repeat(32), stake: 10000 },
    { id: "validator-2", publicKey: "0x" + "b2".repeat(32), stake: 10000 },
    { id: "validator-3", publicKey: "0x" + "c3".repeat(32), stake: 10000 },
  ],
  initialAllocations: [],
};

// === Block ===
function computeBlockHash(header) {
  const data = [header.index, header.timestamp, header.previousHash, header.merkleRoot, header.nonce, header.difficulty, header.validatorId].join("|");
  return createHash("sha256").update(data).digest("hex");
}

function computeMerkleRoot(txs) {
  if (!txs.length) return createHash("sha256").update("").digest("hex");
  let layer = txs.map((t) => createHash("sha256").update(t.id + t.amount + t.from + t.to).digest("hex"));
  while (layer.length > 1) {
    const next = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = i + 1 < layer.length ? layer[i + 1] : layer[i];
      next.push(createHash("sha256").update(left + right).digest("hex"));
    }
    layer = next;
  }
  return layer[0];
}

function meetsDifficulty(hash, difficulty) {
  const zeroChars = Math.ceil(difficulty / 4);
  return hash.startsWith("0".repeat(zeroChars));
}

function mineBlock(header, transactions) {
  const merkleRoot = computeMerkleRoot(transactions);
  let nonce = 0;
  let hash = "";
  do {
    hash = computeBlockHash({ ...header, merkleRoot, nonce });
    if (meetsDifficulty(hash, header.difficulty)) break;
    nonce++;
  } while (true);
  return { ...header, merkleRoot, nonce, hash, transactions };
}

// === Validator ===
function generateKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return { publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(), privateKey };
}

function createValidator(id, stake = 10000) {
  const { publicKey, privateKey } = generateKeyPair();
  return {
    id, publicKey, stake, privateKey,
    signTransaction(from, to, amount) {
      const timestamp = Date.now();
      const data = `${from}|${to}|${amount}|${timestamp}`;
      const sign = createSign("SHA256");
      sign.update(data);
      sign.end();
      const signature = sign.sign(privateKey, "hex");
      const txId = createHash("sha256").update(data + signature).digest("hex");
      return { id: txId, from, to, amount, timestamp, signature, nonce: 0 };
    },
    produceBlock(index, previousHash, transactions, difficulty) {
      return mineBlock({ index, timestamp: Date.now(), previousHash, difficulty, validatorId: this.id }, transactions);
    },
  };
}

// === Chain ===
function validateBlock(block, parent) {
  if (block.index !== parent.index + 1) throw new Error("invalid index");
  if (block.previousHash !== parent.hash) throw new Error("previousHash mismatch");
  if (!meetsDifficulty(block.hash, block.difficulty)) throw new Error("difficulty not met");
  const recomputed = computeBlockHash({ index: block.index, timestamp: block.timestamp, previousHash: block.previousHash, merkleRoot: block.merkleRoot, nonce: block.nonce, difficulty: block.difficulty, validatorId: block.validatorId });
  if (recomputed !== block.hash) throw new Error("hash mismatch");
  const expectedMerkle = computeMerkleRoot(block.transactions);
  if (expectedMerkle !== block.merkleRoot) throw new Error("merkle mismatch");
}

function createGenesisBlock(config) {
  const genesisTx = { id: "genesis-" + config.chainId, from: "0x0", to: "0x0", amount: 0, timestamp: config.timestamp, signature: "genesis" };
  return mineBlock({ index: 0, timestamp: config.timestamp, previousHash: "0".repeat(64), difficulty: config.difficulty, validatorId: "genesis" }, [genesisTx]);
}

// === State Manager ===
function createStateManager() {
  const accounts = new Map();
  let totalSupply = 0n;

  return {
    getBalance(addr) { return accounts.get(addr)?.balance ?? 0n; },
    getNonce(addr) { return accounts.get(addr)?.nonce ?? 0; },
    getTotalSupply() { return totalSupply; },
    mint(to, amount) {
      if (amount <= 0n) throw new Error("mint amount must be positive");
      if (totalSupply + amount > MAX_SUPPLY) throw new Error("exceeds MAX_SUPPLY");
      let acc = accounts.get(to);
      if (!acc) { acc = { balance: 0n, nonce: 0 }; accounts.set(to, acc); }
      acc.balance += amount;
      totalSupply += amount;
    },
    transfer(from, to, amount, nonce) {
      if (amount <= 0n) throw new Error("amount must be positive");
      const fromAcc = accounts.get(from);
      if (!fromAcc || fromAcc.balance < amount) throw new Error("insufficient balance");
      if (fromAcc.nonce !== nonce) throw new Error(`nonce mismatch: expected ${fromAcc.nonce}, got ${nonce}`);
      let toAcc = accounts.get(to);
      if (!toAcc) { toAcc = { balance: 0n, nonce: 0 }; accounts.set(to, toAcc); }
      fromAcc.balance -= amount;
      toAcc.balance += amount;
      fromAcc.nonce++;
    },
    applyTransaction(tx) {
      if (tx.from === "0x0" && tx.to === "0x0") return;
      if (tx.from === "0x0") { this.mint(tx.to, BigInt(tx.amount)); }
      else { this.transfer(tx.from, tx.to, BigInt(tx.amount), tx.nonce ?? 0); }
    },
    applyBlock(txs) { for (const tx of txs) this.applyTransaction(tx); },
    getAccounts() {
      return Array.from(accounts.entries()).map(([address, s]) => ({ address, balance: s.balance.toString(), nonce: s.nonce }));
    },
    serialize() { return JSON.stringify({ accounts: Array.from(accounts.entries()).map(([a, s]) => [a, s.balance.toString(), s.nonce]), totalSupply: totalSupply.toString() }); },
    deserialize(data) {
      try {
        const parsed = JSON.parse(data);
        for (const [addr, balance, nonce] of parsed.accounts) accounts.set(addr, { balance: BigInt(balance), nonce });
        totalSupply = BigInt(parsed.totalSupply);
      } catch {}
    },
  };
}

// === Solo Validator ===
const args = process.argv.slice(2);
const getArg = (name) => { const i = args.indexOf(`--${name}`); return i >= 0 && i + 1 < args.length ? args[i + 1] : ""; };

const genesisPath = getArg("genesis") || resolve(__dirname, "../../blockchain/testnet/genesis.json");
const dataDir = getArg("data-dir") || resolve(__dirname, "../../.data/solo-validator");
const rpcPort = parseInt(getArg("port") || "9001", 10);
const blockInterval = parseInt(getArg("interval") || "10000", 10);
const blockReward = 50n * NST_BASE_UNIT;

// Load genesis
let genesisConfig = NEXASTREAM_GENESIS;
try { genesisConfig = JSON.parse(readFileSync(genesisPath, "utf8")); } catch {}

// Init chain
const genesisBlock = createGenesisBlock(genesisConfig);
const blocks = [genesisBlock];
const mempool = [];
const validator = createValidator("solo-validator-1", 10000);

// Init state
const state = createStateManager();
const statePath = resolve(dataDir, "state-manager.json");
const chainPath = resolve(dataDir, "state-solo-validator-1.json");

// Restore state
if (existsSync(statePath)) { try { state.deserialize(readFileSync(statePath, "utf8")); } catch {} }

// Restore chain
if (existsSync(chainPath)) {
  try {
    const saved = JSON.parse(readFileSync(chainPath, "utf8"));
    if (saved.genesisHash === genesisBlock.hash) {
      for (let i = 1; i < saved.blocks.length; i++) {
        try { validateBlock(saved.blocks[i], blocks[blocks.length - 1]); blocks.push(saved.blocks[i]); }
        catch { break; }
      }
      // Rebuild state from blocks
      for (let i = 1; i < blocks.length; i++) state.applyBlock(blocks[i].transactions);
      console.log(`[solo-validator] restored ${blocks.length - 1} blocks from disk`);
    }
  } catch {}
}

console.log(`[solo-validator] started | genesis=${genesisBlock.hash.slice(0, 16)}... | height=${blocks.length} | supply=${state.getTotalSupply().toString().slice(0, 10)}...`);

// RPC Server
const server = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  const url = new URL(req.url || "/", `http://localhost:${rpcPort}`);
  const path = url.pathname;

  try {
    if (path === "/health" || path === "/") {
      res.end(JSON.stringify({ status: "ok", height: blocks.length, synced: true, genesisHash: genesisBlock.hash }));
    } else if (path === "/status") {
      res.end(JSON.stringify({ validatorId: "solo-validator-1", height: blocks.length, blockCount: blocks.length - 1, genesisHash: genesisBlock.hash, totalSupply: state.getTotalSupply().toString(), maxSupply: MAX_SUPPLY.toString() }));
    } else if (path === "/blocks") {
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const result = blocks.slice(-limit).map((b) => ({ index: b.index, hash: b.hash, validatorId: b.validatorId, timestamp: b.timestamp, txCount: b.transactions.length }));
      res.end(JSON.stringify({ blocks: result, count: result.length, height: blocks.length }));
    } else if (path === "/accounts") {
      res.end(JSON.stringify({ accounts: state.getAccounts(), totalSupply: state.getTotalSupply().toString() }));
    } else if (path.startsWith("/balance/")) {
      const addr = path.split("/")[2];
      res.end(JSON.stringify({ address: addr, balance: state.getBalance(addr).toString(), nonce: state.getNonce(addr) }));
    } else if (path === "/metrics") {
      res.end(JSON.stringify({ height: blocks.length, blockCount: blocks.length - 1, totalSupply: state.getTotalSupply().toString(), maxSupply: MAX_SUPPLY.toString(), validatorId: "solo-validator-1", genesisHash: genesisBlock.hash }));
    } else if (path === "/explorer") {
      const recent = blocks.slice(-20).map((b) => ({ index: b.index, hash: b.hash.slice(0, 16) + "...", validator: b.validatorId, txs: b.transactions.length, time: new Date(b.timestamp).toISOString() }));
      res.end(JSON.stringify({ chain: "nexastream-testnet-1", height: blocks.length, totalSupply: state.getTotalSupply().toString(), accounts: state.getAccounts().length, recentBlocks: recent }));
    } else {
      res.end(JSON.stringify({ error: "not found", endpoints: ["/health", "/status", "/blocks", "/accounts", "/balance/:addr", "/metrics", "/explorer"] }));
    }
  } catch (e) {
    res.end(JSON.stringify({ error: "internal error" }));
  }
});

server.listen(rpcPort, () => console.log(`[rpc] listening on port ${rpcPort}`));

// Block production
function produceBlock() {
  // Block reward transaction
  const rewardTx = validator.signTransaction("0x0", "solo-validator-1", Number(blockReward));
  const txs = [rewardTx, ...mempool.splice(0)];
  const block = validator.produceBlock(blocks.length, blocks[blocks.length - 1].hash, txs, genesisConfig.difficulty);
  blocks.push(block);
  state.applyBlock(block.transactions);
  saveState();
  console.log(`[solo-validator] block #${block.index} | hash=${block.hash.slice(0, 16)}... | txs=${block.transactions.length} | supply=${state.getTotalSupply().toString().slice(0, 12)}... NST`);
}

function saveState() {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  writeFileSync(statePath, state.serialize());
  writeFileSync(chainPath, JSON.stringify({ validatorId: "solo-validator-1", genesisHash: genesisBlock.hash, height: blocks.length, blocks }));
}

// Start producing blocks
const blockTimer = setInterval(() => { try { produceBlock(); } catch (e) { console.error("[solo-validator] block error:", e.message); } }, blockInterval);

// Save state periodically
setInterval(() => saveState(), 30000);

process.on("SIGINT", () => { clearInterval(blockTimer); saveState(); server.close(); console.log("[solo-validator] stopped"); process.exit(0); });
process.on("SIGTERM", () => { clearInterval(blockTimer); saveState(); server.close(); console.log("[solo-validator] stopped"); process.exit(0); });
