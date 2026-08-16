/**
 * NexaStream Production Server
 * 
 * ⚠️ IMPORTANT: This is a DEMO server with NO real data.
 * All statistics displayed are FAKE and should NOT be trusted.
 * 
 * For production:
 * - Use the Docker Compose setup (docker/docker-compose.zero-cloud.yml)
 * - Connect to real NexaChain network
 * - Use real IPFS storage
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https:", "wss:", "ws:"],
      mediaSrc: ["'self'", "https:", "blob:"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://player.twitch.tv"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files from frontend/out
app.use(express.static(path.join(__dirname, 'frontend', 'out')));

// API routes - ALL RETURN DEMO/FAKE DATA
// DO NOT USE IN PRODUCTION

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    version: '0.0.1-dev',
    platform: 'NexaStream',
    network: 'NexaChain',
    mode: 'DEVELOPMENT',
    warning: 'All data is fake - no real network'
  });
});

app.get('/api/videos', (req, res) => {
  // NO VIDEOS - Real videos would come from IPFS
  res.json({ 
    videos: [],
    message: 'No videos available - connect to IPFS network'
  });
});

app.get('/api/stats', (req, res) => {
  // HONEST STATS - All zeros/fake
  res.json({
    totalVideos: 0,
    totalViews: 0,
    totalCreators: 0,
    totalStaked: '0 NST',
    price: 0,
    dailyRewards: 0,
    tvl: '0',
    networkStatus: 'NOT_INITIALIZED',
    warning: 'No real data - network not yet launched'
  });
});

app.get('/api/leaderboard', (req, res) => {
  res.json({
    topChannels: [],
    message: 'No real data available yet'
  });
});

// Blockchain stats endpoint - ALL FAKE
app.get('/api/chain/stats', (req, res) => {
  res.json({
    blockHeight: 0,
    totalTransactions: 0,
    avgBlockTime: 'N/A',
    validators: 0,
    stakingAPY: 0,
    totalStaked: '0 NST',
    status: 'NOT_STARTED',
    warning: 'Blockchain not yet launched'
  });
});

// Network status endpoint
app.get('/api/network/status', (req, res) => {
  res.json({
    connected: false,
    peers: 0,
    storageNodes: 0,
    activeNodes: 0,
    blockHeight: 0,
    networkReady: false,
    message: 'Connect to P2P network to see real status'
  });
});

// Serve frontend for all other routes (SPA support)
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'frontend', 'out', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      // Fallback to root frontend if 'out' doesn't exist
      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>NexaStream - Development Mode</title>
            <style>
              body { font-family: system-ui; background: #0f172a; color: white; padding: 2rem; }
              h1 { color: #0ea5e9; }
              .warning { background: #fbbf24; color: #000; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
              .status { color: #ef4444; font-weight: bold; }
            </style>
          </head>
          <body>
            <h1>NexaStream</h1>
            <div class="warning">
              ⚠️ DEVELOPMENT MODE - ALL DATA IS FAKE
            </div>
            <p class="status">Network Status: NOT_INITIALIZED</p>
            <p>This server is running in development mode.</p>
            <p>No real blockchain, no real P2P network, no real videos.</p>
            <p>Use Docker Compose for real local development.</p>
          </body>
        </html>
      `);
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ⚠️  NexaStream DEVELOPMENT SERVER v0.0.1              ║
║                                                           ║
║   🌐 URL: http://0.0.0.0:${PORT}                          ║
║   📡 API: http://0.0.0.0:${PORT}/api                       ║
║                                                           ║
║   ⚠️  WARNING: ALL DATA IS FAKE                           ║
║                                                           ║
║   📊 Platform Stats (FAKE):                              ║
║   ├── Total Videos: 0                                    ║
║   ├── Total Views: 0                                     ║
║   ├── Creators: 0                                        ║
║   └── NST Staked: 0 NST                                  ║
║                                                           ║
║   🔗 NexaStream Chain (NOT STARTED):                      ║
║   ├── Block Height: 0                                     ║
║   ├── Validators: 0                                      ║
║   └── Status: NOT_INITIALIZED                            ║
║                                                           ║
║   ℹ️  Use Docker Compose for real development             ║
║       docker-compose -f docker/docker-compose.zero-cloud.yml up
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
