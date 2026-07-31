import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
router.get('/stats', authenticate, async (req, res) => {
  try {
    const [users, channels, videos] = await Promise.all([prisma.user.count(), prisma.channel.count(), prisma.video.count({ where: { status: 'PUBLISHED' } })]);
    res.json({ success: true, data: { totalUsers: users, totalChannels: channels, totalVideos: videos } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
export default router;
