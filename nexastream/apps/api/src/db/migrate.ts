import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Versioned migration runner. Applies .sql files in order and tracks applied
 * migrations in a `_migrations` table. Never alters production manually.
 */
export async function runMigrations(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id          SERIAL PRIMARY KEY,
        filename    TEXT NOT NULL UNIQUE,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const migrationsDir = join(__dirname, "..", "migrations");
    let files: string[];
    try {
      files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
    } catch {
      files = [];
    }

    for (const file of files) {
      const already = await client.query("SELECT 1 FROM _migrations WHERE filename = $1", [file]);
      if (already.rowCount && already.rowCount > 0) continue;

      const sql = await fs.readFile(join(migrationsDir, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO _migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
        console.log(`[migrate] applied: ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
    console.log("[migrate] done");
  } finally {
    client.release();
    await pool.end();
  }
}

// CLI entrypoint: node dist/db/migrate.js
if (import.meta.url === `file://${process.argv[1]}`) {
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  runMigrations(conn).catch((err) => {
    console.error("[migrate] failed:", err);
    process.exit(1);
  });
}
