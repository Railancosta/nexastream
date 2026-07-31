/**
 * NexaStream Configuration
 */

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'https://nexastream.org'],
  
  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/nexastream',
  },
  
  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
  },
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  
  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },
  
  // Blockchain/Ethereum
  blockchain: {
    network: process.env.BLOCKCHAIN_NETWORK || 'mainnet',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    usdcContract: process.env.USDC_CONTRACT || '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    privateKey: process.env.PRIVATE_KEY || '',
    explorerUrl: process.env.BLOCKCHAIN_EXPLORER || 'https://etherscan.io',
  },
  
  // Platform Wallet (for receiving payments)
  platformWallet: {
    address: process.env.PLATFORM_WALLET || '0x0000000000000000000000000000000000000000',
  },
  
  // IPFS/Storage
  ipfs: {
    gateway: process.env.IPFS_GATEWAY || 'https://ipfs.io/ipfs/',
    apiUrl: process.env.IPFS_API || 'http://localhost:5001',
  },
  
  // S3/Storage
  storage: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    bucket: process.env.AWS_BUCKET || 'nexastream-videos',
    region: process.env.AWS_REGION || 'us-east-1',
  },
  
  // Email (SendGrid)
  email: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.FROM_EMAIL || 'noreply@nexastream.org',
    fromName: 'NexaStream',
  },
  
  // Twilio (SMS)
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '',
  },
  
  // Stripe
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  
  // Google Analytics
  analytics: {
    trackingId: process.env.GA_TRACKING_ID || '',
    measurementId: process.env.GA_MEASUREMENT_ID || '',
  },
  
  // SEO
  seo: {
    siteName: 'NexaStream',
    siteUrl: process.env.SITE_URL || 'https://nexastream.org',
    defaultDescription: 'The First Democratic Video Platform - Instant monetization, transparent algorithms, and creator-first economics.',
    defaultImage: 'https://nexastream.org/og-image.jpg',
  },
  
  // Moderation
  moderation: {
    enabled: true,
    autoModerate: process.env.AUTO_MODERATE === 'true',
    minTrustScore: 50,
  },
  
  // Monetization
  monetization: {
    // Revenue share per 1000 views (in USDC cents)
    baseRatePer1000Views: 100, // $1.00 per 1000 views
    creatorShare: 0.70, // 70% to creator
    platformShare: 0.20, // 20% to platform
    treasuryShare: 0.10, // 10% to treasury/DAO
    minPayoutThreshold: 1000, // $10.00 minimum payout
    maxPayoutPerVideo: 1000000, // $10,000 max per video
  },
  
  // Boosting
  boosting: {
    freeBoostPerDay: 3,
    boostCostPerLevel: {
      1: 0,      // Free
      2: 100,    // $1.00 in USDC
      3: 500,    // $5.00 in USDC
      4: 1000,   // $10.00 in USDC
      5: 5000,   // $50.00 in USDC - Featured
    },
  },
};

export default config;
