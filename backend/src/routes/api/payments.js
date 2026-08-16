const express = require('express');
const router = express.Router();
const { sequelize, Transaction, User, Channel } = require('../../models');
const { auth } = require('../../middleware');
const config = require('../../config');
const { isValidAddress } = require('../../utils/wallet');
const blockchainVerify = require('../../services/blockchainVerify');

// GET WALLET BALANCE
router.get('/balance', auth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: ['id', 'walletAddress', 'balance', 'pendingRewards', 'totalEarnings']
    });
    res.json({
      address: user.walletAddress,
      balance: user.balance || 0,
      pendingRewards: user.pendingRewards || 0,
      totalEarnings: user.totalEarnings || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

// GET TRANSACTIONS
router.get('/transactions', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50, type } = req.query;
    const where = { userId: req.user.userId };
    if (type) where.type = type;
    const { rows: transactions, count } = await Transaction.findAndCountAll({
      where, order: [['createdAt', 'DESC']],
      limit: parseInt(limit), offset: (parseInt(page) - 1) * parseInt(limit)
    });
    res.json({ transactions, total: count });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

/**
 * DEPOSIT
 *
 * A deposit is created as 'pending'. Balance is credited ONLY after the
 * on-chain transaction is verified (exists, succeeded, enough confirmations,
 * sender/recipient/amount match, and not already credited). Verification is
 * attempted synchronously if the RPC is configured; otherwise it stays pending
 * and a background confirmer (see scripts/confirmDeposits.js) settles it later.
 */
router.post('/deposit', auth, async (req, res) => {
  try {
    const { amount, txHash, fromAddress, toAddress, currency = 'NEXA' } = req.body;
    if (!txHash || !amount) return res.status(400).json({ error: 'txHash and amount are required' });
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });

    // Idempotency: never credit the same on-chain tx twice.
    const existing = await Transaction.findOne({ where: { txHash, type: 'deposit' } });
    if (existing) {
      return res.status(409).json({ error: 'Deposit already recorded', transaction: existing });
    }

    const user = await User.findByPk(req.user.userId);

    const tx = await Transaction.create({
      userId: user.id, type: 'deposit', amount: amt, currency,
      status: 'pending', txHash,
      fromAddress: fromAddress || null,
      toAddress: toAddress || user.walletAddress,
      metadata: { claimedAt: new Date().toISOString() }
    });

    // Try to verify immediately if the chain is reachable.
    if (blockchainVerify.isConfigured()) {
      const result = await blockchainVerify.verifyDeposit({
        txHash, fromAddress, toAddress: toAddress || user.walletAddress, amount: amt, currency
      }).catch(err => ({ ok: false, reason: err.message }));

      if (result.ok) {
        // Credit balance atomically.
        await sequelize.transaction(async (t) => {
          const locked = await User.findByPk(user.id, { transaction: t, lock: t.LOCK.UPDATE });
          await locked.update({ balance: parseFloat(locked.balance || 0) + amt }, { transaction: t });
          await tx.update({ status: 'completed', metadata: { ...tx.metadata, confirmedAt: new Date().toISOString(), confirmations: result.confirmations } }, { transaction: t });
        });
        return res.json({ success: true, transaction: tx, status: 'completed' });
      }
      // Still pending — leave as-is; confirmer will settle.
      return res.json({ success: true, transaction: tx, status: 'pending', reason: result.reason });
    }

    res.json({ success: true, transaction: tx, status: 'pending', reason: 'On-chain verification pending' });
  } catch (error) {
    res.status(500).json({ error: 'Deposit failed' });
  }
});

/**
 * WITHDRAW
 *
 * Deducts the balance atomically (row lock) at request time and records a
 * pending withdrawal. The on-chain broadcast happens server-side from the user's
 * encrypted key. If the broadcast fails, the transaction is marked 'failed' and
 * the balance is refunded atomically — no funds are lost or double-spent.
 */
