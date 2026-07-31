import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
router.get('/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, name: true, username: true, avatarUrl: true, bio: true, createdAt: true } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.put('/profile', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { name, bio, avatarUrl } = req.body;
    const user = await prisma.user.update({ where: { id: userId }, data: { name, bio, avatarUrl }, select: { id: true, name: true, username: true, avatarUrl: true, bio: true } });
    res.json({ success: true, data: user });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
export default router;
