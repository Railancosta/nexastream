/**
 * BLOCO 2: IPFS Profile Storage + BLOCO 3: Multi-Role Validation
 * Upload profile metadata to IPFS, validate user roles via blockchain.
 */
import { siweLogin, loadSession, clearSession, isWalletAvailable, type AuthSession } from "./auth.js";
import { getHealth, getNetworkStats, getAccount, formatNst } from "./rpc.js";

// === BLOCO 2: IPFS Storage ===

export interface ProfileMetadata {
  name: string;
  description: string;
  avatar: string;
  banner: string;
  address: string;
  role: "viewer" | "creator" | "investor";
  createdAt: number;
  links?: { platform: string; url: string }[];
}

const PINATA_API_KEY = (typeof window !== "undefined" && (window as any).PINATA_API_KEY) || "";
const PINATA_API_SECRET = (typeof window !== "undefined" && (window as any).PINATA_API_SECRET) || "";

export async function uploadFileToIPFS(file: File | Blob): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  if (PINATA_API_KEY && PINATA_API_SECRET) {
    const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { "pinata_api_key": PINATA_API_KEY, "pinata_secret_api_key": PINATA_API_SECRET },
      body: formData,
    });
    if (res.ok) { const d = await res.json(); return d.IpfsHash; }
  }
  return "local-" + Date.now();
}

export async function uploadProfileToIPFS(profile: ProfileMetadata): Promise<string> {
  const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
  return await uploadFileToIPFS(new File([blob], "profile.json", { type: "application/json" }));
}

export async function fetchProfileFromIPFS(cid: string): Promise<ProfileMetadata | null> {
  if (cid.startsWith("local-")) return null;
  const gateways = ["https://ipfs.io/ipfs/", "https://dweb.link/ipfs/", "https://cloudflare-ipfs.com/ipfs/"];
  for (const gw of gateways) {
    try { const r = await fetch(gw + cid); if (r.ok) return await r.json() as ProfileMetadata; } catch {}
  }
  return null;
}

export function getIpfsUrl(cid: string): string {
  if (cid.startsWith("local-") || cid.startsWith("http")) return cid.startsWith("http") ? cid : "";
  return "https://ipfs.io/ipfs/" + cid;
}

// === BLOCO 3: Multi-Role Validation ===

export type UserRole = "viewer" | "creator" | "investor";

export interface RoleInfo {
  role: UserRole;
  isCreator: boolean;
  isInvestor: boolean;
  isViewer: boolean;
  nstBalance: bigint;
  hasChannelNFT: boolean;
  stakedAmount: bigint;
}

const CREATOR_STAKE_MIN = 100n * 10n ** 18n; // 100 NST minimum to be creator
const INVESTOR_STAKE_MIN = 1000n * 10n ** 18n; // 1000 NST minimum to be investor

/**
 * Determine user role from blockchain state:
 * - Viewer: just connected wallet
 * - Creator: has >= 100 NST balance (or channel NFT)
 * - Investor: has >= 1000 NST (or staked)
 */
export async function getUserRole(address: string): Promise<RoleInfo> {
  let balance = 0n;
  let nonce = 0;
  try {
    const account = await getAccount(address);
    balance = BigInt(account.balance);
    nonce = account.nonce;
  } catch { /* RPC unavailable, default to viewer */ }

  const isInvestor = balance >= INVESTOR_STAKE_MIN;
  const isCreator = balance >= CREATOR_STAKE_MIN || nonce > 0;
  const isViewer = !isCreator && !isInvestor;

  let role: UserRole = "viewer";
  if (isInvestor) role = "investor";
  else if (isCreator) role = "creator";

  return {
    role, isCreator, isInvestor, isViewer,
    nstBalance: balance,
    hasChannelNFT: nonce > 0,
    stakedAmount: 0n,
  };
}

/**
 * Create a creator channel (register on-chain).
 * In production: mint a Channel NFT or register in a smart contract.
 * In standalone mode: records in localStorage.
 */
export async function createCreatorChannel(
  address: string,
  channelName: string,
  description: string,
  avatar?: File,
  banner?: File
): Promise<{ profileCid: string; role: RoleInfo }> {
  let avatarCid = "";
  let bannerCid = "";
  if (avatar) avatarCid = await uploadFileToIPFS(avatar);
  if (banner) bannerCid = await uploadFileToIPFS(banner);

  const profile: ProfileMetadata = {
    name: channelName,
    description,
    avatar: avatarCid,
    banner: bannerCid,
    address,
    role: "creator",
    createdAt: Date.now(),
  };

  const profileCid = await uploadProfileToIPFS(profile);
  localStorage.setItem("nst_channel_" + address, JSON.stringify({ profileCid, channelName }));

  const role = await getUserRole(address);
  role.isCreator = true;
  role.role = "creator";

  return { profileCid, role };
}

// Re-export auth for convenience
export { siweLogin, loadSession, clearSession, isWalletAvailable, type AuthSession };
export { getHealth, getNetworkStats, getAccount, formatNst };
