import { Router } from 'express';
import { ethers } from 'ethers';
import { prisma } from '../utils/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { config } from '../config/index.js';
const router = Router();
const USDC_ADDRESS = config.blockchain.usdcContract;
const USER_USDC_ADDR = config.userPaymentAddress;
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const wallet = await prisma.wallet.findFirst({ where: { userId } });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { usdcAddress: true } });
    res.json({ success: true, data: { address: wallet?.address || null, balanceUsdc: wallet?.balanceUsdc || 0, balanceEth: wallet?.balanceEth || 0, usdcPaymentAddress: user?.usdcAddress || USER_USDC_ADDR, network: 'ethereum', explorerUrl: config.blockchain.explorerUrl } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.post('/connect', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { address } = req.body;
    if (!ethers.isAddress(address)) return res.status(400).json({ error: 'Invalid Ethereum address' });
    const wallet = await prisma.wallet.upsert({ where: { address }, update: { userId }, create: { userId, address, isPrimary: true } });
    await prisma.user.update({ where: { id: userId }, data: { walletAddress: address } });
    res.json({ success: true, message: 'Wallet connected', data: { address: wallet.address } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.post('/set-usdc-address', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { address } = req.body;
    if (!ethers.isAddress(address)) return res.status(400).json({ error: 'Invalid Ethereum address' });
    await prisma.user.update({ where: { id: userId }, data: { usdcAddress: address } });
    res.json({ success: true, message: 'USDC payment address updated', data: { usdcAddress: address } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.get('/balance', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const wallet = await prisma.wallet.findFirst({ where: { userId } });
    if (!wallet?.address) return res.status(400).json({ error: 'No wallet connected' });
    const provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);
    const ethBalance = await provider.getBalance(wallet.address);
    res.json({ success: true, data: { address: wallet.address, balanceEth: Number(ethers.formatEther(ethBalance)).toFixed(6), balanceUsdc: wallet.balanceUsdc } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.post('/withdraw', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { amount, currency = 'USDC' } = req.body;
    const wallet = await prisma.wallet.findFirst({ where: { userId } });
    if (!wallet?.address) return res.status(400).json({ error: 'No wallet connected' });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { usdcAddress: true } });
    const payoutAddr = user?.usdcAddress || USER_USDC_ADDR;
    if (amount > (currency === 'USDC' ? wallet.balanceUsdc : wallet.balanceEth)) return res.status(400).json({ error: 'Insufficient balance' });
    if (amount < 10) return res.status(400).json({ error: 'Minimum withdrawal is $10' });
    const fee = amount * 0.01;
    const tx = await prisma.transaction.create({ data: { userId, type: 'WITHDRAWAL', amount, currency, fee, netAmount: amount - fee, toAddress: payoutAddr, description: `Withdrawal of ${amount} ${currency} to ${payoutAddr}` } });
    res.json({ success: true, message: 'Withdrawal initiated', data: { transactionId: tx.id, amount, currency, fee, netAmount: amount - fee, toAddress: payoutAddr } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      prisma.transaction.count({ where: { userId } })
    ]);
    res.json({ success: true, data: transactions, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});
export default router;
