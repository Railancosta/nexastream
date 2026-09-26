// Shared SQLite opening for NexaStream services.
//
// SQLite fails immediately when another connection holds a write lock, and
// every service here shares database/nexastream.db (chain, core, content,
// auth, videos, social, dao, bounty, search). With the default configuration
// ordinary concurrency becomes a "database is locked" crash — including in CI,
// where the chain test step and the contract test step overlap on the same
// checkout.
//
// WAL lets readers run while a writer is active, and busy_timeout makes a
// blocked writer wait for the lock instead of failing. busy_timeout must be
// set on read-only connections too, since they still take a shared lock to
// start a transaction.

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const BUSY_TIMEOUT_MS = Number(process.env.NS_SQLITE_BUSY_TIMEOUT_MS) || 10000;

function openDatabase(file, options = {}) {
  // SQLite will not create a file inside a missing directory, and database/
  // is gitignored so it does not exist in a fresh clone.
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file, options);
  try {
    db.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
    // journal_mode is a property of the file rather than the connection, and a
    // read-only connection cannot set it.
    if (!options.readOnly) db.exec('PRAGMA journal_mode = WAL');
  } catch (err) {
    // Being locked right now is the condition we are trying to survive, so a
    // failed tuning attempt must not become a startup failure.
    console.warn(`sqlite: tuning skipped for ${file}: ${err.message}`);
  }
  return db;
}

module.exports = { openDatabase, BUSY_TIMEOUT_MS };
