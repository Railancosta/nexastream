import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { config } from '../config/index.js';
const router = Router();
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const category = req.query.category as string;
    const sort = req.query.sort as string || 'trending';
    let orderBy: any = { viewCount: 'desc' };
    if (sort === 'recent') orderBy = { publishedAt: 'desc' };
    if (sort === 'earnings') orderBy = { earningsUsdc: 'desc' };
    const where: any = { status: 'PUBLISHED', visibility: 'PUBLIC' };
    if (category) where.category = category;
    const [videos, total] = await Promise.all([
      prisma.video.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, include: { channel: { select: { id: true, name: true, slug: true, avatarUrl: true } } } }),
      prisma.video.count({ where })
    ]);
    res.json({ success: true, data: videos, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.get('/trending', async (req, res) => {
  try {
    const videos = await prisma.video.findMany({ where: { status: 'PUBLISHED', visibility: 'PUBLIC' }, orderBy: [{ boostLevel: 'desc' }, { viewCount: 'desc' }], take: 20, include: { channel: { select: { name: true, slug: true, avatarUrl: true } } } });
    res.json({ success: true, data: videos });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const video = await prisma.video.findUnique({ where: { id: req.params.id }, include: { channel: true } });
    if (!video) return res.status(404).json({ error: 'Video not found' });
    await prisma.video.update({ where: { id: req.params.id }, data: { viewCount: { increment: 1 } } });
    res.json({ success: true, data: video });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { title, description, thumbnailUrl, videoUrl, duration, category, tags } = req.body;
    const channel = await prisma.channel.findUnique({ where: { userId } });
    if (!channel) return res.status(400).json({ error: 'Create a channel first' });
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36);
    const video = await prisma.video.create({ data: { channelId: channel.id, title, description, thumbnailUrl, videoUrl, duration: duration || 0, category: category || 'Entertainment', tags: tags || [], slug, status: 'PUBLISHED', publishedAt: new Date() } });
    await prisma.channel.update({ where: { id: channel.id }, data: { videoCount: { increment: 1 } } });
    res.status(201).json({ success: true, data: video });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.post('/:id/like', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const existing = await prisma.like.findUnique({ where: { userId_videoId: { userId, videoId: id } } });
    if (existing) {
      await prisma.like.delete({ where: { id: existing.id } });
      await prisma.video.update({ where: { id }, data: { likeCount: { decrement: 1 } } });
      return res.json({ success: true, action: 'unliked' });
    }
    await prisma.like.create({ data: { userId, videoId: id } });
    await prisma.video.update({ where: { id }, data: { likeCount: { increment: 1 } } });
    res.json({ success: true, action: 'liked' });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.post('/:id/boost', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { level } = req.body;
    const cost = config.boosting.costs[level] || 0;
    const boost = await prisma.boost.create({ data: { videoId: id, userId, level, costUsdc: cost / 100, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
    await prisma.video.update({ where: { id }, data: { boostLevel: { set: level }, boostedCount: { increment: 1 } } });
    res.json({ success: true, data: boost, message: `Video boosted to level ${level}` });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
export default router;
