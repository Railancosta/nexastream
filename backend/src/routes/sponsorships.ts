import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
router.get('/', async (req, res) => {
  try {
    const sponsorships = await prisma.sponsorship.findMany({ where: { status: 'ACTIVE' }, include: { channel: { select: { name: true, slug: true } } }, take: 20 });
    res.json({ success: true, data: sponsorships });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.post('/', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const channel = await prisma.channel.findUnique({ where: { userId } });
    if (!channel) return res.status(400).json({ error: 'Create a channel first' });
    const { sponsorName, title, description, totalBudget, costPerView, maxViews } = req.body;
    const sponsorship = await prisma.sponsorship.create({ data: { channelId: channel.id, sponsorName, title, description, totalBudget, costPerView, maxViews, startDate: new Date(), endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } });
    res.status(201).json({ success: true, data: sponsorship });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
export default router;
