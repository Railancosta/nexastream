export interface ApiConfig {
  readonly host: string;
  readonly port: number;
  readonly nodeEnv: string;
  readonly corsAllowedOrigins: string[];
  readonly jwtSecret: string;
  readonly chunkSize: number;
  readonly maxUploadSize: number;
  readonly uploadTtlSeconds: number;
  readonly uploadTempDir: string;
  readonly storageDir: string;
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

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === "") {
    throw new Error(`missing required env var: ${name}`);
  }
  return v.trim();
}

function optional(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : fallback;
}

export function loadConfig(): ApiConfig {
  // JWT secret is required to start — fail explicitly when missing.
  const jwtSecret = required("JWT_SECRET");
  if (jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }

  const corsRaw = optional("CORS_ALLOWED_ORIGINS", "http://localhost:3000");
  const corsAllowedOrigins = corsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV === "production" && corsAllowedOrigins.includes("*")) {
    throw new Error("CORS_ALLOWED_ORIGINS must not be '*' in production");
  }

  return {
    host: optional("API_HOST", "0.0.0.0"),
    port: int("API_PORT", 4000),
    nodeEnv: optional("NODE_ENV", "development"),
    corsAllowedOrigins,
    jwtSecret,
    chunkSize: int("UPLOAD_CHUNK_SIZE", 8388608),
    maxUploadSize: int("UPLOAD_MAX_SIZE", 2147483648),
    uploadTtlSeconds: int("UPLOAD_TTL_SECONDS", 86400),
    uploadTempDir: optional("UPLOAD_TEMP_DIR", "./.data/uploads"),
    storageDir: optional("STORAGE_DIR", "./.data/storage"),
  };
}
