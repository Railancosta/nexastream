/**
 * Security Configuration
 * Military-Grade Security Settings
 */

export const securityConfig = {
  password: {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90 * 24 * 60 * 60 * 1000,
    preventReuse: 5,
  },
  session: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    maxConcurrentSessions: 5,
    idleTimeout: 30 * 60 * 1000,
    secureCookies: true,
    httpOnly: true,
    sameSite: 'strict',
  },
  jwt: {
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    algorithm: 'HS256',
    issuer: 'nexastream',
  },
  blockchain: {
    maxWithdrawalPerDay: 10000,
    minWithdrawal: 10,
    withdrawalFee: 0.01,
    requireMultipleConfirmations: 3,
    txTimeout: 30 * 60 * 1000,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: {
      global: 1000,
      api: 100,
      auth: 20,
      login: 5,
      register: 5,
    },
  },
  twoFactor: {
    window: 1,
    digits: 6,
    algorithm: 'SHA1',
    period: 30,
  },
};

export default securityConfig;
