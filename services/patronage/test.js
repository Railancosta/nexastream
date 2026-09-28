const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Setup test environment
const ROOT = path.resolve(__dirname, '../..');
const DB_PATH = path.join(ROOT, 'database', 'patronage_test.db');

// Clean up test database
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
}

// Set environment for test
process.env.PORT = 3018;

// Mock the database path
const originalRequire = Module.require;
Module.require = function(id) {
  if (id === 'node:sqlite') {
    const sqlite = originalRequire(id);
    return {
      ...sqlite,
      DatabaseSync: class TestDatabaseSync {
        constructor(filePath) {
          // Use test database
          if (filePath.includes('patronage.db')) {
            return new sqlite.DatabaseSync(DB_PATH);
          }
          return new sqlite.DatabaseSync(filePath);
        }
      }
    };
  }
  return originalRequire(id);
};

// Import the server module
const serverModule = require('./server');

// Test data
const testCreatorId = 'creator-test-001';
const testUserId = 'user-test-001';
const testTierId = 'tier-test-001';

console.log('Running NexaStream Patronage Service Tests...\n');

// Test 1: Tier Creation
console.log('Test 1: Creating patronage tier...');
try {
  const tier = serverModule.createTier(
    {
      name: 'Gold Supporter',
      description: 'Exclusive access to all content',
      monthlyPriceUsd: 10.00,
      benefits: [
        { type: 'badge', badgeType: 'patron', badgeName: 'Gold Patron' }
      ],
      maxPatrons: 100
    },
    testCreatorId,
    { headers: { 'x-forwarded-for': '127.0.0.1' } }
  );
  
  assert(tier.error === undefined, 'Tier creation should succeed');
  assert(tier.name === 'Gold Supporter', 'Tier name should match');
  assert(tier.monthlyPriceUsd === 10.00, 'Price should match');
  assert(tier.benefits.length === 1, 'Should have 1 benefit');
  console.log('✓ Tier creation test passed\n');
} catch (e) {
  console.error('✗ Tier creation test failed:', e.message);
}

// Test 2: Get Tiers by Creator
console.log('Test 2: Fetching tiers by creator...');
try {
  const tiers = serverModule.getTiersByCreator(testCreatorId);
  assert(Array.isArray(tiers), 'Should return array');
  assert(tiers.length >= 1, 'Should have at least 1 tier');
  console.log('✓ Get tiers test passed\n');
} catch (e) {
  console.error('✗ Get tiers test failed:', e.message);
}

// Test 3: Anti-Fraud Checks
console.log('Test 3: Testing anti-fraud mechanisms...');
try {
  // Test: User cannot patronize their own channel
  const result1 = serverModule.checkAntiFraud(testCreatorId, testCreatorId, testTierId, 
    { headers: { 'x-forwarded-for': '127.0.0.1' } });
  assert(!result1.valid, 'Should fail when user equals creator');
  assert(result1.errors.includes('Cannot patronize your own channel'), 'Should have self-patronage error');
  
  // Test: Invalid tier
  const result2 = serverModule.checkAntiFraud(testUserId, testCreatorId, 'invalid-tier-id',
    { headers: { 'x-forwarded-for': '127.0.0.1' } });
  assert(!result2.valid, 'Should fail for invalid tier');
  
  console.log('✓ Anti-fraud tests passed\n');
} catch (e) {
  console.error('✗ Anti-fraud test failed:', e.message);
}

// Test 4: Patronage Creation
console.log('Test 4: Creating patronage subscription...');
try {
  // First create a tier
  const tier = serverModule.createTier(
    {
      name: 'Silver Supporter',
      description: 'Basic support tier',
      monthlyPriceUsd: 5.00,
      benefits: [],
      maxPatrons: 0
    },
    testCreatorId,
    { headers: { 'x-forwarded-for': '127.0.0.1' } }
  );
  
  // Then create patronage
  const patronage = serverModule.createPatronage(
    testUserId,
    testCreatorId,
    tier.id,
    { method: 'test', reference: 'test-ref' },
    { headers: { 'x-forwarded-for': '127.0.0.1' } }
  );
  
  assert(patronage.error === undefined, 'Patronage creation should succeed');
  assert(patronage.userId === testUserId, 'User ID should match');
  assert(patronage.creatorId === testCreatorId, 'Creator ID should match');
  assert(patronage.tierId === tier.id, 'Tier ID should match');
  assert(patronage.status === 'active', 'Status should be active');
  console.log('✓ Patronage creation test passed\n');
} catch (e) {
  console.error('✗ Patronage creation test failed:', e.message);
}

