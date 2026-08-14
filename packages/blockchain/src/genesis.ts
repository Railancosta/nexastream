import type { Block, Transaction } from "./block.js";
import { mineBlock } from "./block.js";

/**
 * Genesis configuration. The genesis block is deterministic — given the same
 * parameters, the same genesis hash is always produced (rule 53).
 */
export interface GenesisConfig {
  readonly chainId: string;
  readonly networkId: string;
  readonly version: number;
  readonly timestamp: number;
  readonly difficulty: number;
  readonly initialValidators: readonly ValidatorGenesis[];
  readonly initialAllocations: readonly AllocationGenesis[];
}

export interface ValidatorGenesis {
  readonly id: string;
  readonly publicKey: string;
  readonly stake: number;
}

export interface AllocationGenesis {
  readonly address: string;
  readonly amount: number;
}

/**
 * The canonical NexaStream testnet genesis.
 * This is versioned and must NOT change after publication (rule 53).
 */
export const NEXASTREAM_GENESIS: GenesisConfig = {
  chainId: "nexastream-testnet-1",
  networkId: "nexastream-testnet",
  version: 1,
  timestamp: 1735689600, // 2025-01-01T00:00:00Z — fixed, deterministic
  difficulty: 8, // 8 leading zero bits (2 hex chars) — low for testnet speed
  initialValidators: [
    { id: "validator-1", publicKey: "0x" + "a1".repeat(32), stake: 10000 },
    { id: "validator-2", publicKey: "0x" + "b2".repeat(32), stake: 10000 },
    { id: "validator-3", publicKey: "0x" + "c3".repeat(32), stake: 10000 },
  ],
  initialAllocations: [],
};

/**
 * Create the genesis block from a genesis config. Deterministic: the same
 * config always produces the same block and hash.
 */
export function createGenesisBlock(config: GenesisConfig): Block {
  const genesisTx: Transaction = {
    id: "genesis-" + config.chainId,
    from: "0x0",
    to: "0x0",
    amount: 0,
    timestamp: config.timestamp,
    signature: "genesis",
  };

  return mineBlock(
    {
      index: 0,
      timestamp: config.timestamp,
      previousHash: "0".repeat(64),
      difficulty: config.difficulty,
      validatorId: "genesis",
    },
    [genesisTx],
  );
}

/**
 * Compute the genesis hash. The same config always produces the same hash.
 */
export function genesisHash(config: GenesisConfig): string {
  return createGenesisBlock(config).hash;
}
