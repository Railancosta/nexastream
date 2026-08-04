/**
 * NexaStream Security Middleware
 * SHA-256, CSRF, Rate Limiting, Helmet
 */

const crypto = require('crypto');

// SHA-256 hash utility
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Generate secure token
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Security headers middleware
function securityHeaders(req, res, next) {
  // SHA-256 for sensitive data
  res.locals.sha256 = sha256;
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  next();
}

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'https://nexastream.org',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
};

// Rate limiting
const rateLimits = {
  general: { windowMs: 15 * 60 * 1000, max: 100 }, // 100 requests per 15 min
  auth: { windowMs: 60 * 60 * 1000, max: 5 }, // 5 attempts per hour
  api: { windowMs: 60 * 1000, max: 30 }, // 30 requests per minute
};

// Simple rate limiter
const rateLimitStore = new Map();

function rateLimiter(type = 'general') {
  const limit = rateLimits[type] || rateLimits.general;
  
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { count: 1, resetTime: now + limit.windowMs });
      return next();
    }
    
    const record = rateLimitStore.get(key);
    
    if (now > record.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + limit.windowMs });
      return next();
    }
    
    if (record.count >= limit.max) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }
    
    record.count++;
    next();
  };
}

// CSRF protection
function csrfProtection(req, res, next) {
  // Skip for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  const csrfToken = req.headers['x-csrf-token'];
  const sessionToken = req.cookies?.csrfToken;
  
  // In production, verify tokens match
  if (process.env.NODE_ENV === 'production' && csrfToken !== sessionToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  next();
}

// Input sanitization
function sanitizeInput(req, res, next) {
  const sanitize = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potential XSS
        obj[key] = obj[key]
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };
  
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  
  next();
}

// Password hashing with SHA-256 + salt
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// API signature verification
function verifySignature(req, res, next) {
  const signature = req.headers['x-api-signature'];
  
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }
  
  const payload = JSON.stringify(req.body) + req.headers['x-timestamp'];
  const expectedSignature = sha256(payload + process.env.JWT_SECRET);
  
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  next();
}

// Clean up rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

module.exports = {
  sha256,
  generateToken,
  securityHeaders,
  corsOptions,
  rateLimiter,
  csrfProtection,
  sanitizeInput,
  hashPassword,
  verifyPassword,
  verifySignature,
};