// Test 5: Get Patronages by User
console.log('Test 5: Fetching patronages by user...');
try {
  const patronages = serverModule.getPatronagesByUser(testUserId);
  assert(Array.isArray(patronages), 'Should return array');
  assert(patronages.length >= 1, 'Should have at least 1 patronage');
  console.log('✓ Get patronages test passed\n');
} catch (e) {
  console.error('✗ Get patronages test failed:', e.message);
}

// Test 6: Get Patrons by Creator
console.log('Test 6: Fetching patrons by creator...');
try {
  const patrons = serverModule.getPatronsByCreator(testCreatorId);
  assert(Array.isArray(patrons), 'Should return array');
  assert(patrons.length >= 1, 'Should have at least 1 patron');
  console.log('✓ Get patrons test passed\n');
} catch (e) {
  console.error('✗ Get patrons test failed:', e.message);
}

// Test 7: Cancel Patronage
console.log('Test 7: Canceling patronage...');
try {
  const patronages = serverModule.getPatronagesByUser(testUserId);
  if (patronages.length > 0) {
    const result = serverModule.cancelPatronage(
      patronages[0].id,
      testUserId,
      { headers: { 'x-forwarded-for': '127.0.0.1' } }
    );
    assert(result.success === true, 'Cancel should succeed');
    assert(result.status === 'cancelled', 'Status should be cancelled');
    console.log('✓ Cancel patronage test passed\n');
  } else {
    console.log('⚠ Skipping cancel test - no patronages found\n');
  }
} catch (e) {
  console.error('✗ Cancel patronage test failed:', e.message);
}

// Test 8: Early Access Content
console.log('Test 8: Testing early access content...');
try {
  const content = serverModule.createEarlyAccessContent(
    {
      contentId: 'video-001',
      contentType: 'video',
      title: 'Exclusive Video',
      description: 'Only for patrons',
      accessTierIds: []
    },
    testCreatorId,
    { headers: { 'x-forwarded-for': '127.0.0.1' } }
  );
  
  assert(content.error === undefined, 'Early access creation should succeed');
  assert(content.title === 'Exclusive Video', 'Title should match');
  
  // Check access
  const access = serverModule.checkEarlyAccess(testUserId, 'video-001');
  assert(access.hasAccess === true, 'Should have access when no tier restrictions');
  
  console.log('✓ Early access content test passed\n');
} catch (e) {
  console.error('✗ Early access content test failed:', e.message);
}

// Test 9: Community Roles
console.log('Test 9: Testing community roles...');
try {
  const role = serverModule.createCommunityRole(
    {
      roleName: 'Moderator',
      description: 'Can moderate the community',
      requiredTierId: null,
      permissions: ['moderate', 'delete_comments']
    },
    testCreatorId,
    { headers: { 'x-forwarded-for': '127.0.0.1' } }
  );
  
  assert(role.error === undefined, 'Role creation should succeed');
  assert(role.roleName === 'Moderator', 'Role name should match');
  
  const roles = serverModule.getCommunityRoles(testCreatorId);
  assert(Array.isArray(roles), 'Should return array');
  assert(roles.length >= 1, 'Should have at least 1 role');
  
  console.log('✓ Community roles test passed\n');
} catch (e) {
  console.error('✗ Community roles test failed:', e.message);
}

// Test 10: Revenue Tracking
console.log('Test 10: Testing revenue tracking...');
try {
  const revenue = serverModule.getCreatorPatronageRevenue(testCreatorId, null, null);
  assert(revenue.creatorId === testCreatorId, 'Creator ID should match');
  assert(typeof revenue.totalRevenue === 'number', 'Total revenue should be number');
  assert(typeof revenue.uniquePatrons === 'number', 'Unique patrons should be number');
  console.log('✓ Revenue tracking test passed\n');
} catch (e) {
  console.error('✗ Revenue tracking test failed:', e.message);
}

// Cleanup
console.log('Cleaning up test database...');
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
}

console.log('\n' + '='.repeat(50));
console.log('NexaStream Patronage Service Tests Complete');
console.log('='.repeat(50));
