import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../utils/prisma.js';
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
    const session = await prisma.session.findUnique({ where: { token, isActive: true } });
    if (!session) return res.status(401).json({ error: 'Invalid session' });
    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, email: true, username: true, isBanned: true } });
    if (!user) return res.status(401).json({ error: 'User not found' });
    if (user.isBanned) return res.status(403).json({ error: 'Account suspended' });
    (req as any).user = user;
    next();
  } catch { res.status(401).json({ error: 'Authentication failed' }); }
};
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const decoded = jwt.verify(token, config.jwt.secret) as { userId: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, email: true, username: true } });
      (req as any).user = user || undefined;
    }
  } catch {}
  next();
};
