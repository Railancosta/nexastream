/**
 * Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../utils/prisma';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
    
    const session = await prisma.session.findUnique({
      where: { token },
      select: { isActive: true, expiresAt: true }
    });

    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    if (!session.isActive) {
      return res.status(401).json({ error: 'Session expired' });
    }

    if (new Date() > session.expiresAt) {
      return res.status(401).json({ error: 'Session expired' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, username: true, isBanned: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.isBanned) {
      return res.status(403).json({ error: 'Account suspended' });
    }

    req.user = user;
    next();

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
    
    const session = await prisma.session.findUnique({
      where: { token },
      select: { isActive: true }
    });

    if (session?.isActive) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, username: true }
      });
      req.user = user || undefined;
    }

    next();

  } catch {
    next();
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  // TODO: Implement admin check
  // For now, just pass through
  next();
};
