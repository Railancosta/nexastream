import { describe, it, expect } from "vitest";
import { P2PDistribution } from "../src/services/distribution/p2p-distribution.js";

describe("P2PDistribution — WebTorrent/HLS-P2P", () => {
  it("registers segments", () => {
    const dist = new P2PDistribution();
    dist.registerSegment(0, "https://cdn/seg0.ts", "hash0", 1000000);
    dist.registerSegment(1, "https://cdn/seg1.ts", "hash1", 2000000);
    expect(dist.getSegmentCount()).toBe(2);
  });

  it("selects HTTP when no peers available (fallback rule 27)", () => {
    const dist = new P2PDistribution();
    dist.registerSegment(0, "https://cdn/seg0.ts", "hash0", 1000000);
    expect(dist.selectSource(0)).toBe("http");
  });

  it("selects P2P when peer has segment", () => {
    const dist = new P2PDistribution();
    dist.registerSegment(0, "https://cdn/seg0.ts", "hash0", 1000000);
    dist.markP2PAvailable(0);
    expect(dist.selectSource(0)).toBe("p2p");
  });

  it("tracks bandwidth saved by P2P", () => {
    const dist = new P2PDistribution();
    dist.registerSegment(0, "url0", "hash0", 1000000);
    dist.registerSegment(1, "url1", "hash1", 2000000);
    dist.markP2PAvailable(0);
    dist.markP2PAvailable(1);
    dist.selectSource(0);
    dist.selectSource(1);
    expect(dist.getBandwidthSaved()).toBe(3000000);
  });

  it("tracks P2P ratio", () => {
    const dist = new P2PDistribution();
    dist.registerSegment(0, "url0", "hash0", 100);
    dist.registerSegment(1, "url1", "hash1", 100);
    dist.registerSegment(2, "url2", "hash2", 100);
    dist.markP2PAvailable(0);
    dist.markP2PAvailable(1);
    dist.selectSource(0);
    dist.selectSource(1);
    dist.selectSource(2);
    expect(dist.getP2PRatio()).toBeCloseTo(0.667, 1);
  });

  it("tracks peer connections", () => {
    const dist = new P2PDistribution();
    dist.peerConnected();
    dist.peerConnected();
    dist.peerConnected();
    expect(dist.getStats().peersConnected).toBe(3);
    dist.peerDisconnected();
    expect(dist.getStats().peersConnected).toBe(2);
  });

  it("returns http for unknown segment", () => {
    const dist = new P2PDistribution();
    expect(dist.selectSource(999)).toBe("http");
  });
});
