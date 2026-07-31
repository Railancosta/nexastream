import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
router.get('/channel', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const channel = await prisma.channel.findUnique({ where: { userId } });
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    const videos = await prisma.video.findMany({ where: { channelId: channel.id }, select: { id: true, title: true, viewCount: true, likeCount: true, earningsUsdc: true } });
    res.json({ success: true, data: { channel, videos, totalViews: videos.reduce((a, v) => a + Number(v.viewCount), 0), totalEarnings: videos.reduce((a, v) => a + v.earningsUsdc, 0) } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
export default router;
