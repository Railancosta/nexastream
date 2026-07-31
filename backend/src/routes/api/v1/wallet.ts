/**
 * Wallet Routes
 * NexaStream Blockchain Integration
 */

import { Router, Request, Response } from 'express';
import { ethers } from 'ethers';
import { config } from '../../config';
import { prisma } from '../../utils/prisma';
import { authenticate } from '../../middleware/auth';
import { logger } from '../../utils/logger';

const router = Router();

// User's wallet address
const USER_USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // USDC on Ethereum

// GET /api/v1/wallet - Get user wallet
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const wallet = await prisma.wallet.findFirst({
      where: { userId }
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { usdcAddress: true }
    });

    res.json({
      success: true,
      data: {
        address: wallet?.address || null,
        balanceUsdc: wallet?.balanceUsdc || 0,
        balanceEth: wallet?.balanceEth || 0,
        usdcPaymentAddress: user?.usdcAddress || null,
        network: 'ethereum',
        explorerUrl: `${config.blockchain.explorerUrl}/address/`,
      }
    });

  } catch (error) {
    logger.error('Get wallet error:', error);
    res.status(500).json({ error: 'Failed to get wallet' });
  }
});

// POST /api/v1/wallet/connect - Connect wallet
router.post('/connect', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { address, signature } = req.body;

    // Verify address format
    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    // Optional: Verify signature
    // const message = `Connect wallet to NexaStream: ${address}`;
    // const signer = ethers.verifyMessage(message, signature);

    const wallet = await prisma.wallet.upsert({
      where: { address },
      update: { userId },
      create: {
        userId,
        address,
        network: 'ethereum',
        isPrimary: true,
      }
    });

    await prisma.user.update({
      where: { id: userId },
      data: { walletAddress: address }
    });

    logger.info(`Wallet connected: ${address} for user ${userId}`);

    res.json({
      success: true,
      message: 'Wallet connected successfully',
      data: {
        address: wallet.address,
        network: wallet.network,
      }
    });

  } catch (error) {
    logger.error('Connect wallet error:', error);
    res.status(500).json({ error: 'Failed to connect wallet' });
  }
});

// POST /api/v1/wallet/set-usdc-address - Set USDC payment address
router.post('/set-usdc-address', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { address } = req.body;

    if (!ethers.isAddress(address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { usdcAddress: address }
    });

    logger.info(`USDC address set: ${address} for user ${userId}`);

    res.json({
      success: true,
      message: 'USDC payment address updated',
      data: { usdcAddress: address }
    });

  } catch (error) {
    logger.error('Set USDC address error:', error);
    res.status(500).json({ error: 'Failed to set USDC address' });
  }
});

// GET /api/v1/wallet/balance - Get wallet balance (from blockchain)
router.get('/balance', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { address } = req.query;

    const wallet = await prisma.wallet.findFirst({
      where: { userId }
    });

    if (!wallet?.address) {
      return res.status(400).json({ error: 'No wallet connected' });
    }

    const provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);

    // Get ETH balance
    const ethBalance = await provider.getBalance(wallet.address);

    // Get USDC balance (simplified - in production use proper token ABI)
    // For now, return mock data
    const usdcBalance = wallet.balanceUsdc;

    res.json({
      success: true,
      data: {
        address: wallet.address,
        balanceEth: ethers.formatEther(ethBalance),
        balanceUsdc,
        lastSynced: wallet.updatedAt,
      }
    });

  } catch (error) {
    logger.error('Get balance error:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

// POST /api/v1/wallet/deposit - Get deposit address
router.post('/deposit', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const wallet = await prisma.wallet.findFirst({
      where: { userId }
    });

    if (!wallet?.address) {
      return res.status(400).json({ error: 'No wallet connected' });
    }

    // Generate deposit reference
    const reference = `NS-${userId.slice(0, 8)}-${Date.now().toString(36)}`;

    res.json({
      success: true,
      data: {
        depositAddress: wallet.address,
        reference,
        network: 'ethereum',
        instructions: `Send USDC or ETH to this address. Your deposits will be credited to your NexaStream wallet.`,
      }
    });

  } catch (error) {
    logger.error('Deposit error:', error);
    res.status(500).json({ error: 'Failed to generate deposit address' });
  }
});

// POST /api/v1/wallet/withdraw - Withdraw funds
router.post('/withdraw', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { amount, currency = 'USDC' } = req.body;

    const wallet = await prisma.wallet.findFirst({
      where: { userId }
    });

    if (!wallet?.address) {
      return res.status(400).json({ error: 'No wallet connected' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { usdcAddress: true }
    });

    if (!user?.usdcAddress) {
      return res.status(400).json({ error: 'Please set your USDC payment address first' });
    }

    const balance = currency === 'USDC' ? wallet.balanceUsdc : wallet.balanceEth;

    if (amount > balance) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Check minimum withdrawal
    if (amount < config.monetization.minPayoutThreshold / 100) {
      return res.status(400).json({
        error: `Minimum withdrawal is $${config.monetization.minPayoutThreshold / 100}`
      });
    }

    // Create withdrawal transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: 'WITHDRAWAL',
        status: 'PROCESSING',
        amount,
        currency,
        fee: amount * 0.01, // 1% fee
        netAmount: amount * 0.99,
        toAddress: user.usdcAddress,
        description: `Withdrawal of ${amount} ${currency}`,
      }
    });

    // In production, this would initiate blockchain transaction
    // For now, simulate success
    setTimeout(async () => {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          txHash: '0x' + Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2),
        }
      });

      await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balanceUsdc: currency === 'USDC' ? { decrement: amount } : undefined,
          balanceEth: currency === 'ETH' ? { decrement: amount } : undefined,
          totalWithdrawn: { increment: amount },
        }
      });
    }, 5000);

    logger.info(`Withdrawal initiated: ${amount} ${currency} for user ${userId}`);

    res.json({
      success: true,
      message: 'Withdrawal initiated',
      data: {
        transactionId: transaction.id,
        amount,
        currency,
        fee: amount * 0.01,
        netAmount: amount * 0.99,
        estimatedTime: '5-30 minutes',
      }
    });

  } catch (error) {
    logger.error('Withdraw error:', error);
    res.status(500).json({ error: 'Failed to initiate withdrawal' });
  }
});

// GET /api/v1/wallet/transactions - Get transaction history
router.get('/transactions', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where: { userId } })
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });

  } catch (error) {
    logger.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

export default router;
