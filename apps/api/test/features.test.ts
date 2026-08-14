import { describe, it, expect } from "vitest";
import { WalletService } from "../src/services/web3/wallet-service.js";
import { DaoService } from "../src/services/dao/dao-service.js";
import { NftService } from "../src/services/nft/nft-service.js";
import { RecommendationService } from "../src/services/recommendation/recommendation-service.js";

describe("WalletService — Web3 login", () => {
  it("validates wallet address format", () => {
    const ws = new WalletService();
    expect(ws.verifyWallet({ address: "0x" + "a".repeat(40), timestamp: Date.now(), signature: "x".repeat(65) })).toBe(true);
    expect(ws.verifyWallet({ address: "invalid", timestamp: Date.now(), signature: "x".repeat(65) })).toBe(false);
    expect(ws.verifyWallet({ address: "0x" + "a".repeat(40), timestamp: Date.now(), signature: "short" })).toBe(false);
  });

  it("rejects expired timestamps", () => {
    const ws = new WalletService();
    expect(ws.verifyWallet({ address: "0x" + "a".repeat(40), timestamp: Date.now() - 400000, signature: "x".repeat(65) })).toBe(false);
  });

  it("generates nonce and login message", () => {
    const ws = new WalletService();
    const nonce = ws.generateNonce("0x" + "a".repeat(40));
    expect(nonce).toMatch(/^[0-9a-f]{64}$/);
    const msg = ws.createLoginMessage("0x" + "a".repeat(40), nonce);
    expect(msg).toContain("Welcome to NexaStream");
    expect(msg).toContain(nonce);
  });
});

describe("DaoService — governance", () => {
  it("creates proposals", () => {
    const dao = new DaoService();
    const p = dao.createProposal({ type: "parameter_change", title: "Change block reward", description: "Increase to 100 NST", proposer: "alice", votingPeriodMs: 86400000 });
    expect(p.id).toBeTruthy();
    expect(p.status).toBe("active");
    expect(dao.getProposalCount()).toBe(1);
  });

  it("votes on proposals", () => {
    const dao = new DaoService();
    const p = dao.createProposal({ type: "treasury", title: "Fund marketing", description: "Use 1000 NST", proposer: "bob", votingPeriodMs: 1000 });
    dao.vote(p.id, "voter1", "for", 100);
    dao.vote(p.id, "voter2", "against", 50);
    expect(p.forVotes).toBe(100);
    expect(p.againstVotes).toBe(50);
  });

  it("prevents double voting", () => {
    const dao = new DaoService();
    const p = dao.createProposal({ type: "community", title: "Test", description: "Test", proposer: "bob", votingPeriodMs: 1000 });
    dao.vote(p.id, "voter1", "for", 100);
    expect(() => dao.vote(p.id, "voter1", "for", 100)).toThrow("already voted");
  });

  it("finalizes and executes passed proposals", async () => {
    const dao = new DaoService();
    const p = dao.createProposal({ type: "upgrade", title: "Upgrade consensus", description: "v2", proposer: "alice", votingPeriodMs: 100 });
    dao.vote(p.id, "v1", "for", 100);
    dao.vote(p.id, "v2", "against", 30);
    await new Promise(r => setTimeout(r, 150));
    const finalized = dao.finalizeProposal(p.id);
    expect(finalized.status).toBe("passed");
    const executed = dao.executeProposal(p.id);
    expect(executed.status).toBe("executed");
    expect(executed.executed).toBe(true);
  });

  it("rejects proposals with more against votes", async () => {
    const dao = new DaoService();
    const p = dao.createProposal({ type: "community", title: "Bad proposal", description: "No", proposer: "bob", votingPeriodMs: 100 });
    dao.vote(p.id, "v1", "against", 100);
    dao.vote(p.id, "v2", "for", 30);
    await new Promise(r => setTimeout(r, 150));
    expect(dao.finalizeProposal(p.id).status).toBe("rejected");
  });
});

