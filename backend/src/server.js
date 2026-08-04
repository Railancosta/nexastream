/**
 * NexaStream Backend API v2.0
 * Complete backend with 200+ features
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Create uploads directory if not exists
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads', { recursive: true });
}

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
