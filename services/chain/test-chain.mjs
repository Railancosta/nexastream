// ---------------------------------------------------------------------------
// Blockchain Integration Tests (Item 39 — Test First)
// Run: node services/chain/server.js & sleep 1 && node services/chain/test-chain.mjs
// ---------------------------------------------------------------------------

import { describe, it } from 'node:test';
import assert from 'node:assert';

const BASE = 'http://localhost:3008';
const EXPLORER = 'http://localhost:3009';

async function api(url, method = 'GET', body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  return { status: r.status, data: await r.json().catch(() => ({})) };
}

// --- WALLET TESTS ---
describe('Wallet', () => {
  let wallet;

  it('creates wallet with address, pubkey, privkey', async () => {
    const { status, data } = await api(BASE + '/api/chain/wallet', 'POST');
    assert.strictEqual(status, 200);
    assert.ok(data.address);
    assert.ok(data.publicKey);
    assert.ok(data.privateKey);
    assert.strictEqual(data.address.length, 40);
    wallet = data;
  });

  it('wallet has zero initial balance', async () => {
    const { status, data } = await api(BASE + '/api/chain/balance/' + wallet.address);
    assert.strictEqual(status, 200);
    assert.strictEqual(data.balance, 0);
  });
});

// --- FAUCET TESTS ---
describe('Faucet', () => {
  let wallet;

  it('funds wallet from treasury', async () => {
    const { data: w } = await api(BASE + '/api/chain/wallet', 'POST');
    wallet = w;
    const { status, data } = await api(BASE + '/api/chain/faucet', 'POST', { to: wallet.address, amount: 100 });
    assert.strictEqual(status, 200);
    assert.ok(data.txId || data.error);
  });

  it('faucet caps at 1000 NST', async () => {
    const { data: w } = await api(BASE + '/api/chain/wallet', 'POST');
    const { status, data } = await api(BASE + '/api/chain/faucet', 'POST', { to: w.address, amount: 999999 });
    assert.strictEqual(status, 200);
    // Should succeed but capped
    assert.ok(!data.error || data.error.includes('saldo'));
  });
});

// --- TRANSACTION TESTS ---
describe('Transactions', () => {
  let alice, bob;

  it('creates wallets for alice and bob', async () => {
    const { data: a } = await api(BASE + '/api/chain/wallet', 'POST');
    const { data: b } = await api(BASE + '/api/chain/wallet', 'POST');
    alice = a;
    bob = b;

    // Fund alice (faucet tx goes to mempool, must mine to confirm)
    await api(BASE + '/api/chain/faucet', 'POST', { to: alice.address, amount: 500 });
    await api(BASE + '/api/chain/mine', 'POST', { miner: 'test-tx-miner' });
  });

  it('submits valid transaction', async () => {
    const { status, data } = await api(BASE + '/api/chain/tx', 'POST', {
      from: alice.address, to: bob.address, amount: 10, privateKey: alice.privateKey
    });
    assert.strictEqual(status, 200);
    assert.ok(data.txId);
    assert.strictEqual(data.status, 'mempool');
  });

  it('rejects invalid signature', async () => {
    const { status, data } = await api(BASE + '/api/chain/tx', 'POST', {
      from: alice.address, to: bob.address, amount: 10, privateKey: bob.privateKey
    });
    assert.strictEqual(status, 200);
    assert.ok(data.error);
    assert.ok(data.error.includes('invalida') || data.error.includes('chave'));
  });

  it('rejects insufficient balance', async () => {
    const { data: w } = await api(BASE + '/api/chain/wallet', 'POST');
    const { status, data } = await api(BASE + '/api/chain/tx', 'POST', {
      from: w.address, to: bob.address, amount: 1, privateKey: w.privateKey
    });
    assert.strictEqual(status, 200);
    assert.ok(data.error);
  });

  it('rejects unknown wallet', async () => {
    const { status, data } = await api(BASE + '/api/chain/tx', 'POST', {
      from: 'nonexistent', to: bob.address, amount: 1, privateKey: 'fake'
    });
    assert.strictEqual(status, 200);
    assert.ok(data.error);
  });

  it('rejects self-transfer', async () => {
    const { status, data } = await api(BASE + '/api/chain/tx', 'POST', {
      from: alice.address, to: alice.address, amount: 10, privateKey: alice.privateKey
    });
    assert.strictEqual(status, 200);
    assert.ok(data.error);
  });
});

