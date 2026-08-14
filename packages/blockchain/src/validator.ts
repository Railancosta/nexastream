import { randomBytes, createSign, createHash, generateKeyPairSync, type KeyObject } from "node:crypto";
import type { Transaction, Block } from "./block.js";
import { mineBlock } from "./block.js";

/**
 * A validator node. Each validator has its OWN key pair — never shared between
 * validators (rule 52, rule 107). Validators produce blocks via PoW.
 */
export class Validator {
  readonly id: string;
  private readonly privateKey: KeyObject;
  readonly publicKey: string;
  readonly stake: number;

  constructor(id: string, stake = 10000) {
    this.id = id;
    const { publicKey, privateKey } = generateKeyPair();
    this.privateKey = privateKey;
    this.publicKey = publicKey;
    this.stake = stake;
  }

  /** Sign a transaction with this validator's private key (RSA-SHA256). */
  signTransaction(from: string, to: string, amount: number): Transaction {
    const timestamp = Date.now();
    const data = `${from}|${to}|${amount}|${timestamp}`;
    const sign = createSign("SHA256");
    sign.update(data);
    sign.end();
    const signature = sign.sign(this.privateKey, "hex");
    const id = createHash("sha256").update(data + signature).digest("hex");
    return { id, from, to, amount, timestamp, signature };
  }

  /** Produce a new block by mining (PoW). */
  produceBlock(
    index: number,
    previousHash: string,
    transactions: readonly Transaction[],
    difficulty: number,
  ): Block {
    return mineBlock(
      {
        index,
        timestamp: Date.now(),
        previousHash,
        difficulty,
        validatorId: this.id,
      },
      transactions,
    );
  }
}

/** Generate an independent RSA key pair for a validator. */
function generateKeyPair(): { publicKey: string; privateKey: KeyObject } {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  return {
    publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
    privateKey,
  };
}

/** Generate a random validator id. */
export function generateValidatorId(): string {
  return "validator-" + randomBytes(8).toString("hex");
}
