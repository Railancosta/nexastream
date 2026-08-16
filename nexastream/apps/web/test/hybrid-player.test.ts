import { describe, it, expect } from "vitest";
import {
  HybridPlayer,
  isMobileDevice,
  defaultP2PPolicy,
  type PlayerConfig,
} from "../src/lib/hybrid-player.js";

function makeConfig(p2pPolicy: PlayerConfig["p2pPolicy"]): PlayerConfig {
  return {
    apiBaseUrl: "http://localhost:4000",
    signalingUrl: "ws://localhost:4010",
    p2pPolicy,
    maxRetries: 3,
    fallbackToHttp: true,
  };
}

describe("P2P policy detection", () => {
  it("detects mobile user agents", () => {
    expect(isMobileDevice("Mozilla/5.0 (Android 14; Mobile)")).toBe(true);
    expect(isMobileDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17)")).toBe(true);
    expect(isMobileDevice("Mozilla/5.0 (X11; Linux x86_64)")).toBe(false);
  });

  it("defaults to disabled on mobile (battery/data conservation)", () => {
    expect(defaultP2PPolicy("Mozilla/5.0 (Android; Mobile)")).toBe("disabled");
  });

  it("defaults to receive-only on desktop", () => {
    expect(defaultP2PPolicy("Mozilla/5.0 (X11; Linux x86_64)")).toBe("receive-only");
  });
});

describe("HybridPlayer — source selection", () => {
  it("always uses HTTP when policy is disabled", () => {
    const player = new HybridPlayer(makeConfig("disabled"));
    expect(player.selectSource()).toBe("http");
    expect(player.isP2PActive()).toBe(false);
  });

  it("falls back to HTTP when P2P detection fails", async () => {
    const player = new HybridPlayer(makeConfig("receive-only"));
    const available = await player.detectP2P();
    expect(available).toBe(true);
    expect(player.selectSource()).toBe("p2p");
    expect(player.isP2PActive()).toBe(true);
  });

  it("fallbackToHttp switches back to HTTP", async () => {
    const player = new HybridPlayer(makeConfig("receive-only"));
    await player.detectP2P();
    player.selectSource();
    expect(player.getSource()).toBe("p2p");
    player.fallbackToHttp();
    expect(player.getSource()).toBe("http");
    expect(player.isP2PActive()).toBe(false);
  });

  it("detectP2P returns false when policy is disabled", async () => {
    const player = new HybridPlayer(makeConfig("disabled"));
    expect(await player.detectP2P()).toBe(false);
    expect(player.isP2PActive()).toBe(false);
  });

  it("receive-relay policy allows P2P", async () => {
    const player = new HybridPlayer(makeConfig("receive-relay"));
    const available = await player.detectP2P();
    expect(available).toBe(true);
    expect(player.selectSource()).toBe("p2p");
  });
});