describe("NftService — video NFTs", () => {
  it("mints video as NFT", () => {
    const nft = new NftService();
    const n = nft.mint({ videoHash: "a".repeat(64), title: "My Video", creator: "alice" });
    expect(n.tokenId).toBe(1);
    expect(n.owner).toBe("alice");
    expect(n.transferCount).toBe(0);
  });

  it("prevents double minting same content", () => {
    const nft = new NftService();
    nft.mint({ videoHash: "b".repeat(64), title: "Video", creator: "alice" });
    expect(() => nft.mint({ videoHash: "b".repeat(64), title: "Video", creator: "bob" })).toThrow("already minted");
  });

  it("transfers NFT ownership", () => {
    const nft = new NftService();
    const n = nft.mint({ videoHash: "c".repeat(64), title: "Video", creator: "alice" });
    nft.transfer(n.id, "alice", "bob");
    expect(n.owner).toBe("bob");
    expect(n.transferCount).toBe(1);
  });

  it("rejects transfer from non-owner", () => {
    const nft = new NftService();
    const n = nft.mint({ videoHash: "d".repeat(64), title: "Video", creator: "alice" });
    expect(() => nft.transfer(n.id, "bob", "charlie")).toThrow("not owner");
  });

  it("queries NFTs by owner and creator", () => {
    const nft = new NftService();
    nft.mint({ videoHash: "e".repeat(64), title: "V1", creator: "alice" });
    nft.mint({ videoHash: "f".repeat(64), title: "V2", creator: "alice" });
    expect(nft.getNftsByCreator("alice").length).toBe(2);
    expect(nft.getNftsByOwner("alice").length).toBe(2);
  });

  it("looks up NFT by video hash", () => {
    const nft = new NftService();
    const n = nft.mint({ videoHash: "g".repeat(64), title: "V", creator: "alice" });
    const found = nft.getNftByVideoHash("g".repeat(64));
    expect(found?.id).toBe(n.id);
  });
});

describe("RecommendationService — AI feed", () => {
  it("records views with watch time and completion", () => {
    const rec = new RecommendationService();
    rec.recordView("v1", 30000, true);
    rec.recordView("v1", 60000, false);
    const m = rec.getMetrics("v1");
    expect(m?.views).toBe(2);
    expect(m?.watchTimeMs).toBe(90000);
    expect(m?.completions).toBe(1);
  });

  it("ranks videos by engagement score", () => {
    const rec = new RecommendationService();
    const videos = [
      { videoId: "v1", views: 100, likes: 80, comments: 20, watchTimeMs: 5000000, completions: 70, createdAt: Date.now(), creatorId: "alice" },
      { videoId: "v2", views: 100, likes: 10, comments: 5, watchTimeMs: 1000000, completions: 10, createdAt: Date.now(), creatorId: "bob" },
    ];
    const ranked = rec.getRecommendations("user1", videos, 2);
    expect(ranked[0].videoId).toBe("v1"); // higher engagement
  });

  it("boosts liked creators", () => {
    const rec = new RecommendationService();
    rec.setUserPreference("user1", { likedCreators: new Set(["alice"]) } as any);
    const videos = [
      { videoId: "v1", views: 50, likes: 10, comments: 5, watchTimeMs: 1000000, completions: 10, createdAt: Date.now() - 100000, creatorId: "alice" },
      { videoId: "v2", views: 50, likes: 10, comments: 5, watchTimeMs: 1000000, completions: 10, createdAt: Date.now() - 100000, creatorId: "bob" },
    ];
    const ranked = rec.getRecommendations("user1", videos, 2);
    expect(ranked[0].creatorId).toBe("alice"); // boosted
  });

  it("penalizes already-watched videos", () => {
    const rec = new RecommendationService();
    rec.setUserPreference("user1", { watchedVideos: new Set(["v1"]) } as any);
    const videos = [
      { videoId: "v1", views: 100, likes: 50, comments: 20, watchTimeMs: 5000000, completions: 70, createdAt: Date.now(), creatorId: "alice" },
      { videoId: "v2", views: 50, likes: 10, comments: 5, watchTimeMs: 1000000, completions: 10, createdAt: Date.now(), creatorId: "bob" },
    ];
    const ranked = rec.getRecommendations("user1", videos, 2);
    expect(ranked[0].videoId).toBe("v2"); // v1 penalized
  });

  it("getTrending returns top engagement", () => {
    const rec = new RecommendationService();
    const videos = [
      { videoId: "v1", views: 1000, likes: 500, comments: 100, watchTimeMs: 50000000, completions: 700, createdAt: Date.now(), creatorId: "alice" },
      { videoId: "v2", views: 10, likes: 1, comments: 0, watchTimeMs: 50000, completions: 1, createdAt: Date.now(), creatorId: "bob" },
    ];
    const trending = rec.getTrending(videos, 1);
    expect(trending[0].videoId).toBe("v1");
  });
});
