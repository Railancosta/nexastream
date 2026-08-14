import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import supertest from "supertest";
import { createApp } from "../src/app.js";
import { UserService } from "../src/services/auth/user-service.js";
import { JwtTokenService } from "../src/services/auth/token-service.js";
import { PlatformService } from "../src/services/platform/platform-service.js";
import { LocalContentStorage } from "../src/storage/local-storage.js";
import { UploadManager } from "../src/services/upload-manager.js";
import type { ApiConfig } from "../src/config.js";
import { promises as fs } from "node:fs";

const TMP = "./.data-test-platform/uploads";
const STORE = "./.data-test-platform/storage";

const config: ApiConfig = {
  host: "127.0.0.1", port: 0, nodeEnv: "test",
  corsAllowedOrigins: ["http://localhost:3000"],
  jwtSecret: "test-secret-32-chars-minimum-padding-aaa",
  chunkSize: 4, maxUploadSize: 1024 * 1024, uploadTtlSeconds: 3600,
  uploadTempDir: TMP, storageDir: STORE,
};

let server: http.Server;
let request: supertest.SuperTest<supertest.Test>;
let accessToken: string;

beforeAll(async () => {
  await fs.rm("./.data-test-platform", { recursive: true, force: true });
  await fs.mkdir(TMP, { recursive: true });
  await fs.mkdir(STORE, { recursive: true });
  const storage = new LocalContentStorage(STORE);
  const uploads = new UploadManager({ tempDir: TMP, storage, ttlSeconds: config.uploadTtlSeconds, chunkSize: config.chunkSize, maxUploadSize: config.maxUploadSize });
  const users = new UserService();
  const tokens = new JwtTokenService(config.jwtSecret);
  const platform = new PlatformService();
  const app = createApp({ config, uploads, users, tokens, platform, isReady: async () => true });
  server = app.listen(0);
  request = supertest(app);
  const reg = await request.post("/api/v1/auth/register").send({ email: "platform@example.com", username: "platformuser", password: "supersecret123" });
  accessToken = reg.body.accessToken;
  });

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await fs.rm("./.data-test-platform", { recursive: true, force: true });
});


describe("Platform API — Module 4", () => {
  it("GET /api/v1/feed returns empty feed initially", async () => {
    const res = await request.get("/api/v1/feed");
    expect(res.status).toBe(200);
    expect(res.body.videos).toEqual([]);
  });

  it("likes are idempotent (rule 33)", async () => {
    const r1 = await request.post("/api/v1/videos/fake-id/like").set({ Authorization: "Bearer " + accessToken });
    expect(r1.body.liked).toBe(true);
    const r2 = await request.post("/api/v1/videos/fake-id/like").set({ Authorization: "Bearer " + accessToken });
    expect(r2.body.liked).toBe(false);
  });

  it("requires auth for likes", async () => {
    const res = await request.post("/api/v1/videos/fake-id/like");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/search returns results", async () => {
    const res = await request.get("/api/v1/search?q=test");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("videos");
  });

  it("POST /api/v1/videos/:id/comments creates a comment (rule 32)", async () => {
    const res = await request.post("/api/v1/videos/fake-id/comments").set({ Authorization: "Bearer " + accessToken }).send({ content: "Great video!" });
    expect(res.status).toBe(201);
    expect(res.body.content).toBe("Great video!");
  });

  it("rejects empty comments", async () => {
    const res = await request.post("/api/v1/videos/fake-id/comments").set({ Authorization: "Bearer " + accessToken }).send({ content: "" });
    expect(res.status).toBe(400);
  });

  it("GET /api/v1/videos/:id/comments returns comments", async () => {
    const res = await request.get("/api/v1/videos/fake-id/comments");
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThan(0);
  });

  it("requires auth for comments", async () => {
    const res = await request.post("/api/v1/videos/fake-id/comments").send({ content: "test" });
    expect(res.status).toBe(401);
  });

  it("DELETE /api/v1/comments/:id removes own comment", async () => {
    const c = await request.post("/api/v1/videos/vid-x/comments").set({ Authorization: "Bearer " + accessToken }).send({ content: "delete me" });
    const del = await request.delete(`/api/v1/comments/${c.body.id}`).set({ Authorization: "Bearer " + accessToken });
    expect(del.body.removed).toBe(true);
  });

  it("subscriptions are idempotent", async () => {
    const r1 = await request.post("/api/v1/subscriptions/creator-1").set({ Authorization: "Bearer " + accessToken });
    expect(r1.body.subscribed).toBe(true);
    const r2 = await request.post("/api/v1/subscriptions/creator-1").set({ Authorization: "Bearer " + accessToken });
    expect(r2.body.subscribed).toBe(false);
  });

  it("unsubscribe works", async () => {
    await request.post("/api/v1/subscriptions/creator-2").set({ Authorization: "Bearer " + accessToken });
    const res = await request.delete("/api/v1/subscriptions/creator-2").set({ Authorization: "Bearer " + accessToken });
    expect(res.body.unsubscribed).toBe(true);
  });

  it("GET /api/v1/videos/:id returns 404 for unknown", async () => {
    const res = await request.get("/api/v1/videos/nonexistent");
    expect(res.status).toBe(404);
  });
});

describe("PlatformService — unit tests", () => {
  it("feed ranks by recency + likes (rule 30)", () => {
    const svc = new PlatformService();
    const v1 = svc.publishVideo({ title: "old", description: "", contentHash: "h1", creatorId: "c1" });
    const v2 = svc.publishVideo({ title: "new", description: "", contentHash: "h2", creatorId: "c2" });
    svc.likeVideo("u1", v2.id);
    svc.likeVideo("u2", v2.id);
    svc.likeVideo("u3", v2.id);
    const feed = svc.getFeed(10);
    expect(feed[0].id).toBe(v2.id);
  });

  it("search is case-insensitive (rule 31)", () => {
    const svc = new PlatformService();
    svc.publishVideo({ title: "Bitcoin Explained", description: "crypto", contentHash: "h1", creatorId: "c1" });
    expect(svc.search("bitcoin").length).toBe(1);
    expect(svc.search("BITCOIN").length).toBe(1);
    expect(svc.search("nonexistent").length).toBe(0);
  });

  it("likes idempotent at service level (rule 33)", () => {
    const svc = new PlatformService();
    const v = svc.publishVideo({ title: "test", description: "", contentHash: "h", creatorId: "c" });
    expect(svc.likeVideo("u1", v.id)).toEqual({ liked: true });
    expect(svc.likeVideo("u1", v.id)).toEqual({ liked: false });
    expect(svc.getLikeCount(v.id)).toBe(1);
  });

  it("comment removal only by author (rule 32)", () => {
    const svc = new PlatformService();
    const c = svc.addComment("vid", "author-1", "hello");
    expect(svc.removeComment(c.id, "author-1")).toBe(true);
    expect(svc.removeComment(c.id, "author-2")).toBe(false);
  });

  it("subscriptions idempotent", () => {
    const svc = new PlatformService();
    expect(svc.subscribe("sub-1", "creator-1")).toEqual({ subscribed: true });
    expect(svc.subscribe("sub-1", "creator-1")).toEqual({ subscribed: false });
    expect(svc.getSubscriberCount("creator-1")).toBe(1);
    expect(svc.unsubscribe("sub-1", "creator-1")).toEqual({ unsubscribed: true });
    expect(svc.getSubscriberCount("creator-1")).toBe(0);
  });
});
