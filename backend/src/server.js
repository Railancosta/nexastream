/**
 * NexaStream Backend API v2.0
 * Complete backend with 200+ features
 * Security: SHA-256, Helmet, Rate Limiting
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs');
require('dotenv').config();

// Import security middleware
const { 
  securityHeaders, 
  rateLimiter, 
  sanitizeInput 
} = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Create uploads directory if not exists
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads', { recursive: true });
}

// Security middleware
app.use(securityHeaders);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://nexastream.org"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://nexastream.org',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
}));

app.use(compression());
app.use(morgan('combined'));

// Rate limiting
app.use('/api/', rateLimiter('general'));
app.use('/api/auth/', rateLimiter('auth'));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Sanitize inputs
app.use(sanitizeInput);

// Static files
app.use('/uploads', express.static('./uploads'));

// Import routes
const apiRoutes = require('./routes');

// Mount API routes
app.use('/api', apiRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: Date.now(),
        version: '2.0.0',
        uptime: process.uptime()
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 NexaStream Backend API v2.0 Started                ║
║                                                           ║
║   📡 Port: ${PORT}                                          ║
║   🔗 URL: http://localhost:${PORT}                          ║
║   📚 Docs: http://localhost:${PORT}/api                     ║
║                                                           ║
║   📚 API Endpoints:                                       ║
║   ├── /api/users      - User management                   ║
║   ├── /api/videos     - Video platform                    ║
║   ├── /api/channels   - Creator channels                  ║
║   ├── /api/payments   - Wallet & transactions             ║
║   ├── /api/streaming  - Live streaming                     ║
║   ├── /api/nft        - NFT marketplace                   ║
║   └── /api/analytics  - Platform analytics                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