router.post('/withdraw', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { toAddress, amount, currency = 'NEXA' } = req.body;
    if (!toAddress || !amount) return res.status(400).json({ error: 'toAddress and amount are required' });
    if (!isValidAddress(toAddress)) return res.status(400).json({ error: 'Invalid recipient address' });
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const user = await User.findByPk(req.user.userId, { transaction: t, lock: t.LOCK.UPDATE });
    const balance = parseFloat(user.balance || 0);
    if (balance < amt) {
      await t.rollback();
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Reserve the funds immediately.
    await user.update({ balance: balance - amt }, { transaction: t });
    const tx = await Transaction.create({
      userId: user.id, type: 'withdrawal', amount: amt, currency,
      status: 'pending', toAddress, fromAddress: user.walletAddress
    }, { transaction: t });
    await t.commit();

    // Broadcast on-chain outside the DB transaction. If it fails, refund.
    try {
      if (!blockchainVerify.isConfigured()) {
        // No live chain: keep as 'pending' so an operator/queue can settle it.
        return res.json({ success: true, transaction: tx, status: 'pending', reason: 'On-chain broadcast pending' });
      }
      const result = await blockchainVerify.broadcastWithdrawal({
        encryptedPrivateKey: user.walletPrivateKey, toAddress, amount: amt
      });
      await tx.update({ status: 'completed', txHash: result.txHash, metadata: { broadcastAt: new Date().toISOString() } });
      return res.json({ success: true, transaction: tx, status: 'completed' });
    } catch (broadcastErr) {
      // Refund the reserved funds atomically.
      const refund = await sequelize.transaction();
      try {
        const u = await User.findByPk(user.id, { transaction: refund, lock: refund.LOCK.UPDATE });
        await u.update({ balance: parseFloat(u.balance || 0) + amt }, { transaction: refund });
        await tx.update({ status: 'failed', metadata: { ...tx.metadata, error: broadcastErr.message } }, { transaction: refund });
        await refund.commit();
      } catch (refundErr) {
        await refund.rollback();
        // Critical: log to alerts. Balance was deducted but broadcast+refund failed.
        require('../../services/alerts').emit('withdrawal_refund_failed', {
          userId: user.id, transactionId: tx.id, amount: amt, error: refundErr.message
        });
        return res.status(500).json({ error: 'Withdrawal broadcast failed and refund could not complete; support has been alerted', transaction: tx });
      }
      return res.status(502).json({ error: `Withdrawal broadcast failed: ${broadcastErr.message}`, transaction: tx });
    }
  } catch (error) {
    if (!t.finished) await t.rollback();
    res.status(500).json({ error: 'Withdrawal failed' });
  }
});

/**
 * EXCHANGE (swap NST <-> stablecoin)
 *
 * Records the swap as a transaction. Actual settlement requires an on-chain AMM
 * or exchange integration; if not configured, the swap is recorded as 'pending'
 * and the operator queue settles it. No balance is mutated until settlement.
 */
router.post('/exchange', auth, async (req, res) => {
  try {
    const { fromCurrency, toCurrency, amount } = req.body;
    if (!fromCurrency || !toCurrency || !amount) return res.status(400).json({ error: 'fromCurrency, toCurrency and amount are required' });
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const tx = await Transaction.create({
      userId: req.user.userId, type: 'purchase', // reuse enum; metadata carries swap intent
      amount: amt, currency: fromCurrency,
      status: 'pending',
      metadata: { kind: 'exchange', fromCurrency, toCurrency, requestedAt: new Date().toISOString() }
    });

    if (!blockchainVerify.isConfigured()) {
      return res.json({ success: true, transaction: tx, status: 'pending', reason: 'On-chain swap settlement pending' });
    }
    // When an AMM/exchange integration is configured, settle here.
    return res.json({ success: true, transaction: tx, status: 'pending', reason: 'Settlement integration pending' });
  } catch (error) {
    res.status(500).json({ error: 'Exchange failed' });
  }
});

