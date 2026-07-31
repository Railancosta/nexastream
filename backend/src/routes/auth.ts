import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { config } from '../config/index.js';
import { prisma } from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
const googleClient = new OAuth2Client(config.google.clientId);
const registerSchema = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().min(2), username: z.string().regex(/^[a-zA-Z0-9_]+$/) });
const loginSchema = z.object({ email: z.string().email(), password: z.string() });
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, username } = req.body;
    const exists = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
    if (exists) return res.status(400).json({ error: 'User already exists' });
    const passwordHash = await bcrypt.hash(password, 14);
    const user = await prisma.user.create({ data: { email, passwordHash, name, username: username.toLowerCase() } });
    const token = jwt.sign({ userId: user.id }, config.jwt.secret, { expiresIn: config.jwt.accessExpiry });
    const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, config.jwt.secret, { expiresIn: config.jwt.refreshExpiry });
    await prisma.session.create({ data: { userId: user.id, token, refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
    res.status(201).json({ success: true, user: { id: user.id, email, name, username }, accessToken: token, refreshToken });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email }, include: { channel: true } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.isBanned) return res.status(403).json({ error: 'Account suspended' });
    if (!user.passwordHash) return res.status(401).json({ error: 'Use Google Sign-In' });
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id }, config.jwt.secret, { expiresIn: config.jwt.accessExpiry });
    const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, config.jwt.secret, { expiresIn: config.jwt.refreshExpiry });
    await prisma.session.create({ data: { userId: user.id, token, refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
    res.json({ success: true, user: { id: user.id, email, name: user.name, username: user.username, avatarUrl: user.avatarUrl, channel: user.channel }, accessToken: token, refreshToken });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await googleClient.verifyIdToken({ idToken: token, audience: config.google.clientId });
    const payload = ticket.getPayload();
    if (!payload) return res.status(401).json({ error: 'Invalid Google token' });
    let user = await prisma.user.findUnique({ where: { email: payload.email! } });
    if (!user) {
      const baseUsername = payload.email!.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      user = await prisma.user.create({ data: { email: payload.email!, googleId: payload.sub, name: payload.name || baseUsername, username: baseUsername, avatarUrl: payload.picture, emailVerified: true } });
    }
    const accessToken = jwt.sign({ userId: user.id }, config.jwt.secret, { expiresIn: config.jwt.accessExpiry });
    res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, username: user.username, avatarUrl: user.avatarUrl }, accessToken });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, config.jwt.secret) as { userId: string };
    const session = await prisma.session.findUnique({ where: { refreshToken, isActive: true } });
    if (!session) return res.status(401).json({ error: 'Invalid session' });
    const newToken = jwt.sign({ userId: decoded.userId }, config.jwt.secret, { expiresIn: config.jwt.accessExpiry });
    await prisma.session.update({ where: { id: session.id }, data: { token: newToken, lastActivity: new Date() } });
    res.json({ success: true, accessToken: newToken });
  } catch { res.status(401).json({ error: 'Token refresh failed' }); }
});
router.post('/logout', authenticate, async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) await prisma.session.updateMany({ where: { token }, data: { isActive: false } });
  res.json({ success: true });
});
router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: (req as any).user.id }, select: { id: true, email: true, name: true, username: true, avatarUrl: true, bio: true, walletAddress: true, usdcAddress: true, channel: true, createdAt: true } });
  res.json({ success: true, user });
});
export default router;
