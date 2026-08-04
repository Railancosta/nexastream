/**
 * Database Seed Script
 * ONLY use for development/testing - creates clean empty database
 */

const db = require('../config/database');

function cleanDatabase() {
  console.log('Cleaning database...');
  
  db.exec('PRAGMA foreign_keys = OFF');
  
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
  `).all();
  
  for (const table of tables) {
    try {
      db.exec(`DELETE FROM ${table.name}`);
    } catch (e) {}
  }
  
  db.exec('PRAGMA foreign_keys = ON');
  console.log('Database cleaned! No mock data.');
}

if (require.main === module) {
  cleanDatabase();
}

module.exports = { cleanDatabase };
