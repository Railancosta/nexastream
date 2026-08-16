/**
 * NexaStream Web3 Data Layer — reads directly from blockchain RPC.
 * No backend needed. Uses public RPC endpoints.
 */
const RPC_URL = (typeof window !== "undefined" && (window as any).NEXASTREAM_RPC) || "http://localhost:9001";

export interface BlockInfo { index: number; hash: string; validatorId: string; timestamp: number; txCount: number; }
export interface AccountInfo { address: string; balance: string; nonce: number; }
export interface NetworkStats { height: number; blockCount: number; totalSupply: string; maxSupply: string; validatorId: string; genesisHash: string; isSynced: boolean; }
export interface ExplorerData { chain: string; height: number; totalSupply: string; accounts: number; recentBlocks: Array<{ index: number; hash: string; validator: string; txs: number; time: string; }>; }

export async function getHealth(): Promise<{ status: string; height: number; synced: boolean; genesisHash: string }> {
  const res = await fetch(RPC_URL + "/health");
  if (!res.ok) throw new Error("RPC unavailable");
  return res.json();
}

export async function getNetworkStats(): Promise<NetworkStats> {
  const res = await fetch(RPC_URL + "/metrics");
  if (!res.ok) throw new Error("RPC unavailable");
  return res.json();
}

export async function getAccount(address: string): Promise<AccountInfo> {
  const res = await fetch(RPC_URL + "/balance/" + address);
  if (!res.ok) throw new Error("Account not found");
  return res.json();
}

export async function getBlocks(limit: number = 50): Promise<{ blocks: BlockInfo[]; count: number; height: number }> {
  const res = await fetch(RPC_URL + "/blocks?limit=" + limit);
  if (!res.ok) throw new Error("RPC unavailable");
  return res.json();
}

export async function getAccounts(): Promise<{ accounts: AccountInfo[]; totalSupply: string }> {
  const res = await fetch(RPC_URL + "/accounts");
  if (!res.ok) throw new Error("RPC unavailable");
  return res.json();
}

export async function getExplorer(): Promise<ExplorerData> {
  const res = await fetch(RPC_URL + "/explorer");
  if (!res.ok) throw new Error("RPC unavailable");
  return res.json();
}

export async function isRpcAvailable(): Promise<boolean> {
  try { return (await getHealth()).status === "ok"; } catch { return false; }
}

export function formatNst(balance: string): string {
  try {
    const big = BigInt(balance);
    const whole = big / 10n ** 18n;
    const fraction = big % 10n ** 18n;
    const fracStr = fraction.toString().padStart(18, "0").replace(/0+$/, "");
    return fracStr ? whole.toString() + "." + fracStr.slice(0, 4) : whole.toString();
  } catch { return "0"; }
}