// TIP CREATOR
router.post('/tip', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { channelId, amount, videoId } = req.body;
    if (!channelId || !amount) return res.status(400).json({ error: 'channelId and amount are required' });
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: 'Invalid amount' });

    const sender = await User.findByPk(req.user.userId, { transaction: t, lock: t.LOCK.UPDATE });
    if (parseFloat(sender.balance || 0) < amt) {
      await t.rollback();
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    const channel = await Channel.findByPk(channelId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!channel) { await t.rollback(); return res.status(404).json({ error: 'Channel not found' }); }

    await sender.update({ balance: parseFloat(sender.balance || 0) - amt }, { transaction: t });
    await channel.update({ totalEarnings: parseFloat(channel.totalEarnings || 0) + amt }, { transaction: t });
    const tipTx = await Transaction.create({
      userId: sender.id, type: 'tip', amount: amt, currency: 'NEXA',
      status: 'completed', metadata: { channelId, videoId }
    }, { transaction: t });
    await t.commit();
    res.json({ success: true, transaction: tipTx });
  } catch (error) {
    if (!t.finished) await t.rollback();
    res.status(500).json({ error: 'Tip failed' });
  }
});

// SUBSCRIPTION PAYMENT
router.post('/subscribe', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { channelId, tier, billingCycle } = req.body;
    const prices = { 1: 4.99, 2: 9.99, 3: 24.99 };
    const price = prices[tier] || 4.99;

    const sender = await User.findByPk(req.user.userId, { transaction: t, lock: t.LOCK.UPDATE });
    if (parseFloat(sender.balance || 0) < price) {
      await t.rollback();
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    const channel = await Channel.findByPk(channelId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!channel) { await t.rollback(); return res.status(404).json({ error: 'Channel not found' }); }

    await sender.update({ balance: parseFloat(sender.balance || 0) - price }, { transaction: t });
    await channel.update({ totalEarnings: parseFloat(channel.totalEarnings || 0) + (price * 0.7) }, { transaction: t });
    const tx = await Transaction.create({
      userId: sender.id, type: 'subscription', amount: price, currency: 'USD',
      status: 'completed', metadata: { channelId, tier, billingCycle }
    }, { transaction: t });
    await t.commit();
    res.json({ success: true, transaction: tx });
  } catch (error) {
    if (!t.finished) await t.rollback();
    res.status(500).json({ error: 'Subscription failed' });
  }
});

// PURCHASE NFT
router.post('/nft/purchase', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { nftId, price } = req.body;
    const amt = parseFloat(price);
    if (!Number.isFinite(amt) || amt <= 0) { await t.rollback(); return res.status(400).json({ error: 'Invalid price' }); }

    const sender = await User.findByPk(req.user.userId, { transaction: t, lock: t.LOCK.UPDATE });
    if (parseFloat(sender.balance || 0) < amt) {
      await t.rollback();
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    await sender.update({ balance: parseFloat(sender.balance || 0) - amt }, { transaction: t });
    const tx = await Transaction.create({
      userId: sender.id, type: 'purchase', amount: amt, currency: 'NEXA',
      status: 'completed', metadata: { nftId }
    }, { transaction: t });
    await t.commit();
    res.json({ success: true, transaction: tx });
  } catch (error) {
    if (!t.finished) await t.rollback();
    res.status(500).json({ error: 'Purchase failed' });
  }
});

// REWARD STATS
router.get('/rewards/stats', async (req, res) => {
  try {
    const totalRewards = await Transaction.sum('amount', { where: { type: 'reward', status: 'completed' } }) || 0;
    const totalTipped = await Transaction.sum('amount', { where: { type: 'tip', status: 'completed' } }) || 0;
    res.json({
      totalRewardsDistributed: totalRewards,
      totalTipsSent: totalTipped,
      rewardPerView: config.REWARD_PER_VIEW,
      creatorShare: config.CREATOR_SHARE,
      platformShare: config.PLATFORM_SHARE
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// REWARD LEADERBOARD
router.get('/rewards/leaderboard', async (req, res) => {
  try {
    const channels = await Channel.findAll({ order: [['totalEarnings', 'DESC']], limit: 20 });
    const leaderboard = channels.map((c, i) => ({
      rank: i + 1, channelId: c.id, name: c.displayName,
      earnings: c.totalEarnings, subscribers: c.subscribers
    }));
    res.json({ leaderboard });
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = router;
