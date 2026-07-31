import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`[${req.method}] ${req.path}: ${err.message}`);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
};
