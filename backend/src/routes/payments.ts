import { Router } from 'express';
import { prisma } from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.js';
const router = Router();
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const wallet = await prisma.wallet.findFirst({ where: { userId } });
    const earnings = await prisma.video.aggregate({ where: { channel: { userId }, status: 'PUBLISHED' }, _sum: { earningsUsdc: true } });
    const transactions = await prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10 });
    res.json({ success: true, data: { balanceUsdc: wallet?.balanceUsdc || 0, balanceEth: wallet?.balanceEth || 0, totalEarnings: earnings._sum.earningsUsdc || 0, recentTransactions: transactions } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.post('/deposit', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const wallet = await prisma.wallet.findFirst({ where: { userId } });
    if (!wallet?.address) return res.status(400).json({ error: 'Connect wallet first' });
    res.json({ success: true, data: { depositAddress: wallet.address, network: 'ethereum', instructions: 'Send USDC or ETH to this address' } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
export default router;
