import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { promises as fs } from "node:fs";
import http from "node:http";
import express from "express";
import { createApp } from "../src/app.js";
import { UserService } from "../src/services/auth/user-service.js";
import { JwtTokenService } from "../src/services/auth/token-service.js";
import { PlatformService } from "../src/services/platform/platform-service.js";
import { LocalContentStorage } from "../src/storage/local-storage.js";
import { UploadManager } from "../src/services/upload-manager.js";
import type { ApiConfig } from "../src/config.js";
import supertest from "supertest";

const TMP = "./.data-test-api/uploads";
const STORE = "./.data-test-api/storage";

const config: ApiConfig = {
  host: "127.0.0.1",
  port: 0,
  nodeEnv: "test",
  corsAllowedOrigins: ["http://localhost:3000"],
  jwtSecret: "test-secret-32-chars-minimum-padding-aaa",
  chunkSize: 4,
  maxUploadSize: 1024 * 1024,
  uploadTtlSeconds: 3600,
  uploadTempDir: TMP,
  storageDir: STORE,
};

let server: http.Server;
let request: supertest.SuperTest<supertest.Test>;

beforeAll(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
  await fs.rm(STORE, { recursive: true, force: true });
  await fs.mkdir(TMP, { recursive: true });
  await fs.mkdir(STORE, { recursive: true });
  const storage = new LocalContentStorage(STORE);
  const uploads = new UploadManager({
    tempDir: TMP,
    storage,
    ttlSeconds: config.uploadTtlSeconds,
    chunkSize: config.chunkSize,
    maxUploadSize: config.maxUploadSize,
  });
  const users = new UserService();
  const tokens = new JwtTokenService(config.jwtSecret);
  const platform = new PlatformService();
  const app = createApp({ config, uploads, users, tokens, platform, isReady: async () => true });
  server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("listen failed");
  request = supertest(app);
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await fs.rm(TMP, { recursive: true, force: true });
  await fs.rm(STORE, { recursive: true, force: true });
});

describe("API v1 — HTTP integration", () => {
  it("GET /api/v1/health returns ok", async () => {
    const res = await request.get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("nexastream-api");
  });

  it("GET /api/v1/version returns version", async () => {
    const res = await request.get("/api/v1/version");
    expect(res.status).toBe(200);
    expect(res.body.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("POST /api/v1/uploads requires auth", async () => {
    const res = await request.post("/api/v1/uploads").send({
      filename: "v.mp4",
      mimeType: "video/mp4",
      declaredSize: 8,
    });
    expect(res.status).toBe(401);
  });

  it("full resumable upload flow: init -> chunks -> complete", async () => {
    const init = await request
      .post("/api/v1/uploads")
      .set("x-user-id", "user-1")
      .send({ filename: "v.mp4", mimeType: "video/mp4", declaredSize: 8 });
    expect(init.status).toBe(201);
    const uploadId = init.body.uploadId;

    const c0 = await request
      .put(`/api/v1/uploads/${uploadId}/chunks/0`)
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from("abcd"));
    expect(c0.status).toBe(200);
    expect(c0.body.accepted).toBe(true);

    const c1 = await request
      .put(`/api/v1/uploads/${uploadId}/chunks/1`)
      .set("Content-Type", "application/octet-stream")
      .send(Buffer.from("efgh"));
    expect(c1.status).toBe(200);

    const status = await request.get(`/api/v1/uploads/${uploadId}`);
    expect(status.status).toBe(200);
    expect(status.body.acceptedIndices).toEqual([0, 1]);

    const complete = await request.post(`/api/v1/uploads/${uploadId}/complete`);
    expect(complete.status).toBe(200);
    expect(complete.body.status).toBe("completed");
    expect(complete.body.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(complete.body.size).toBe(8);
  });

  it("rejects invalid mimeType", async () => {
    const res = await request
      .post("/api/v1/uploads")
      .set("x-user-id", "user-1")
      .send({ filename: "v.exe", mimeType: "application/x-msdownload", declaredSize: 8 });
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown upload status", async () => {
    const res = await request.get("/api/v1/uploads/does-not-exist");
    expect(res.status).toBe(404);
  });
});