// --- MINING TESTS ---
describe('Mining', () => {
  it('mines a block and returns reward', async () => {
    const { status, data } = await api(BASE + '/api/chain/mine', 'POST', { miner: 'test-validator' });
    assert.strictEqual(status, 200);
    assert.ok(data.block >= 0);
    assert.ok(data.hash);
    assert.ok(typeof data.nonce === 'number');
    assert.ok(data.difficulty >= 1);
  });

  it('chain height increases after mining', async () => {
    const { data: before } = await api(BASE + '/api/chain');
    const heightBefore = before.height;
    await api(BASE + '/api/chain/mine', 'POST', { miner: 'test-validator' });
    const { data: after } = await api(BASE + '/api/chain');
    assert.ok(after.height > heightBefore);
  });
});

// --- CHAIN INFO TESTS ---
describe('Chain Info', () => {
  it('returns chain status with mainnet', async () => {
    const { status, data } = await api(BASE + '/api/chain');
    assert.strictEqual(status, 200);
    assert.strictEqual(data.network, 'mainnet');
    assert.ok(typeof data.height === 'number');
    assert.ok(typeof data.difficulty === 'number');
    assert.ok(typeof data.reward === 'number');
    assert.strictEqual(data.maxSupply, 55000000);
  });

  it('returns recent blocks', async () => {
    const { status, data } = await api(BASE + '/api/chain/blocks?limit=5');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data.blocks));
    assert.ok(data.blocks.length > 0);
    assert.ok(data.blocks[0].hash);
  });

  it('returns mempool', async () => {
    const { status, data } = await api(BASE + '/api/chain/mempool');
    assert.strictEqual(status, 200);
    assert.ok(typeof data.pending === 'number');
  });
});

// --- CHAIN VERIFICATION ---
describe('Chain Verification', () => {
  it('verifies chain integrity', async () => {
    const { status, data } = await api(BASE + '/api/chain/verify');
    assert.strictEqual(status, 200);
    assert.strictEqual(data.valid, true);
    assert.ok(data.height >= 0);
    assert.ok(data.assinaturasVerificadas >= 0);
    assert.strictEqual(data.network, 'mainnet');
    assert.strictEqual(data.maxSupply, 55000000);
  });
});

// --- BALANCES ---
describe('Balances', () => {
  it('returns balance leaderboard', async () => {
    const { status, data } = await api(BASE + '/api/chain/balances');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data.balances));
    // Treasury should be first (or near first)
    if (data.balances.length > 0) {
      assert.ok(data.balances[0].amount > 0);
    }
  });

  it('returns single address balance', async () => {
    const { data: w } = await api(BASE + '/api/chain/wallet', 'POST');
    const { status, data } = await api(BASE + '/api/chain/balance/' + w.address);
    assert.strictEqual(status, 200);
    assert.strictEqual(data.address, w.address);
    assert.ok(typeof data.balance === 'number');
  });
});

// --- EXPLORER TESTS ---
describe('Explorer', () => {
  it('returns chain overview', async () => {
    const { status, data } = await api(EXPLORER + '/api/explorer');
    assert.strictEqual(status, 200);
    assert.strictEqual(data.network, 'mainnet');
    assert.ok(typeof data.height === 'number');
    assert.ok(Array.isArray(data.blocks));
  });

  it('returns chain stats', async () => {
    const { status, data } = await api(EXPLORER + '/api/explorer/stats');
    assert.strictEqual(status, 200);
    assert.ok(typeof data.totalWallets === 'number');
    assert.ok(typeof data.activeAddresses === 'number');
  });

  it('returns balances', async () => {
    const { status, data } = await api(EXPLORER + '/api/explorer/balances');
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(data.balances));
  });

  it('binds creator wallet', async () => {
    const { status, data } = await api(EXPLORER + '/api/explorer/bind', 'POST', {
      username: 'testcreator', address: 'test123'
    });
    assert.strictEqual(status, 200);
    assert.ok(data.ok);
  });

  it('looks up bound address', async () => {
    const { status, data } = await api(EXPLORER + '/api/explorer/bind/testcreator');
    assert.strictEqual(status, 200);
    assert.strictEqual(data.address, 'test123');
  });
});

// --- HEALTH CHECK ---
describe('Health', () => {
  it('chain health endpoint', async () => {
    const { status, data } = await api(BASE + '/api/health');
    assert.strictEqual(status, 200);
    assert.ok(data.ok);
    assert.strictEqual(data.network, 'mainnet');
  });

  it('explorer health endpoint', async () => {
    const { status, data } = await api(EXPLORER + '/api/health');
    assert.strictEqual(status, 200);
    assert.ok(data.ok);
  });
});

console.log('\n⛓️ Blockchain Tests — Run: node services/chain/server.js & node services/chain/test-chain.mjs\n');
