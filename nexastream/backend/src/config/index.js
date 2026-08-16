module.exports = {
  // Server
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'nexastream-secret-2024-super-secure',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  REFRESH_TOKEN_EXPIRES: process.env.REFRESH_TOKEN_EXPIRES || '30d',
  
  // Database
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT || 5432,
  DB_NAME: process.env.DB_NAME || 'nexastream',
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
  
  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Blockchain
  BLOCKCHAIN_RPC: process.env.BLOCKCHAIN_RPC || 'http://localhost:8545',
  NFT_CONTRACT: process.env.NFT_CONTRACT || '',
  TOKEN_CONTRACT: process.env.TOKEN_CONTRACT || '',
  
  // AWS S3
  AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY || '',
  AWS_SECRET_KEY: process.env.AWS_SECRET_KEY || '',
  AWS_BUCKET: process.env.AWS_BUCKET || 'nexastream-uploads',
  AWS_REGION: process.env.AWS_REGION || 'us-east-1',
  
  // Cloudflare
  CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN || '',
  CLOUDFLARE_ZONE_ID: process.env.CLOUDFLARE_ZONE_ID || '',
  
  // Email
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: process.env.SMTP_PORT || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  
  // Twilio (SMS)
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE: process.env.TWILIO_PHONE || '',
  
  // Limits
  MAX_UPLOAD_SIZE: 500 * 1024 * 1024, // 500MB
  VIDEO_MAX_DURATION: 7200, // 2 hours in seconds
  THUMBNAIL_MAX_SIZE: 5 * 1024 * 1024, // 5MB
  
  // Rewards
  REWARD_PER_VIEW: 0.01, // NEXA
  CREATOR_SHARE: 70, // 70%
  PLATFORM_SHARE: 30, // 30%
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: 100,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
};
