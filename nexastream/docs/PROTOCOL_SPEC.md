# NexaStream Blockchain Protocol Specification

## Version: 1.0.0
## Last Updated: 2024

---

## Table of Contents

1. [Overview](#1-overview)
2. [Network Configuration](#2-network-configuration)
3. [Consensus Mechanism](#3-consensus-mechanism)
4. [Cryptography](#4-cryptography)
5. [Transactions](#5-transactions)
6. [Smart Contracts](#6-smart-contracts)
7. [Storage](#7-storage)
8. [P2P Protocol](#8-p2p-protocol)
9. [API](#9-api)
10. [Security](#10-security)

---

## 1. Overview

### 1.1 Purpose
NexaStream Chain is a custom blockchain designed to power the NexaStream decentralized video platform with native token support, low transaction fees, and post-quantum security.

### 1.2 Key Features
- Hybrid PoW/PoS consensus
- Post-quantum cryptography
- Native token (NST)
- Low transaction costs
- High throughput
- Smart contract support

---

## 2. Network Configuration

### 2.1 Network Parameters

| Parameter | Testnet | Mainnet |
|-----------|---------|---------|
| Chain ID | 1337 | 1 |
| Network Name | NexaStream Testnet | NexaStream Mainnet |
| RPC Port | 8545 | 8545 |
| P2P Port | 30303 | 30303 |
| API Port | 8080 | 8080 |
| Block Time | 3 seconds | 3 seconds |
| Gas Limit | 30,000,000 | 30,000,000 |

### 2.2 Genesis Block

```json
{
  "version": 1,
  "chain_id": 1337,
  "timestamp": 1700000000,
  "height": 0,
  "prev_hash": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "state_root": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "tx_root": "0x0000000000000000000000000000000000000000000000000000000000000000",
  "difficulty": 1,
  "allocations": {
    "0x0000000000000000000000000000000000000001": 27500000000000000000000000,
    "0x0000000000000000000000000000000000000002": 16500000000000000000000000,
    "0x0000000000000000000000000000000000000003": 5500000000000000000000000,
    "0x0000000000000000000000000000000000000004": 2750000000000000000000000,
    "0x0000000000000000000000000000000000000005": 2750000000000000000000000
  }
}
```

---

## 3. Consensus Mechanism

### 3.1 Hybrid PoW/PoS

NexaStream uses a hybrid consensus combining:
- **Proof of Work (PoW)**: Every 10th block (ensures network security)
- **Proof of Stake (PoS)**: Blocks 1-9 (provides fast finality)

### 3.2 Parameters

| Parameter | Value |
|-----------|-------|
| PoW Block Interval | 60 seconds |
| PoS Block Interval | 3 seconds |
| PoW Reward | 10 NST |
| PoS Reward | 2 NST |
| Minimum Stake | 100 NST |
| Max Validators | 100 |
| Difficulty Adjustment Period | 10 blocks |

---

## 4. Cryptography

### 4.1 Post-Quantum Ready

NexaStream implements a hybrid cryptographic approach combining classical ECDSA with post-quantum CRYSTALS-Dilithium.

### 4.2 Supported Algorithms

| Algorithm | Type | Security Level |
|-----------|------|----------------|
| ECDSA-P256 | Signature | 128-bit |
| ECDSA-P384 | Signature | 192-bit |
| Dilithium2/3/5 | Signature | 128-256-bit |
| Hybrid | Signature | 256-bit |
| ML-KEM-768 | KEM | 192-bit |

### 4.3 Address Derivation

```
address = RIPEMD160(SHA256(public_key))
```

---

## 5. Transactions

### 5.1 Transaction Types

| Type ID | Name | Base Gas |
|---------|------|----------|
| 0 | Transfer | 21,000 |
| 1 | Stake | 50,000 |
| 2 | Unstake | 50,000 |
| 3 | Reward | 0 |
| 4 | Contract | 21,000+ |
| 5 | NFTMint | 100,000 |
| 6 | NFTTransfer | 50,000 |
| 7 | Governance | 30,000 |

---

## 6. Smart Contracts

### 6.1 Built-in Contracts

- NST Token Contract
- Staking Contract
- Creator Rewards Contract

---

## 7. Storage

### 7.1 State Storage

- Accounts (balance, nonce, code)
- Contracts (storage trie)
- Staking (stake amounts)
- Governance (proposals, votes)

---

## 8. P2P Protocol

### 8.1 Node Discovery

- Bootstrap nodes (hardcoded)
- Kademlia DHT for peer discovery
- Periodic ping/pong for liveness

### 8.2 Message Types

- NewBlock, NewTx
- GetBlock, GetBlocks
- BlockResponse, NodeDataResponse

---

## 9. API

### 9.1 RPC API

- nexastream_getBlockByNumber
- nexastream_getTransactionByHash
- nexastream_getBalance
- nexastream_sendTransaction
- nexastream_call

### 9.2 REST API

| Endpoint | Description |
|----------|-------------|
| /api/v1/health | Health check |
| /api/v1/chain/stats | Chain statistics |
| /api/v1/blocks/{height} | Get block |
| /api/v1/wallet/{address}/balance | Get balance |
| /api/v1/staking/stats | Staking info |

---

## 10. Security

### 10.1 Attack Prevention

| Attack | Prevention |
|--------|------------|
| Double-spending | Transaction ordering + nonces |
| Sybil | Stake-based validator selection |
| 51% Attack | Hybrid consensus + slashing |
| Replay | Chain ID in signature |

### 10.2 Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| RPC Read | 100 | 1 minute |
| RPC Write | 10 | 1 minute |

### 10.3 Slashing Conditions

- Double signing: Slash 5% of stake
- Unavailability: Reduce reputation
- Invalid block: Reject block + penalize

---

**For questions: dev@nexastream.org**
