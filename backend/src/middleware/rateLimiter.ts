/**
 * Rate Limiting Middleware
 * Military-Grade Protection
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { securityLogger } from '../utils/logger';

export const rateLimiters = {
  // Global rate limiter
  global: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
    message: {
      error: 'Too Many Requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        error: 'Too Many Requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 900
      });
    }
  }),

  // API rate limiter
  api: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100,
    message: {
      error: 'API Rate Limit Exceeded',
      code: 'API_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Auth rate limiter
  auth: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: {
      error: 'Too Many Authentication Attempts',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: 900
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      securityLogger.warn(`Brute force attempt detected: ${req.ip}`, {
        path: req.path,
        email: req.body?.email
      });
      res.status(429).json({
        error: 'Too Many Authentication Attempts',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: 900,
        alert: 'Multiple failed login attempts detected'
      });
    }
  }),

  // Login rate limiter (strict)
  login: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: {
      error: 'Account temporarily locked',
      code: 'ACCOUNT_LOCKED',
      retryAfter: 3600
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      return req.body?.email || req.ip || 'unknown';
    },
    handler: (req: Request, res: Response) => {
      securityLogger.warn(`Account lockout triggered: ${req.ip}`, {
        email: req.body?.email
      });
      res.status(429).json({
        error: 'Account temporarily locked',
        code: 'ACCOUNT_LOCKED',
        retryAfter: 3600,
        message: 'Too many failed login attempts. Please try again later.'
      });
    }
  }),

  // Registration rate limiter
  register: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: {
      error: 'Registration limit exceeded',
      code: 'REGISTRATION_LIMITED'
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Video upload rate limiter
  upload: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: {
      error: 'Upload limit exceeded',
      code: 'UPLOAD_LIMITED'
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Payment rate limiter
  payment: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: {
      error: 'Payment rate limit exceeded',
      code: 'PAYMENT_RATE_LIMITED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      securityLogger.warn(`Payment rate limit exceeded: ${req.ip}`);
      res.status(429).json({
        error: 'Payment rate limit exceeded',
        code: 'PAYMENT_RATE_LIMITED'
      });
    }
  }),

  // Search rate limiter
  search: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30,
    message: {
      error: 'Search rate limit exceeded',
      code: 'SEARCH_RATE_LIMITED'
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),
};
