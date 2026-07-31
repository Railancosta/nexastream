import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { optionalAuth } from '../middleware/auth.js';
const router = Router();
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { type = 'foryou', page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    let orderBy: any = { viewCount: 'desc' };
    if (type === 'trending') orderBy = [{ boostLevel: 'desc' }, { viewCount: 'desc' }];
    if (type === 'new') orderBy = { publishedAt: 'desc' };
    const videos = await prisma.video.findMany({ where: { status: 'PUBLISHED', visibility: 'PUBLIC' }, orderBy, skip, take: parseInt(limit as string), include: { channel: { select: { id: true, name: true, slug: true, avatarUrl: true } } } });
    res.json({ success: true, data: videos, feedType: type });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
export default router;
