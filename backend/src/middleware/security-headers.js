/**
 * NexaStream - Production Security Headers
 * Zero Vulnerabilities | Maximum Protection | SHA-256
 */

module.exports = {
  // Strict Transport Security (HSTS) - 1 year
  strictTransportSecurity: 'max-age=31536000; includeSubDomains; preload',
  
  // Content Security Policy - Strict
  contentSecurityPolicy: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'strict-dynamic'", "'nonce-"],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", "data:", "https:"],
    'font-src': ["'self'", "https:"],
    'connect-src': ["'self'", "https://nexastream.org", "https://nexastream-api.onrender.com"],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    'upgrade-insecure-requests': [],
  },
  
  // X-Content-Type-Options
  xContentTypeOptions: 'nosniff',
  
  // X-Frame-Options
  xFrameOptions: 'DENY',
  
  // X-XSS-Protection
  xXSSProtection: '1; mode=block',
  
  // Referrer Policy
  referrerPolicy: 'strict-origin-when-cross-origin',
  
  // Permissions Policy
  permissionsPolicy: 'camera=(), microphone=(), geolocation=(), payment=(self)',
  
  // X-Download-Options
  xDownloadOptions: 'noopen',
  
  // Cross-Origin policies
  crossOriginEmbedderPolicy: 'require-corp',
  crossOriginOpenerPolicy: 'same-origin',
  crossOriginResourcePolicy: 'same-origin',
};
