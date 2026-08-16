import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDB } from '../db/database.js';

const router = Router();

// Get wallet info
router.get('/info', (req, res) => {
  res.json({
    network: 'NexaChain',
    consensus: 'PoW/PoS Hybrid',
    chainId: 1,
    rpcUrl: 'https://rpc.nexastream.org',
    explorerUrl: 'https://explorer.nexastream.org'
  });
});

// Get token balance
router.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Mock balance - in production, query blockchain
    res.json({
      address,
      balances: {
        NEXA: {
          balance: '1542.50',
          pending: '230.00',
          usdValue: 41.50
        },
        ETH: {
          balance: '0.05',
          usdValue: 100.00
        }
      }
    });
  } catch (error) {
    console.error('Balance error:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

// Get transactions
router.get('/transactions/:address', (req, res) => {
  try {
    const { address } = req.params;
    
    const transactions = [
      {
        id: uuidv4(),
        type: 'receive',
        amount: 100,
        token: 'NEXA',
        from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
        to: address,
        hash: '0x' + uuidv4().replace(/-/g, ''),
        timestamp: new Date().toISOString(),
        status: 'confirmed'
      },
      {
        id: uuidv4(),
        type: 'send',
        amount: 50,
        token: 'NEXA',
        from: address,
        to: '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
        hash: '0x' + uuidv4().replace(/-/g, ''),
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        status: 'confirmed'
      },
      {
        id: uuidv4(),
        type: 'reward',
        amount: 25,
        token: 'NEXA',
        from: '0x0000000000000000000000000000000000000000',
        to: address,
        hash: '0x' + uuidv4().replace(/-/g, ''),
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        status: 'confirmed'
      }
    ];
    
    res.json({ transactions });
  } catch (error) {
    console.error('Transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// Send transaction
router.post('/send', async (req, res) => {
  try {
    const { to, amount, token = 'NEXA' } = req.body;
    
    if (!to || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Mock transaction
    const txHash = '0x' + uuidv4().replace(/-/g, '');
    
    res.json({
      success: true,
      txHash,
      from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
      to,
      amount,
      token,
      fee: 0.001,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Send error:', error);
    res.status(500).json({ error: 'Transaction failed' });
  }
});

// Connect wallet (mock)
router.post('/connect', (req, res) => {
  try {
    const { signature, address } = req.body;
    
    // In production, verify signature
    res.json({
      success: true,
      address,
      message: 'Wallet connected successfully'
    });
  } catch (error) {
    console.error('Connect error:', error);
    res.status(500).json({ error: 'Connection failed' });
  }
});

export default router;
