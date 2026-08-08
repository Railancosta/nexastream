/**
 * NexaStream Testnet Tests
 */

describe('NexaStream Testnet', () => {
  test('genesis.json should exist', () => {
    const fs = require('fs');
    const path = require('path');
    const genesisPath = path.join(__dirname, '..', 'genesis.json');
    expect(fs.existsSync(genesisPath)).toBe(true);
  });

  test('genesis.json should have valid chain ID', () => {
    const fs = require('fs');
    const path = require('path');
    const genesisPath = path.join(__dirname, '..', 'genesis.json');
    const genesis = JSON.parse(fs.readFileSync(genesisPath, 'utf8'));
    expect(genesis.chain_id).toBe(9999);
  });

  test('deploy.sh should be executable', () => {
    const fs = require('fs');
    const path = require('path');
    const scriptPath = path.join(__dirname, '..', 'deploy.sh');
    expect(fs.existsSync(scriptPath)).toBe(true);
    const stats = fs.statSync(scriptPath);
    expect(stats.mode & 0o111).toBeTruthy();
  });
});
