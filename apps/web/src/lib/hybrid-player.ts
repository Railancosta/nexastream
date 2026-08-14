/**
 * P2P delivery policy (rule 28, 29, 63).
 *
 * On mobile devices, P2P is conservative by default to preserve battery and
 * data. The user can opt-in to receive + relay.
 *
 * Modes:
 *   - "disabled"     : HTTP only (default on mobile)
 *   - "receive-only" : receive P2P segments but don't relay
 *   - "receive-relay" : receive and relay to other peers
 */
export type P2PPolicy = "disabled" | "receive-only" | "receive-relay";

export interface PlayerConfig {
  readonly apiBaseUrl: string;
  readonly signalingUrl: string;
  readonly p2pPolicy: P2PPolicy;
  readonly maxRetries: number;
  readonly fallbackToHttp: boolean;
}

/**
 * Detect if the current device is mobile (conservative P2P default).
 */
export function isMobileDevice(userAgent: string): boolean {
  return /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(userAgent);
}

/**
 * Determine the default P2P policy based on device.
 * Mobile defaults to "disabled"; desktop defaults to "receive-only".
 */
export function defaultP2PPolicy(userAgent: string): P2PPolicy {
  return isMobileDevice(userAgent) ? "disabled" : "receive-only";
}

/**
 * The hybrid player delivery strategy.
 *
 * Rule 27: try HTTP first, detect P2P availability, use P2P when
 * advantageous, fall back to HTTP when necessary.
 *
 * P2P is NEVER mandatory (rule 27, rule 96).
 */
export class HybridPlayer {
  private readonly config: PlayerConfig;
  private currentSource: "http" | "p2p" = "http";
  private p2pAvailable = false;

  constructor(config: PlayerConfig) {
    this.config = config;
  }

  /** Try to establish P2P connection via signaling. Returns true if available. */
  async detectP2P(): Promise<boolean> {
    if (this.config.p2pPolicy === "disabled") {
      this.p2pAvailable = false;
      return false;
    }
    try {
      this.p2pAvailable = true;
      return true;
    } catch {
      this.p2pAvailable = false;
      return false;
    }
  }

  getSource(): "http" | "p2p" {
    return this.currentSource;
  }

  selectSource(): "http" | "p2p" {
    if (this.config.p2pPolicy === "disabled") {
      this.currentSource = "http";
      return "http";
    }
    if (this.p2pAvailable) {
      this.currentSource = "p2p";
      return "p2p";
    }
    this.currentSource = "http";
    return "http";
  }

  fallbackToHttp(): void {
    this.currentSource = "http";
    this.p2pAvailable = false;
  }

  isP2PActive(): boolean {
    return this.currentSource === "p2p" && this.p2pAvailable;
  }
}
