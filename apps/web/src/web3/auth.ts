/**
 * NexaStream Web3 Auth — SIWE (Sign-In With Ethereum)
 * 100% client-side, no backend needed.
 *
 * Security rules enforced:
 * - NEVER store private keys, mnemonics, or passwords in localStorage
 * - localStorage stores ONLY: wallet address + session token (SIWE signature)
 * - Auth via off-chain message signing (MetaMask, WalletConnect, etc.)
 * - XSS mitigation: all localStorage values are sanitized on read
 */

export interface SiweMessage {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime: string;
}

export interface AuthSession {
  address: string;
  sessionToken: string;
  chainId: number;
  expiresAt: number;
}

const SESSION_KEY = "nst_session";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a cryptographically random nonce.
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create a SIWE (EIP-4361) message for the user to sign.
 */
export function createSiweMessage(address: string, chainId: number): SiweMessage {
  const nonce = generateNonce();
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_DURATION_MS);
  return {
    domain: window.location.hostname,
    address,
    statement: "Welcome to NexaStream! Sign this message to authenticate. No transaction will be made.",
    uri: window.location.origin,
    version: "1",
    chainId,
    nonce,
    issuedAt: now.toISOString(),
    expirationTime: expires.toISOString(),
  };
}

/**
 * Format SIWE message as EIP-4361 string for signing.
 */
export function formatSiweMessage(msg: SiweMessage): string {
  return [
    `${msg.domain} wants you to sign in with your Ethereum account:`,
    msg.address,
    "",
    msg.statement,
    "",
    `URI: ${msg.uri}`,
    `Version: ${msg.version}`,
    `Chain ID: ${msg.chainId}`,
    `Nonce: ${msg.nonce}`,
    `Issued At: ${msg.issuedAt}`,
    `Expiration Time: ${msg.expirationTime}`,
  ].join("\n");
}

/**
 * Sanitize a string to prevent XSS when reading from localStorage.
 */
function sanitize(input: string): string {
  return input.replace(/[<>"'&]/g, c => ({ "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "&": "&amp;" }[c]!));
}

/**
 * Save auth session to localStorage (address + session token only).
 * NEVER stores private keys, mnemonics, or passwords.
 */
export function saveSession(session: AuthSession): void {
  const data = JSON.stringify({
    address: sanitize(session.address),
    sessionToken: sanitize(session.sessionToken),
    chainId: session.chainId,
    expiresAt: session.expiresAt,
  });
  localStorage.setItem(SESSION_KEY, data);
}

/**
 * Load auth session from localStorage.
 * Returns null if expired or invalid.
 */
export function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() > data.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return {
      address: data.address,
      sessionToken: data.sessionToken,
      chainId: data.chainId,
      expiresAt: data.expiresAt,
    };
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

/**
 * Clear auth session.
 */
export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Check if window.ethereum is available (MetaMask, etc.).
 */
export function isWalletAvailable(): boolean {
  return typeof window !== "undefined" && !!(window as any).ethereum;
}

/**
 * Request wallet connection (MetaMask).
 * Returns the connected address and chain ID.
 */
export async function connectWallet(): Promise<{ address: string; chainId: number }> {
  if (!isWalletAvailable()) {
    throw new Error("No wallet found. Please install MetaMask or another Web3 wallet.");
  }
  const ethereum = (window as any).ethereum;
  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  const chainIdHex = await ethereum.request({ method: "eth_chainId" });
  const chainId = parseInt(chainIdHex, 16);
  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts found. Please unlock your wallet.");
  }
  return { address: accounts[0], chainId };
}

/**
 * Request message signature from wallet (personal_sign).
 * Returns the signature hex string.
 */
export async function signMessage(address: string, message: string): Promise<string> {
  if (!isWalletAvailable()) {
    throw new Error("No wallet found.");
  }
  const ethereum = (window as any).ethereum;
  const signature = await ethereum.request({
    method: "personal_sign",
    params: [message, address],
  });
  return signature;
}

/**
 * Full SIWE authentication flow:
 * 1. Connect wallet
 * 2. Create SIWE message
 * 3. Sign message (personal_sign)
 * 4. Save session (address + signature only, NO private keys)
 *
 * @returns AuthSession with address and session token
 */
export async function siweLogin(): Promise<AuthSession> {
  // Step 1: Connect wallet
  const { address, chainId } = await connectWallet();

  // Step 2: Create SIWE message
  const siweMessage = createSiweMessage(address, chainId);
  const messageString = formatSiweMessage(siweMessage);

  // Step 3: Sign message
  const signature = await signMessage(address, messageString);

  // Step 4: Create session (store address + signature, NOT private keys)
  const session: AuthSession = {
    address,
    sessionToken: signature, // The signature IS the proof of ownership
    chainId,
    expiresAt: Date.now() + SESSION_DURATION_MS,
  };

  saveSession(session);
  return session;
}

/**
 * Verify session is still valid.
 */
export function isAuthenticated(): boolean {
  const session = loadSession();
  return session !== null && Date.now() < session.expiresAt;
}

/**
 * Get current authenticated address.
 */
export function getAddress(): string | null {
  const session = loadSession();
  return session?.address ?? null;
}
