/**
 * Security Middleware - Military Grade
 * NexaStream Helmet Configuration
 */

export const helmetConfig = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      baseUri: ["'self'"],
      blockAllMixedContent: true,
      childSrc: ["'self'", 'https:'],
      connectSrc: ["'self'", 'https://nexastream.org', 'https://api.nexastream.org', 'wss://nexastream.org'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdn.jsdelivr.net'],
      frameAncestors: ["'none'"],
      frameSrc: ["'self'", 'https://www.youtube.com', 'https://player.twitch.tv'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      manifestSrc: ["'self'"],
      mediaSrc: ["'self'", 'https:', 'blob:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      upgradeInsecureRequests: [],
      workerSrc: ["'self'", 'blob:'],
    },
    reportOnly: false,
  },

  // Cross Domain Policies
  crossOriginEmbedderPolicy: { policy: 'require-corp' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-origin' },

  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },

  // Frame Guard
  frameguard: { action: 'deny' },

  // Hide Powered By
  hidePoweredBy: { setTo: 'SecureProxy/2.0' },

  // HSTS (HTTP Strict Transport Security)
  hsts: {
    maxAge: 63072000, // 2 years
    includeSubDomains: true,
    preload: true
  },

  // IE No Open
  ieNoOpen: { action: 'noopen' },

  // No Sniff
  noSniff: { action: 'deny' },

  // Origin Agent Cluster
  originAgentCluster: true,

  // Permitted Cross Domain Policies
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none'
  },

  // Referrer Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },

  // XSS Filter
  xssFilter: { action: 'block' },
};

// Input sanitization middleware
export const sanitizeInput = (req: any, res: any, next: any) => {
  // Remove common XSS patterns
  const sanitize = (str: string) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<iframe/gi, '')
      .replace(/<object/gi, '')
      .replace(/<embed/gi, '');
  };

  const walk = (obj: any) => {
    if (obj === null || typeof obj !== 'object') return obj;
    
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitize(obj[key]);
        } else if (typeof obj[key] === 'object') {
          walk(obj[key]);
        }
      }
    }
    return obj;
  };

  if (req.body) walk(req.body);
  if (req.query) walk(req.query);
  if (req.params) walk(req.params);

  next();
};

// Request size limiter
export const requestSizeLimiter = {
  bodyParser: {
    limit: '10mb',
  },
  multipart: {
    limits: {
      fileSize: 500 * 1024 * 1024, // 500MB max file size
      files: 1,
    },
  },
};
