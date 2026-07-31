/**
 * NexaStream Backend - Main Entry Point
 * Military-Grade Security Enabled
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { config } from './config';
import { logger } from './utils/logger';
import { helmetConfig } from './middleware/security';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiters } from './middleware/rateLimiter';
import {
  sqlInjectionDetector,
  xssDetector,
  commandInjectionDetector,
  pathTraversalDetector,
  requestValidator,
  blockchainSecurityValidator
} from './utils/securityScanner';

// Routes
import authRoutes from './routes/api/v1/auth';
import userRoutes from './routes/api/v1/users';
import videoRoutes from './routes/api/v1/videos';
import channelRoutes from './routes/api/v1/channels';
import paymentRoutes from './routes/api/v1/payments';
import walletRoutes from './routes/api/v1/wallet';
import analyticsRoutes from './routes/api/v1/analytics';
import searchRoutes from './routes/api/v1/search';
import feedRoutes from './routes/api/v1/feed';
import moderationRoutes from './routes/api/v1/moderation';
import adminRoutes from './routes/api/v1/admin';
import blockchainRoutes from './routes/api/v1/blockchain';
import sponsorshipRoutes from './routes/api/v1/sponsorships';

const app = express();
const httpServer = createServer(app);

// Socket.IO setup
const io = new SocketServer(httpServer, {
  cors: {
    origin: config.corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(helmet(helmetConfig));
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

// Security Scanners - Block attacks before processing
app.use(sqlInjectionDetector);
app.use(xssDetector);
app.use(commandInjectionDetector);
app.use(pathTraversalDetector);
app.use(requestValidator);
app.use(blockchainSecurityValidator);

// Apply rate limiters
app.use(rateLimiters.global);
app.use('/api/', rateLimiters.api);
app.use('/api/auth/', rateLimiters.auth);
app.use('/api/auth/login', rateLimiters.login);
app.use('/api/auth/register', rateLimiters.register);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), version: '2.0.0' });
});

app.get('/api/v1', (req, res) => {
  res.json({
    name: 'NexaStream API',
    version: '2.0.0',
    description: 'The First Democratic Video Platform API',
    blockchain: {
      network: config.blockchain.network,
      currency: 'USDC',
      contract: config.blockchain.usdcContract
    },
    features: [
      'Instant Monetization',
      'Blockchain Payments',
      'Transparent Algorithms',
      'Creator-First Economics',
      'Democratic Boosting',
      'Multi-language Support'
    ]
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/videos', videoRoutes);
app.use('/api/v1/channels', channelRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/feed', feedRoutes);
app.use('/api/v1/moderation', moderationRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/blockchain', blockchainRoutes);
app.use('/api/v1/sponsorships', sponsorshipRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on('join-channel', (channelId: string) => {
    socket.join(`channel:${channelId}`);
    logger.info(`Socket ${socket.id} joined channel:${channelId}`);
  });

  socket.on('leave-channel', (channelId: string) => {
    socket.leave(`channel:${channelId}`);
  });

  socket.on('watch-video', (videoId: string) => {
    socket.join(`video:${videoId}`);
  });

  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'The requested endpoint does not exist' });
});

// Start server
const PORT = config.port || 3001;

httpServer.listen(PORT, () => {
  logger.info(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   ██╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗               ║
║   ██║   ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝               ║
║   ██║   ██║█████╗   ╚███╔╝ ██║   ██║███████╗               ║
║   ╚██╗ ██╔╝██╔══╝   ██╔██╗ ██║   ██║╚════██║               ║
║    ╚████╔╝ ███████╗██╔╝ ██╗╚██████╔╝███████║               ║
║     ╚═══╝  ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝               ║
║                                                               ║
║   🚀 NexaStream Backend v2.0.0                                ║
║   🌐 API Server running on port ${PORT}                          ║
║   🔗 Blockchain: ${config.blockchain.network}                      ║
║   💰 Payment: USDC on Ethereum                                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

export { app, httpServer, io };
