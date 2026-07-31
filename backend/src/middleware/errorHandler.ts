/**
 * Error Handler Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let stack = undefined;

  // Log error
  if (statusCode >= 500) {
    logger.error(`[${req.method}] ${req.path}: ${message}`, {
      statusCode,
      stack: err.stack,
      body: req.body,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  } else if (statusCode >= 400) {
    logger.warn(`[${req.method}] ${req.path}: ${message}`, {
      statusCode,
      ip: req.ip,
    });
  }

  // Don't leak stack traces in production
  if (config.nodeEnv === 'development' || statusCode < 500) {
    stack = err.stack;
  }

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  }

  if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = 'Unauthorized';
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    statusCode = 400;
    message = 'Database Error';
    
    // Handle unique constraint violations
    if (err.code === 'P2002') {
      message = 'A record with this value already exists';
    }
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'File too large';
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(stack && config.nodeEnv === 'development' && { stack }),
    ...(err.details && { details: err.details }),
    timestamp: new Date().toISOString(),
  });
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  });
};
