/**
 * P2P distribution via WebTorrent/HLS-P2P.
 * Distributes video segments between viewers to reduce server bandwidth.
 *
 * Architecture (rule 27, 96):
 * - HTTP delivery as fallback (always available)
 * - P2P WebTorrent for segment distribution (when peers available)
 * - Hybrid: HTTP first -> P2P when available -> HTTP fallback
 */

export interface P2PSegmentInfo {
  index: number;
  url: string;
  hash: string;
  size: number;
  p2pAvailable: boolean;
}

export interface P2PDistributionStats {
  peersConnected: number;
  segmentsFromP2P: number;
  segmentsFromHTTP: number;
  p2pRatio: number;
  bandwidthSaved: number;
}

export class P2PDistribution {
  private readonly segments = new Map<number, P2PSegmentInfo>();
  private stats: P2PDistributionStats = {
    peersConnected: 0,
    segmentsFromP2P: 0,
    segmentsFromHTTP: 0,
    p2pRatio: 0,
    bandwidthSaved: 0,
  };

  registerSegment(index: number, url: string, hash: string, size: number): void {
    this.segments.set(index, { index, url, hash, size, p2pAvailable: false });
  }

  markP2PAvailable(index: number): void {
    const seg = this.segments.get(index);
    if (seg) seg.p2pAvailable = true;
  }

  selectSource(index: number): "p2p" | "http" {
    const seg = this.segments.get(index);
    if (!seg) return "http";
    if (seg.p2pAvailable) {
      this.stats.segmentsFromP2P++;
      this.stats.bandwidthSaved += seg.size;
    } else {
      this.stats.segmentsFromHTTP++;
    }
    this.updateRatio();
    return seg.p2pAvailable ? "p2p" : "http";
  }

  peerConnected(): void { this.stats.peersConnected++; }
  peerDisconnected(): void { if (this.stats.peersConnected > 0) this.stats.peersConnected--; }
  getStats(): P2PDistributionStats { return { ...this.stats }; }
  getP2PRatio(): number { return this.stats.p2pRatio; }
  getBandwidthSaved(): number { return this.stats.bandwidthSaved; }
  getSegments(): P2PSegmentInfo[] { return Array.from(this.segments.values()); }
  getSegmentCount(): number { return this.segments.size; }

  private updateRatio(): void {
    const total = this.stats.segmentsFromP2P + this.stats.segmentsFromHTTP;
    this.stats.p2pRatio = total > 0 ? this.stats.segmentsFromP2P / total : 0;
  }
}
