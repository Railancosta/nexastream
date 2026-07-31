/**
 * NexaStream Backend v3.0 - Complete Video Platform
 * The First Democratic Video Platform with Blockchain Payments
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { prisma } from './utils/prisma.js';
import { helmetConfig } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiters } from './middleware/rateLimiter.js';
import { sqlInjectionDetector, xssDetector } from './middleware/security.js';

// Routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import videoRoutes from './routes/videos.js';
import channelRoutes from './routes/channels.js';
import walletRoutes from './routes/wallet.js';
import paymentRoutes from './routes/payments.js';
import analyticsRoutes from './routes/analytics.js';
import searchRoutes from './routes/search.js';
import feedRoutes from './routes/feed.js';
import sponsorshipRoutes from './routes/sponsorships.js';
import adminRoutes from './routes/admin.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: config.corsOrigins, methods: ['GET', 'POST'], credentials: true }
});

// Security Middleware
app.use(helmet(helmetConfig));
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));
app.use(sqlInjectionDetector);
app.use(xssDetector);

// Rate Limiting
app.use(rateLimiters.global);
app.use('/api/', rateLimiters.api);
app.use('/api/auth/', rateLimiters.auth);
app.use('/api/auth/login', rateLimiters.login);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString(), version: '3.0.0' });
});

app.get('/api', (req, res) => {
  res.json({
    name: 'NexaStream API',
    version: '3.0.0',
    blockchain: { network: config.blockchain.network, currency: 'USDC' },
    features: ['Instant Monetization', 'Blockchain Payments', 'Transparent Algorithms', 'SEO Optimized']
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/sponsorships', sponsorshipRoutes);
app.use('/api/admin', adminRoutes);

// Socket.IO
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  socket.on('join-video', (videoId) => socket.join(`video:${videoId}`));
  socket.on('leave-video', (videoId) => socket.leave(`video:${videoId}`));
  socket.on('join-channel', (channelId) => socket.join(`channel:${channelId}`));
});

// Error Handling
app.use(errorHandler);
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

// Start Server
const PORT = config.port;
httpServer.listen(PORT, () => {
  logger.info(`🚀 NexaStream Backend v3.0 running on port ${PORT}`);
  logger.info(`🔗 Blockchain: ${config.blockchain.network}`);
  logger.info(`💰 Platform Wallet: ${config.platformWallet}`);
});

export { app, httpServer, io };
