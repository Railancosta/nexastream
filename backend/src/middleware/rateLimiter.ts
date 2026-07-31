import rateLimit from 'express-rate-limit';
export const rateLimiters = {
  global: rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, message: { error: 'Too Many Requests' } }),
  api: rateLimit({ windowMs: 1 * 60 * 1000, max: 100, message: { error: 'API Rate Limit Exceeded' } }),
  auth: rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Auth Rate Limit Exceeded' } }),
  login: rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { error: 'Account Locked' } })
};
