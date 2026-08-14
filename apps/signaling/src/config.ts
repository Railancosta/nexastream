export interface SignalingConfig {
  readonly host: string;
  readonly port: number;
  readonly maxMessageBytes: number;
  readonly maxPeersPerRoom: number;
  readonly peerTimeoutSeconds: number;
  readonly stunUrl: string;
  readonly turnUrl?: string;
  readonly turnUsername?: string;
  readonly turnCredential?: string;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`missing required env var: ${name}`);
  }
  return v.trim();
}

function optional(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

function int(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(n) || n <= 0) {
    throw new Error(`${name} must be a positive integer, got: ${raw}`);
  }
  return n;
}

export function loadConfig(): SignalingConfig {
  return {
    host: process.env.SIGNALING_HOST ?? "0.0.0.0",
    port: int("SIGNALING_PORT", 4010),
    maxMessageBytes: int("SIGNALING_MAX_MESSAGE_BYTES", 65536),
    maxPeersPerRoom: int("SIGNALING_MAX_PEERS_PER_ROOM", 8),
    peerTimeoutSeconds: int("SIGNALING_PEER_TIMEOUT_SECONDS", 60),
    stunUrl: process.env.STUN_URL ?? "stun:stun.l.google.com:19302",
    turnUrl: optional("TURN_URL"),
    turnUsername: optional("TURN_USERNAME"),
    turnCredential: optional("TURN_CREDENTIAL"),
  };
}

// Throws explicitly when a critical var is missing — but signaling has no
// hard-required secret at startup; TURN is optional. Kept for parity with
// the "fail explicitly" rule when used by callers expecting required().
void required;
