/**
 * NexaStream Backend v3.0
 * Real Production Backend with SQLite
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Initialize database
const db = require('./config/database');

// Create tables
const initDatabase = require('./scripts/initDb');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure directories exist
const dirs = ['./uploads', './uploads/videos', './uploads/thumbnails', './uploads/avatars'];
dirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Trust proxy
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      mediaSrc: ["'self'", "https:", "blob:"],
      connectSrc: ["'self'", "https:"],
      frameSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://nexastream.org').split(',');
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.includes(o))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(compression());
app.use(morgan('tiny'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many uploads, please try again later.' },
});

app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);
app.use('/api/videos/upload', uploadLimiter);

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/channels', require('./routes/channels'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/likes', require('./routes/likes'));
app.use('/api/feed', require('./routes/feed'));
app.use('/api/search', require('./routes/search'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/blockchain', require('./routes/blockchain'));

// Health check
app.get('/api/health', (req, res) => {
  const stats = db.prepare('SELECT COUNT(*) as videoCount FROM videos').get();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    uptime: process.uptime(),
    database: 'connected',
    stats: stats
  });
});

// API Info
app.get('/api', (req, res) => {
  res.json({
    name: 'NexaStream API',
    version: '3.0.0',
    description: 'Real production backend for NexaStream',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      videos: '/api/videos',
      channels: '/api/channels',
      comments: '/api/comments',
      subscriptions: '/api/subscriptions',
      likes: '/api/likes',
      feed: '/api/feed',
      search: '/api/search',
      recommendations: '/api/recommendations'
    }
  });
});

// Error handlers
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'File too large' });
  }
  
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Initialize database and start server
async function start() {
  try {
    // Initialize database tables
    await initDatabase();
    console.log('✅ Database initialized');
    
    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 NexaStream Backend v3.0 Started                    ║
║                                                           ║
║   📡 Port: ${PORT}                                          ║
║   🔗 URL: http://localhost:${PORT}                          ║
║   🌐 Frontend: ${process.env.FRONTEND_URL || 'https://nexastream.org'}  ║
║   ⛓️ Blockchain: ${process.env.BLOCKCHAIN_NETWORK || 'sepolia'}                          ║
║                                                           ║
║   📚 Endpoints:                                           ║
║   ├── /api/auth          - Authentication                ║
║   ├── /api/users         - User management               ║
║   ├── /api/videos        - Video platform                ║
║   ├── /api/channels      - Creator channels              ║
║   ├── /api/comments      - Comments system               ║
║   ├── /api/feed          - Personalized feed             ║
║   ├── /api/recommendations - AI recommendations          ║
║   ├── /api/search        - Search engine                 ║
║   └── /api/blockchain    - Ethereum integration          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
