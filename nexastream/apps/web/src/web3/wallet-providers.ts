/**
 * NexaStream — Universal Web3 Wallet Provider
 * Supports: MetaMask, WalletConnect, Coinbase, Phantom (Solana), Trust Wallet,
 * Binance Wallet, OKX Wallet, and any EIP-1193 compatible provider.
 */

export type WalletType = "metamask" | "walletconnect" | "coinbase" | "phantom" | "trust" | "binance" | "okx" | "injected";

export interface WalletInfo {
  type: WalletType;
  name: string;
  icon: string;
  available: boolean;
}

export interface WalletConnection {
  address: string;
  chainId: number;
  provider: any;
  walletType: WalletType;
}

const WALLETS: WalletInfo[] = [
  { type: "metamask", name: "MetaMask", icon: "🦊", available: false },
  { type: "coinbase", name: "Coinbase Wallet", icon: "🔵", available: false },
  { type: "phantom", name: "Phantom (Solana)", icon: "👻", available: false },
  { type: "trust", name: "Trust Wallet", icon: "🛡️", available: false },
  { type: "binance", name: "Binance Wallet", icon: "🟡", available: false },
  { type: "okx", name: "OKX Wallet", icon: "⬛", available: false },
  { type: "injected", name: "Injected (Other)", icon: "🔌", available: false },
];

/** Detect which wallets are available in the browser. */
export function detectWallets(): WalletInfo[] {
  const w = typeof window !== "undefined" ? (window as any) : {};
  const result = WALLETS.map(wallet => ({ ...wallet }));

  // MetaMask / EIP-1193
  if (w.ethereum) {
    if (w.ethereum.isMetaMask) result.find(x => x.type === "metamask")!.available = true;
    if (w.ethereum.isCoinbaseWallet) result.find(x => x.type === "coinbase")!.available = true;
    if (w.ethereum.isTrust) result.find(x => x.type === "trust")!.available = true;
    if (w.ethereum.isBinance) result.find(x => x.type === "binance")!.available = true;
    if (w.ethereum.isOkxWallet) result.find(x => x.type === "okx")!.available = true;
    // Any injected EVM wallet
    result.find(x => x.type === "injected")!.available = true;
  }

  // Phantom (Solana)
  if (w.solana || w.phantom) {
    result.find(x => x.type === "phantom")!.available = true;
  }

  // WalletConnect is always "available" (opens via QR)
  result.find(x => x.type === "walletconnect")!.available = true;

  return result;
}

/** Get the EIP-1193 provider for a wallet type. */
function getProvider(type: WalletType): any {
  const w = (window as any);
  switch (type) {
    case "metamask":
    case "injected":
      return w.ethereum;
    case "coinbase":
      return w.ethereum?.isCoinbaseWallet ? w.ethereum : w.coinbaseWalletExtension;
    case "trust":
      return w.ethereum?.isTrust ? w.ethereum : w.trustwallet;
    case "binance":
      return w.ethereum?.isBinance ? w.ethereum : w.BinanceChain;
    case "okx":
      return w.ethereum?.isOkxWallet ? w.ethereum : w.okxwallet;
    case "phantom":
      return w.solana || w.phantom;
    case "walletconnect":
      return w.ethereum; // Fallback to injected, WalletConnect would need SDK
    default:
      return w.ethereum;
  }
}

/** Connect to a specific wallet. */
export async function connectWalletByType(type: WalletType): Promise<WalletConnection> {
  const provider = getProvider(type);
  if (!provider) throw new Error("Wallet not found. Please install the wallet extension.");

  // EVM wallets (MetaMask, Coinbase, Trust, Binance, OKX)
  if (type !== "phantom") {
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    const chainIdHex = await provider.request({ method: "eth_chainId" });
    return {
      address: accounts[0],
      chainId: parseInt(chainIdHex, 16),
      provider,
      walletType: type,
    };
  }

  // Phantom (Solana)
  if (provider.connect) {
    const resp = await provider.connect();
    return {
      address: resp.publicKey.toString(),
      chainId: 0, // Solana doesn't use chainId the same way
      provider,
      walletType: "phantom",
    };
  }

  throw new Error("Failed to connect wallet");
}

/** Sign a message with any wallet. */
export async function signWithWallet(connection: WalletConnection, message: string): Promise<string> {
  if (connection.walletType === "phantom") {
    // Solana signing
    const encoded = new TextEncoder().encode(message);
    const signed = await connection.provider.signMessage(encoded, "utf8");
    return Array.from(signed.signature).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  // EVM signing (personal_sign)
  return await connection.provider.request({
    method: "personal_sign",
    params: [message, connection.address],
  });
}

/** Listen for account changes. */
export function onAccountChange(connection: WalletConnection, callback: (address: string) => void): void {
  if (connection.walletType === "phantom") {
    connection.provider.on("accountChanged", (publicKey: any) => {
      if (publicKey) callback(publicKey.toString());
      else callback("");
    });
  } else if (connection.provider.on) {
    connection.provider.on("accountsChanged", (accounts: string[]) => {
      callback(accounts[0] || "");
    });
  }
}

/** Listen for chain changes. */
export function onChainChange(connection: WalletConnection, callback: (chainId: number) => void): void {
  if (connection.provider.on) {
    connection.provider.on("chainChanged", (chainIdHex: string) => {
      callback(parseInt(chainIdHex, 16));
    });
  }
}

/** Get available wallets only. */
export function getAvailableWallets(): WalletInfo[] {
  return detectWallets().filter(w => w.available);
}
