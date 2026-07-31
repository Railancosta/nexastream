/**
 * NexaStream Configuration v3.0
 */

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'https://nexastream.org'],
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/nexastream',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'nexastream-super-secret-jwt-key-2024-change-in-production',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },
  
  blockchain: {
    network: process.env.BLOCKCHAIN_NETWORK || 'mainnet',
    rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
    usdcContract: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    explorerUrl: 'https://etherscan.io',
  },
  
  // Platform wallet for receiving payments
  platformWallet: process.env.PLATFORM_WALLET || '0xa453B71A216a8A6608e79247B162df47B2770899',
  
  // User's USDC payment address
  userPaymentAddress: '0xa453B71A216a8A6608e79247B162df47B2770899',
  
  // Google Analytics
  analytics: {
    trackingId: process.env.GA_TRACKING_ID || '',
    measurementId: process.env.GA_MEASUREMENT_ID || '',
  },
  
  // SEO
  seo: {
    siteName: 'NexaStream',
    siteUrl: process.env.SITE_URL || 'https://nexastream.org',
    description: 'The First Democratic Video Platform - Instant monetization, transparent algorithms, and blockchain payments.',
  },
  
  // Monetization
  monetization: {
    baseRatePer1000Views: 100, // $1.00 per 1000 views in USDC cents
    creatorShare: 0.70, // 70% to creator
    platformShare: 0.20, // 20% to platform
    treasuryShare: 0.10, // 10% to treasury/DAO
    minPayoutThreshold: 1000, // $10.00 minimum
    maxPayoutPerVideo: 1000000, // $10,000 max
  },
  
  // Boosting costs (in USDC cents)
  boosting: {
    freeBoostsPerDay: 3,
    costs: { 1: 0, 2: 100, 3: 500, 4: 1000, 5: 5000 },
  },
  
  // Email
  email: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.FROM_EMAIL || 'noreply@nexastream.org',
  },
  
  // PIX/Brazil integration
  pix: {
    enabled: process.env.PIX_ENABLED === 'true',
    apiKey: process.env.PIX_API_KEY || '',
    webhookUrl: process.env.PIX_WEBHOOK_URL || '',
  },
};

export default config;
