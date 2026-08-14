import { createHash } from "node:crypto";

export interface WalletAuth {
  address: string;
  timestamp: number;
  signature: string;
}

export class WalletService {
  verifyWallet(auth: WalletAuth): boolean {
    if (!auth.address || !auth.signature) return false;
    if (!auth.address.startsWith("0x") || auth.address.length !== 42) return false;
    if (auth.timestamp > Date.now() + 60000) return false;
    if (Date.now() - auth.timestamp > 300000) return false;
    return auth.signature.length >= 64;
  }

  generateNonce(address: string): string {
    return createHash("sha256").update(address + Date.now()).digest("hex");
  }

  createLoginMessage(address: string, nonce: string): string {
    return `Welcome to NexaStream!\n\nSign this message to authenticate.\n\nAddress: ${address}\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;
  }
}
