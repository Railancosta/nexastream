import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import express from "express";
import supertest from "supertest";
import { createApp } from "../src/app.js";
import { UserService } from "../src/services/auth/user-service.js";
import { JwtTokenService } from "../src/services/auth/token-service.js";
import { LocalContentStorage } from "../src/storage/local-storage.js";
import { UploadManager } from "../src/services/upload-manager.js";
import type { ApiConfig } from "../src/config.js";
import { promises as fs } from "node:fs";

const TMP = "./.data-test-auth/uploads";
const STORE = "./.data-test-auth/storage";

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
  await fs.rm("./.data-test-auth", { recursive: true, force: true });
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
  const app = createApp({ config, uploads, users, tokens, isReady: async () => true });
  server = app.listen(0);
  request = supertest(app);
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await fs.rm("./.data-test-auth", { recursive: true, force: true });
});

describe("Auth API — /api/v1/auth", () => {
  it("registers a new user and returns tokens", async () => {
    const res = await request.post("/api/v1/auth/register").send({
      email: "test@example.com",
      username: "testuser",
      password: "supersecret123",
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe("test@example.com");
    expect(res.body.user.role).toBe("user");
    expect(res.body.accessToken).toMatch(/^eyJ/);
    expect(res.body.refreshToken).toBeTruthy();
  });

  it("rejects duplicate email", async () => {
    const res = await request.post("/api/v1/auth/register").send({
      email: "test@example.com",
      username: "otheruser",
      password: "supersecret123",
    });
    expect(res.status).toBe(409);
  });

  it("rejects duplicate username", async () => {
    const res = await request.post("/api/v1/auth/register").send({
      email: "other@example.com",
      username: "testuser",
      password: "supersecret123",
    });
    expect(res.status).toBe(409);
  });

  it("rejects short password", async () => {
    const res = await request.post("/api/v1/auth/register").send({
      email: "short@example.com",
      username: "shortuser",
      password: "123",
    });
    expect(res.status).toBe(400);
  });

  it("rejects invalid email", async () => {
    const res = await request.post("/api/v1/auth/register").send({
      email: "not-an-email",
      username: "validuser",
      password: "supersecret123",
    });
    expect(res.status).toBe(400);
  });

  it("logs in with correct credentials", async () => {
    const res = await request.post("/api/v1/auth/login").send({
      email: "test@example.com",
      password: "supersecret123",
    });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toMatch(/^eyJ/);
  });

  it("rejects login with wrong password", async () => {
    const res = await request.post("/api/v1/auth/login").send({
      email: "test@example.com",
      password: "wrongpassword999",
    });
    expect(res.status).toBe(401);
  });

  it("rejects login with non-existent email", async () => {
    const res = await request.post("/api/v1/auth/login").send({
      email: "ghost@example.com",
      password: "supersecret123",
    });
    expect(res.status).toBe(401);
  });

  it("refresh endpoint accepts a token", async () => {
    const res = await request.post("/api/v1/auth/refresh").send({
      refreshToken: "some-refresh-token",
    });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("refresh endpoint rejects missing token", async () => {
    const res = await request.post("/api/v1/auth/refresh").send({});
    expect(res.status).toBe(400);
  });

  it("logout returns ok", async () => {
    const res = await request.post("/api/v1/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

describe("JWT token service", () => {
  it("issues and verifies a token", () => {
    const svc = new JwtTokenService("secret-at-least-32-characters-long-aaa");
    const token = svc.issueAccessToken({ id: "u1", email: "a@b.com", role: "user" });
    const payload = svc.verifyAccessToken(token);
    expect(payload.sub).toBe("u1");
    expect(payload.email).toBe("a@b.com");
    expect(payload.role).toBe("user");
  });

  it("rejects an invalid token", () => {
    const svc = new JwtTokenService("secret-at-least-32-characters-long-aaa");
    expect(() => svc.verifyAccessToken("invalid")).toThrow();
  });

  it("rejects a token signed with a different secret", () => {
    const svc1 = new JwtTokenService("secret-at-least-32-characters-long-aaa");
    const svc2 = new JwtTokenService("different-secret-32-chars-minimum-bbb");
    const token = svc1.issueAccessToken({ id: "u1", email: "a@b.com", role: "user" });
    expect(() => svc2.verifyAccessToken(token)).toThrow();
  });

  it("generates high-entropy refresh tokens with hash", () => {
    const svc = new JwtTokenService("secret-at-least-32-characters-long-aaa");
    const { token, hash } = svc.issueRefreshToken();
    expect(token.length).toBeGreaterThanOrEqual(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(svc.hashToken(token)).toBe(hash);
  });
});

describe("User service — bcrypt", () => {
  it("hashes passwords (never plaintext)", async () => {
    const svc = new UserService();
    const user = await svc.register("bcrypt@example.com", "bcryptuser", "password123");
    expect(user.email).toBe("bcrypt@example.com");
    // Verify password is not in the user record.
    expect(JSON.stringify(user)).not.toContain("password123");
  });

  it("verifies correct password", async () => {
    const svc = new UserService();
    await svc.register("verify@example.com", "verifyuser", "mypassword123");
    const user = await svc.verify("verify@example.com", "mypassword123");
    expect(user.email).toBe("verify@example.com");
  });

  it("rejects wrong password", async () => {
    const svc = new UserService();
    await svc.register("reject@example.com", "rejectuser", "mypassword123");
    await expect(svc.verify("reject@example.com", "wrong")).rejects.toThrow();
  });
});
