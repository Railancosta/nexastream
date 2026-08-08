/**
 * NexaStream Kubernetes Tests
 */

describe('Kubernetes Manifest Validation', () => {
  test('namespace.yaml should exist', () => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', 'namespace.yaml');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('ingress.yaml should exist', () => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', 'ingress.yaml');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('kind-config.yaml should exist', () => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', 'kind-config.yaml');
    expect(fs.existsSync(filePath)).toBe(true);
  });
});

describe('K8s Manifest Structure', () => {
  test('deploy.sh should be executable', () => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '..', 'deploy.sh');
    expect(fs.existsSync(filePath)).toBe(true);
    const stats = fs.statSync(filePath);
    expect(stats.mode & 0o111).toBeTruthy();
  });
});
