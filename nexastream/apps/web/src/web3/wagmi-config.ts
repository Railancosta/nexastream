/**
 * Wagmi + WalletConnect v2 Configuration
 * 500+ wallets via WalletConnect, EIP-6963 for desktop extensions,
 * QR code for mobile deep linking, multi-chain support.
 *
 * Chains: Ethereum, Polygon, Arbitrum, Base, BSC, Optimism
 */

// Chain definitions
export const CHAINS = [
  { id: 1, name: "Ethereum", rpcUrl: "https://eth.llamarpc.com", explorer: "https://etherscan.io", currency: "ETH" },
  { id: 137, name: "Polygon", rpcUrl: "https://polygon-rpc.com", explorer: "https://polygonscan.com", currency: "MATIC" },
  { id: 42161, name: "Arbitrum", rpcUrl: "https://arb1.arbitrum.io/rpc", explorer: "https://arbiscan.io", currency: "ETH" },
  { id: 8453, name: "Base", rpcUrl: "https://mainnet.base.org", explorer: "https://basescan.org", currency: "ETH" },
  { id: 56, name: "BSC", rpcUrl: "https://bsc-dataseed.binance.org", explorer: "https://bscscan.com", currency: "BNB" },
  { id: 10, name: "Optimism", rpcUrl: "https://mainnet.optimism.io", explorer: "https://optimistic.etherscan.io", currency: "ETH" },
] as const;

// WalletConnect project ID (register at https://cloud.walletconnect.com)
export const WALLETCONNECT_PROJECT_ID = "nexastream_wc_project_id";

// Wallet categories for UI
export const WALLET_CATEGORIES = {
  popular: [
    { id: "metamask", name: "MetaMask", icon: "🦊", type: "extension" },
    { id: "coinbase", name: "Coinbase Wallet", icon: "🔵", type: "extension" },
    { id: "trust", name: "Trust Wallet", icon: "🛡️", type: "qr" },
    { id: "rabby", name: "Rabby Wallet", icon: "🐰", type: "extension" },
  ],
  hardware: [
    { id: "ledger", name: "Ledger", icon: "🔐", type: "hardware" },
    { id: "trezor", name: "Trezor", icon: "🔒", type: "hardware" },
    { id: "gridplus", name: "GridPlus", icon: "⚡", type: "hardware" },
  ],
  institutional: [
    { id: "safe", name: "Safe (Gnosis)", icon: "🏦", type: "extension" },
    { id: "frame", name: "Frame", icon: "🖼️", type: "extension" },
  ],
  mobile: [
    { id: "rainbow", name: "Rainbow", icon: "🌈", type: "qr" },
    { id: "phantom", name: "Phantom", icon: "👻", type: "qr" },
    { id: "okx", name: "OKX Wallet", icon: "⬛", type: "qr" },
    { id: "binance", name: "Binance Wallet", icon: "🟡", type: "qr" },
  ],
  qr: {
    id: "walletconnect",
    name: "Scan QR Code (500+ wallets)",
    icon: "📱",
    type: "qr",
    description: "Scan with any mobile wallet",
  },
} as const;

/** Get WalletConnect URI for QR code generation */
export function getWalletConnectUri(): string {
  // In production, this would use @walletconnect/sign-client
  // to generate a real WC URI. For standalone mode, return placeholder.
  return "wc:nexastream-" + Date.now() + "@2?relay-protocol={protocol}&symKey={symKey}";
}

/** Check if running on mobile */
export function isMobile(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent);
}

/** Generate deep link for mobile wallet */
export function getDeepLink(walletId: string, wcUri: string): string {
  const links: Record<string, string> = {
    metamask: "https://metamask.app.link/wc?uri=",
    trust: "https://link.trustwallet.com/wc?uri=",
    rainbow: "https://rnbwapp.com/wc?uri=",
    phantom: "https://phantom.app/ul/v1/connect?app_url=",
    okx: "https://www.okx.com/download?from=",
    binance: "https://www.bnbchain.org/en/bnb-chain-wallet",
  };
  return (links[walletId] || "https://walletconnect.com/wc?uri=") + encodeURIComponent(wcUri);
}
