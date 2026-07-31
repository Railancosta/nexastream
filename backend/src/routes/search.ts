import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
const router = Router();
router.get('/', async (req, res) => {
  try {
    const { q, type = 'all', page = 1, limit = 20 } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    let results: any = {};
    if (type === 'all' || type === 'videos') {
      results.videos = await prisma.video.findMany({ where: { status: 'PUBLISHED', OR: [{ title: { contains: q as string, mode: 'insensitive' } }, { tags: { hasSome: [q as string] } }] }, orderBy: { viewCount: 'desc' }, skip, take: parseInt(limit as string), include: { channel: { select: { name: true } } } });
    }
    if (type === 'all' || type === 'channels') {
      results.channels = await prisma.channel.findMany({ where: { isActive: true, OR: [{ name: { contains: q as string, mode: 'insensitive' } }] }, orderBy: { subscriberCount: 'desc' }, skip, take: parseInt(limit as string) });
    }
    res.json({ success: true, data: results, query: q });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
export default router;
