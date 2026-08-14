/**
 * useUniversalWallet Hook — Universal Web3 Wallet Connection
 * EIP-6963 + WalletConnect v2 + SIWE auth flow
 *
 * Flow: connect → sign SIWE → save session → determine role
 */
import { initEIP6963, getProviders, type EIP6963AnnounceProvider } from "./eip6963.js";
import { CHAINS, WALLET_CATEGORIES, isMobile, getDeepLink, getWalletConnectUri } from "./wagmi-config.js";
import { createSiweMessage, formatSiweMessage, saveSession, loadSession, clearSession, type AuthSession } from "./auth.js";
import { getUserRole, type RoleInfo } from "./profile.js";

export interface WalletOption {
  id: string;
  name: string;
  icon: string;
  type: "extension" | "qr" | "hardware";
  category: "popular" | "hardware" | "institutional" | "mobile" | "qr";
  installed: boolean;
  provider?: any;
}

export interface ConnectionState {
  address: string | null;
  chainId: number | null;
  walletType: string | null;
  isConnecting: boolean;
  session: AuthSession | null;
  role: RoleInfo | null;
}

let state: ConnectionState = {
  address: null, chainId: null, walletType: null,
  isConnecting: false, session: null, role: null,
};

const listeners: (() => void)[] = [];
function notify() { listeners.forEach(l => l()); }
export function subscribe(fn: () => void) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; }
export function getState() { return state; }

/** Get all wallet options (EIP-6963 detected + WalletConnect QR) */
export async function getWalletOptions(): Promise<WalletOption[]> {
  const eip6963Providers = await initEIP6963();
  const installedNames = eip6963Providers.map(p => p.info.name.toLowerCase());
  const options: WalletOption[] = [];

  // Popular wallets
  for (const w of WALLET_CATEGORIES.popular) {
    const installed = eip6963Providers.find(p => p.info.name.toLowerCase().includes(w.id)) || installedNames.some(n => n.includes(w.id));
    options.push({ ...w, category: "popular", installed: !!installed, provider: installed?.provider });
  }
  // Hardware wallets (always available, connect via WalletConnect)
  for (const w of WALLET_CATEGORIES.hardware) {
    options.push({ ...w, category: "hardware", installed: true });
  }
  // Institutional
  for (const w of WALLET_CATEGORIES.institutional) {
    const installed = eip6963Providers.find(p => p.info.name.toLowerCase().includes(w.id));
    options.push({ ...w, category: "institutional", installed: !!installed, provider: installed?.provider });
  }
  // Mobile (QR)
  for (const w of WALLET_CATEGORIES.mobile) {
    options.push({ ...w, category: "mobile", installed: true });
  }
  // QR (500+ wallets)
  options.push({ ...WALLET_CATEGORIES.qr, category: "qr", installed: true });

  return options;
}

/** Connect to a wallet and trigger SIWE auth */
export async function connectAndAuth(walletId: string): Promise<void> {
  state = { ...state, isConnecting: true };
  notify();

  try {
    const options = await getWalletOptions();
    const option = options.find(o => o.id === walletId);
    if (!option) throw new Error("Wallet not found");

    let address: string;
    let chainId: number;
    let provider: any;

    if (option.type === "extension" && option.provider) {
      // EIP-6963 injected provider
      const accounts = await option.provider.request({ method: "eth_requestAccounts" });
      const chainIdHex = await option.provider.request({ method: "eth_chainId" });
      address = accounts[0];
      chainId = parseInt(chainIdHex, 16);
      provider = option.provider;
    } else if (option.type === "qr") {
      // WalletConnect QR — generate URI and show QR
      const wcUri = getWalletConnectUri();
      if (isMobile()) {
        // Mobile: deep link to wallet app
        window.location.href = getDeepLink(walletId, wcUri);
        return; // User returns after signing in their wallet app
      }
      // Desktop: show QR code (UI handles this)
      throw new Error("QR_DISPLAY:" + wcUri);
    } else if (option.type === "hardware") {
      // Hardware wallets connect via WalletConnect bridge
      const wcUri = getWalletConnectUri();
      throw new Error("QR_DISPLAY:" + wcUri);
    } else {
      // Fallback: try window.ethereum
      const eth = (window as any).ethereum;
      if (!eth) throw new Error("No wallet found");
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      const chainIdHex = await eth.request({ method: "eth_chainId" });
      address = accounts[0];
      chainId = parseInt(chainIdHex, 16);
      provider = eth;
    }

    // SIWE: sign message to prove ownership
    const siweMsg = createSiweMessage(address, chainId);
    const msgStr = formatSiweMessage(siweMsg);
    const signature = await provider.request({
      method: "personal_sign",
      params: [msgStr, address],
    });

    // Save session (address + signature, NO private keys)
    const session: AuthSession = {
      address, sessionToken: signature, chainId,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };
    saveSession(session);

    // Determine role from blockchain
    const role = await getUserRole(address);

    state = { address, chainId, walletType: walletId, isConnecting: false, session, role };
    notify();
  } catch (err: any) {
    state = { ...state, isConnecting: false };
    notify();
    throw err;
  }
}

/** Disconnect wallet */
export function disconnect() {
  clearSession();
  state = { address: null, chainId: null, walletType: null, isConnecting: false, session: null, role: null };
  notify();
}

/** Restore session from localStorage on page load */
export function restoreSession() {
  const session = loadSession();
  if (session) {
    state = { ...state, address: session.address, chainId: session.chainId, session };
    notify();
    // Refresh role
    getUserRole(session.address).then(role => {
      state = { ...state, role };
      notify();
    }).catch(() => {});
  }
}
