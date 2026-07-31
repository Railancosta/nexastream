import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
const router = Router();
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const sort = req.query.sort as string || 'subscribers';
    let orderBy: any = { subscriberCount: 'desc' };
    if (sort === 'earnings') orderBy = { totalEarnings: 'desc' };
    if (sort === 'recent') orderBy = { createdAt: 'desc' };
    const [channels, total] = await Promise.all([
      prisma.channel.findMany({ where: { isActive: true }, orderBy, skip: (page - 1) * limit, take: limit, select: { id: true, name: true, slug: true, description: true, avatarUrl: true, bannerUrl: true, category: true, subscriberCount: true, videoCount: true, totalEarnings: true, isVerified: true, createdAt: true } }),
      prisma.channel.count({ where: { isActive: true } })
    ]);
    res.json({ success: true, data: channels, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const channel = await prisma.channel.findUnique({ where: { id: req.params.id }, include: { user: { select: { name: true, username: true } } } });
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    res.json({ success: true, data: channel });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.get('/:id/videos', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const [videos, total] = await Promise.all([
      prisma.video.findMany({ where: { channelId: req.params.id, status: 'PUBLISHED' }, orderBy: { publishedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.video.count({ where: { channelId: req.params.id, status: 'PUBLISHED' } })
    ]);
    res.json({ success: true, data: videos, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { name, description, category } = req.body;
    const exists = await prisma.channel.findUnique({ where: { userId } });
    if (exists) return res.status(400).json({ error: 'You already have a channel' });
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const channel = await prisma.channel.create({ data: { userId, name, slug, description, category: category || 'Entertainment' } });
    res.status(201).json({ success: true, data: channel });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.post('/:id/subscribe', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const channel = await prisma.channel.findUnique({ where: { id } });
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    if (channel.userId === userId) return res.status(400).json({ error: 'Cannot subscribe to own channel' });
    await prisma.channel.update({ where: { id }, data: { subscriberCount: { increment: 1 } } });
    res.json({ success: true, subscribed: true });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
export default router;
