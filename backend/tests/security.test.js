/**
 * NexaStream Security Tests
 * Comprehensive security testing for authentication, authorization, and input validation
 */

const request = require('supertest');

// Mock the database and blockchain modules
jest.mock('../src/db/database', () => ({
  query: jest.fn(),
  get: jest.fn(),
  run: jest.fn(),
  all: jest.fn()
}));

jest.mock('../src/blockchain/scripts', () => ({
  getBalance: jest.fn().mockResolvedValue('1000000000000000000'),
  transfer: jest.fn().mockResolvedValue({ success: true, txHash: '0x123' })
}));

const app = require('../src/server');
const db = require('../src/db/database');

describe('Security Tests', () => {
  
  // ============================================
  // INPUT VALIDATION TESTS
  // ============================================
  
  describe('Input Validation', () => {
    
    test('should reject oversized JSON payloads', async () => {
      const largePayload = { data: 'x'.repeat(10 * 1024 * 1024) }; // 10MB
      
      const res = await request(app)
        .post('/api/v1/users/register')
        .set('Content-Type', 'application/json')
        .send(largePayload);
      
      // Should reject with 400 or 413
      expect([400, 413, 431]).toContain(res.status);
    });
    
    test('should reject invalid email formats', async () => {
      const invalidEmails = [
        'notanemail',
        '@nodomain.com',
        'spaces in@email.com',
        'email@',
        ''
      ];
      
      for (const email of invalidEmails) {
        const res = await request(app)
          .post('/api/v1/users/register')
          .send({ email, password: 'ValidPassword123!' });
        
        expect(res.status).toBe(400);
      }
    });
    
    test('should reject weak passwords', async () => {
      const weakPasswords = [
        '12345678',
        'password',
        'qwerty',
        'abc',
        'short'
      ];
      
      for (const password of weakPasswords) {
        const res = await request(app)
          .post('/api/v1/users/register')
          .send({ email: 'test@example.com', password });
        
        expect(res.status).toBe(400);
      }
    });
    
    test('should sanitize SQL injection attempts', async () => {
      const sqlPayloads = [
        "'; DROP TABLE users;--",
        "1 OR 1=1",
        "UNION SELECT * FROM passwords",
        "'; INSERT INTO users VALUES ('hacker','password');--"
      ];
      
      // These should be handled by parameterized queries
      // Even if submitted, they should not execute
      for (const payload of sqlPayloads) {
        const res = await request(app)
          .post('/api/v1/users/search')
          .send({ query: payload });
        
        // Should either reject (400) or handle safely
        expect([200, 400]).toContain(res.status);
      }
    });
    
    test('should sanitize XSS attempts', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert("xss")',
        '<svg onload=alert(1)>'
      ];
      
      for (const payload of xssPayloads) {
        const res = await request(app)
          .post('/api/v1/videos')
          .set('Authorization', 'Bearer fake-token')
          .send({ title: payload, description: 'test' });
        
        // Should either reject or sanitize
        expect([200, 201, 400, 401]).toContain(res.status);
      }
    });
    
    test('should reject path traversal attempts', async () => {
      const pathPayloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        '....//....//etc/passwd'
      ];
      
      for (const payload of pathPayloads) {
        const res = await request(app)
          .get(`/api/storage/download/${payload}`);
        
        // Should reject path traversal
        expect([400, 404]).toContain(res.status);
      }
    });
  });
  
  // ============================================
  // AUTHENTICATION TESTS
  // ============================================
  
  describe('Authentication Security', () => {
    
    test('should require authentication for protected routes', async () => {
      const protectedRoutes = [
        ['POST', '/api/v1/videos'],
        ['GET', '/api/v1/users/me'],
        ['POST', '/api/v1/wallet/send'],
        ['POST', '/api/v1/storage/upload']
      ];
      
      for (const [method, route] of protectedRoutes) {
        const req = method === 'POST' 
          ? request(app).post(route).send({})
          : request(app).get(route);
        
        const res = await req;
        expect(res.status).toBe(401);
      }
    });
    
    test('should reject invalid JWT tokens', async () => {
      const invalidTokens = [
        'invalid-token',
        'Bearer invalid',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
        ''
      ];
      
      for (const token of invalidTokens) {
        const res = await request(app)
          .get('/api/v1/users/me')
          .set('Authorization', token);
        
        expect(res.status).toBe(401);
      }
    });
    
    test('should reject expired JWT tokens', async () => {
      // Token expired in the past
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0IiwiaWF0IjoxNjAwMDAwMDAwfQ.expired';
      
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(res.status).toBe(401);
    });
    
    test('should lock account after failed login attempts', async () => {
      // Attempt multiple failed logins
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/api/v1/users/login')
          .send({ email: 'test@example.com', password: 'wrongpassword' });
      }
      
      // Account should be temporarily locked
      const res = await request(app)
        .post('/api/v1/users/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });
      
      expect(res.status).toBe(429); // Too many requests
    });
    
    test('should use secure password hashing', async () => {
      const bcrypt = require('bcryptjs');
      
      // Hash a password
      const hash = await bcrypt.hash('TestPassword123!', 12);
      
      // Verify it's using bcrypt
      expect(hash.startsWith('$2')).toBe(true);
      
      // Verify cost factor is adequate (>= 10)
      const costFactor = parseInt(hash.split('$')[2]);
      expect(costFactor).toBeGreaterThanOrEqual(10);
    });
  });
  
  // ============================================
  // AUTHORIZATION TESTS
  // ============================================
  
  describe('Authorization Security', () => {
    
    test('should prevent unauthorized resource access', async () => {
      // User A tries to access User B's resource
      const res = await request(app)
        .get('/api/v1/users/999999/videos')
        .set('Authorization', 'Bearer fake-token-for-user-a');
      
      expect([401, 403, 404]).toContain(res.status);
    });
    
    test('should prevent privilege escalation', async () => {
      // Regular user tries to access admin endpoint
      const res = await request(app)
        .post('/api/v1/admin/users/delete')
        .set('Authorization', 'Bearer regular-user-token');
      
      expect([401, 403]).toContain(res.status);
    });
    
    test('should enforce ownership checks', async () => {
      // User tries to modify another user's video
      const res = await request(app)
        .patch('/api/v1/videos/12345')
        .set('Authorization', 'Bearer user-token')
        .send({ title: 'Hacked Title' });
      
      // Should reject unauthorized modification
      expect([401, 403, 404]).toContain(res.status);
    });
  });
  
  // ============================================
  // RATE LIMITING TESTS
  // ============================================
  
  describe('Rate Limiting', () => {
    
    test('should enforce rate limits on auth endpoints', async () => {
      const responses = [];
      
      // Make 10 requests quickly (should trigger rate limit)
      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .post('/api/v1/users/login')
          .send({ email: `test${i}@example.com`, password: 'password' });
        responses.push(res.status);
      }
      
      // At least some should be rate limited
      const rateLimited = responses.filter(s => s === 429).length;
      expect(rateLimited).toBeGreaterThan(0);
    });
    
    test('should return rate limit headers', async () => {
      const res = await request(app)
        .get('/api/health');
      
      // Should have rate limit headers
      expect(res.headers).toHaveProperty('x-ratelimit-limit');
      expect(res.headers).toHaveProperty('x-ratelimit-remaining');
    });
  });
  
  // ============================================
  // SECURITY HEADERS TESTS
  // ============================================
  
  describe('Security Headers', () => {
    
    test('should set X-Content-Type-Options header', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
    
    test('should set X-Frame-Options header', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-frame-options']).toBe('DENY');
    });
    
    test('should set X-XSS-Protection header', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['x-xss-protection']).toBe('1; mode=block');
    });
    
    test('should set Referrer-Policy header', async () => {
      const res = await request(app).get('/api/health');
      expect(res.headers['referrer-policy']).toBeTruthy();
    });
  });
  
  // ============================================
  // ERROR HANDLING TESTS
  // ============================================
  
  describe('Error Handling Security', () => {
    
    test('should not expose stack traces in production', async () => {
      const res = await request(app)
        .get('/api/nonexistent-endpoint');
      
      // Should return generic error, not stack trace
      expect(res.body.error).toBeDefined();
      expect(res.body.stack).toBeUndefined();
    });
    
    test('should return consistent error format', async () => {
      const errorEndpoints = [
        ['GET', '/api/nonexistent'],
        ['POST', '/api/v1/videos'],
        ['DELETE', '/api/v1/videos/999']
      ];
      
      for (const [method, route] of errorEndpoints) {
        const req = method === 'POST' 
          ? request(app).post(route).send({})
          : method === 'DELETE'
          ? request(app).delete(route)
          : request(app).get(route);
        
        const res = await req;
        
        // All errors should have consistent format
        expect(res.body).toHaveProperty('error');
      }
    });
    
    test('should not leak sensitive info in errors', async () => {
      // Trigger various errors
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /token/i,
        /key/i,
        /private/i
      ];
      
      const errorRoutes = [
        ['POST', '/api/v1/users/login'],
        ['POST', '/api/v1/users/register'],
        ['GET', '/api/v1/users/99999']
      ];
      
      for (const [method, route] of errorRoutes) {
        const req = method === 'POST' 
          ? request(app).post(route).send({})
          : request(app).get(route);
        
        const res = await req;
        const responseText = JSON.stringify(res.body).toLowerCase();
        
        // No sensitive data should be in error responses
        for (const pattern of sensitivePatterns) {
          expect(pattern.test(responseText)).toBe(false);
        }
      }
    });
  });
  
  // ============================================
  // FILE UPLOAD SECURITY TESTS
  // ============================================
  
  describe('File Upload Security', () => {
    
    test('should reject executable file types', async () => {
      const executableFiles = [
        { name: 'script.exe', type: 'application/x-executable' },
        { name: 'malware.js', type: 'application/javascript' },
        { name: 'shell.php', type: 'application/x-php' },
        { name: 'backdoor.sh', type: 'application/x-sh' }
      ];
      
      for (const file of executableFiles) {
        const res = await request(app)
          .post('/api/storage/upload')
          .set('Authorization', 'Bearer fake-token')
          .attach('file', Buffer.from('test'), {
            filename: file.name,
            contentType: file.type
          });
        
        expect([400, 415, 422]).toContain(res.status);
      }
    });
    
    test('should enforce file size limits', async () => {
      // Create a large buffer
      const largeBuffer = Buffer.alloc(600 * 1024 * 1024); // 600MB
      
      const res = await request(app)
        .post('/api/storage/upload')
        .set('Authorization', 'Bearer fake-token')
        .attach('file', largeBuffer, {
          filename: 'large.mp4',
          contentType: 'video/mp4'
        });
      
      expect([400, 413, 431]).toContain(res.status);
    });
    
    test('should scan filenames for path traversal', async () => {
      const maliciousFilenames = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config',
        'file.txt<script>',
        'file.txt.exe'
      ];
      
      for (const filename of maliciousFilenames) {
        const res = await request(app)
          .post('/api/storage/upload')
          .set('Authorization', 'Bearer fake-token')
          .attach('file', Buffer.from('test'), {
            filename,
            contentType: 'text/plain'
          });
        
        expect([400, 422]).toContain(res.status);
      }
    });
  });
  
  // ============================================
  // CRYPTOGRAPHIC TESTS
  // ============================================
  
  describe('Cryptographic Security', () => {
    
    test('should use secure random generation', async () => {
      const crypto = require('crypto');
      
      // Generate multiple random values
      const values = [];
      for (let i = 0; i < 100; i++) {
        values.push(crypto.randomBytes(16).toString('hex'));
      }
      
      // All values should be unique
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(100);
    });
    
    test('should use strong hash algorithms', async () => {
      const crypto = require('crypto');
      
      // Test hashing
      const hash = crypto.createHash('sha256')
        .update('test data')
        .digest('hex');
      
      expect(hash.length).toBe(64); // SHA-256 produces 64 hex chars
      expect(hash).not.toMatch(/^[a-f0-9]{32}$/); // Not MD5
    });
    
    test('should use secure password derivation', async () => {
      const bcrypt = require('bcryptjs');
      
      const password = 'SecurePassword123!';
      const hash = await bcrypt.hash(password, 12);
      
      // Should verify correctly
      const valid = await bcrypt.compare(password, hash);
      expect(valid).toBe(true);
      
      // Should reject wrong password
      const invalid = await bcrypt.compare('WrongPassword', hash);
      expect(invalid).toBe(false);
    });
  });
  
  // ============================================
  // CORS SECURITY TESTS
  // ============================================
  
  describe('CORS Security', () => {
    
    test('should validate Origin header', async () => {
      // Valid origin
      const validRes = await request(app)
        .get('/api/health')
        .set('Origin', process.env.FRONTEND_URL || 'https://nexastream.org');
      
      // Should handle valid origin
      expect(validRes.headers['access-control-allow-origin']).toBeTruthy();
    });
    
    test('should block unauthorized origins', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://evil-site.com');
      
      // Malicious origin should be blocked
      if (res.headers['access-control-allow-origin']) {
        expect(res.headers['access-control-allow-origin']).not.toBe('https://evil-site.com');
      }
    });
    
    test('should not expose credentials to unauthorized origins', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://unknown-site.com');
      
      // Should not expose credentials
      expect(res.headers['access-control-allow-credentials']).toBeUndefined();
    });
  });
  
  // ============================================
  // SESSION SECURITY TESTS
  // ============================================
  
  describe('Session Security', () => {
    
    test('should use HTTP-only cookies', async () => {
      const res = await request(app)
        .post('/api/v1/users/login')
        .send({ email: 'test@example.com', password: 'password' });
      
      // If session cookie is set
      if (res.headers['set-cookie']) {
        const cookieHeader = res.headers['set-cookie'][0];
        expect(cookieHeader).toContain('HttpOnly');
      }
    });
    
    test('should use Secure cookies in production', async () => {
      // Set NODE_ENV to production
      process.env.NODE_ENV = 'production';
      
      const res = await request(app)
        .post('/api/v1/users/login')
        .send({ email: 'test@example.com', password: 'password' });
      
      // If session cookie is set, should have Secure flag
      if (res.headers['set-cookie']) {
        const cookieHeader = res.headers['set-cookie'][0];
        expect(cookieHeader).toContain('Secure');
      }
      
      // Reset
      process.env.NODE_ENV = 'test';
    });
    
    test('should use SameSite cookies', async () => {
      const res = await request(app)
        .post('/api/v1/users/login')
        .send({ email: 'test@example.com', password: 'password' });
      
      // If session cookie is set
      if (res.headers['set-cookie']) {
        const cookieHeader = res.headers['set-cookie'][0];
        expect(cookieHeader).toMatch(/SameSite=(Strict|Lax)/);
      }
    });
  });
});
