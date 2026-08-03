import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Routes
import authRoutes from './routes/auth.js';
import videoRoutes from './routes/videos.js';
import channelRoutes from './routes/channels.js';
import rewardsRoutes from './routes/rewards.js';
import walletRoutes from './routes/wallet.js';
import uploadRoutes from './routes/upload.js';
import statsRoutes from './routes/stats.js';

// Initialize database
import { initDB } from './db/database.js';
initDB();

// Initialize
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files (uploads)
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/stats', statsRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'NexaStream',
    version: '1.0.0',
    domain: 'nexastream.org',
    network: 'NexaChain',
    consensus: 'PoW/PoS Hybrid',
    token: '$NEXA',
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🚀 NexaStream Backend Server                   ║
║                                                   ║
║   Platform: Decentralized Video Streaming        ║
║   Domain:   nexastream.org                       ║
║   Network:  NexaChain (PoW/PoS Hybrid)          ║
║   Token:    $NEXA                               ║
║                                                   ║
║   Server:   http://0.0.0.0:${PORT}                 ║
║   API:      http://0.0.0.0:${PORT}/api             ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
  `);
});

export default app;
