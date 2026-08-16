import { promises as fs } from "node:fs";
import { loadConfig } from "./config.js";
import { createApp } from "./app.js";
import { LocalContentStorage } from "./storage/local-storage.js";
import { UploadManager } from "./services/upload-manager.js";

async function ensureDirs(config: { uploadTempDir: string; storageDir: string }) {
  await fs.mkdir(config.uploadTempDir, { recursive: true });
  await fs.mkdir(config.storageDir, { recursive: true });
}

async function main(): Promise<void> {
  const config = loadConfig();
  await ensureDirs(config);

  const storage = new LocalContentStorage(config.storageDir);
  const uploads = new UploadManager({
    tempDir: config.uploadTempDir,
    storage,
    ttlSeconds: config.uploadTtlSeconds,
    chunkSize: config.chunkSize,
    maxUploadSize: config.maxUploadSize,
  });

  const isReady = async (): Promise<boolean> => {
    try {
      await fs.access(config.storageDir);
      await fs.access(config.uploadTempDir);
      return true;
    } catch {
      return false;
    }
  };

  const app = createApp({ config, uploads, isReady });

  const server = app.listen(config.port, config.host, () => {
    console.log(
      `[api] listening on ${config.host}:${config.port} (env=${config.nodeEnv})`,
    );
  });

  // Periodic purge of expired uploads (every 10 min).
  const purgeTimer = setInterval(() => {
    void uploads.purgeExpired().catch(() => {
      /* swallow — purge is best-effort */
    });
  }, 10 * 60 * 1000);
  purgeTimer.unref();

  const shutdown = (signal: string) => {
    console.log(`[api] ${signal} received, shutting down`);
    server.close(() => process.exit(0));
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

void main().catch((err) => {
  console.error("[api] fatal startup error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
