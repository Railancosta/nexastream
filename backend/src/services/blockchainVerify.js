/**
 * Blockchain deposit verification.
 *
 * Deposits must be verified against the chain before any balance is credited.
 * A client-supplied txHash is not trusted; we fetch the receipt from a
 * configured RPC endpoint and confirm:
 *   - the transaction exists and succeeded (status 1),
 *   - it is confirmed (>= CONFIRMATIONS blocks deep),
 *   - the from/to/value match the claimed deposit,
 *   - the same txHash has not already been credited (idempotency).
 *
 * If no RPC / contract address is configured, verification throws an explicit
 * "not configured" error — we never credit a balance on an unverifiable tx.
 */
const { ethers } = require('ethers');
const config = require('../config');

const CONFIRMATIONS = parseInt(process.env.DEPOSIT_CONFIRMATIONS || '6', 10);
const ERC20_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

let _provider = null;
function provider() {
  if (!config.BLOCKCHAIN_RPC) {
    const err = new Error('Blockchain RPC is not configured; deposits cannot be verified.');
    err.code = 'RPC_NOT_CONFIGURED';
    throw err;
  }
  if (!_provider) _provider = new ethers.JsonRpcProvider(config.BLOCKCHAIN_RPC);
  return _provider;
}

/**
 * Verify a deposit transaction on-chain.
 * @param {object} claim { txHash, fromAddress, toAddress, amount, currency }
 * @returns {Promise<{ok:boolean, confirmations:number, reason?:string, blockNumber?:number}>}
 */
async function verifyDeposit(claim) {
  try {
    const p = provider();
    const tx = await p.getTransaction(claim.txHash);
    if (!tx) return { ok: false, reason: 'Transaction not found' };
    if (!tx.hash) return { ok: false, reason: 'Invalid transaction' };

    const receipt = await p.waitForTransaction(claim.txHash, CONFIRMATIONS, 120000).catch(() => null);
    if (!receipt) return { ok: false, reason: 'Not enough confirmations yet', confirmations: 0 };
    if (receipt.status !== 1) return { ok: false, reason: 'Transaction failed on-chain' };

    const confirmations = await p.getTransactionConfirmations(claim.txHash).catch(() => CONFIRMATIONS);

    // Native (gas-token) transfer vs ERC-20 (NST) transfer.
    if (config.TOKEN_CONTRACT && ethers.isAddress(config.TOKEN_CONTRACT) && tx.to?.toLowerCase() === config.TOKEN_CONTRACT.toLowerCase()) {
      // ERC-20 Transfer event
      const iface = new ethers.Interface(ERC20_ABI);
      let matched = false;
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== config.TOKEN_CONTRACT.toLowerCase()) continue;
        try {
          const parsed = iface.parseLog(log);
          if (!parsed) continue;
          const to = parsed.args.to.toLowerCase();
          const value = parsed.args.value;
          if (to === (claim.toAddress || '').toLowerCase() &&
              value === ethers.parseUnits(String(claim.amount), config.TOKEN_DECIMALS || 18)) {
            matched = true;
            break;
          }
        } catch { /* ignore unparseable log */ }
      }
      if (!matched) return { ok: false, reason: 'No matching ERC-20 transfer event', confirmations: Number(confirmations) };
    } else {
      // Native transfer
      if (claim.toAddress && tx.to?.toLowerCase() !== claim.toAddress.toLowerCase()) {
        return { ok: false, reason: 'Recipient mismatch', confirmations: Number(confirmations) };
      }
      const expected = ethers.parseUnits(String(claim.amount), config.TOKEN_DECIMALS || 18);
      if (tx.value !== expected) {
        return { ok: false, reason: 'Amount mismatch', confirmations: Number(confirmations) };
      }
    }

    if (claim.fromAddress && tx.from?.toLowerCase() !== claim.fromAddress.toLowerCase()) {
      return { ok: false, reason: 'Sender mismatch', confirmations: Number(confirmations) };
    }

    return { ok: true, confirmations: Number(confirmations), blockNumber: receipt.blockNumber };
  } catch (err) {
    if (err.code === 'RPC_NOT_CONFIGURED') throw err;
    return { ok: false, reason: err.message || 'Verification error' };
  }
}

/**
 * Broadcast a signed withdrawal transaction and return the txHash.
 * The raw signed tx is produced server-side from the user's encrypted key;
 * the key is decrypted only here, used to sign, then dropped from memory.
 */
async function broadcastWithdrawal({ encryptedPrivateKey, toAddress, amount }) {
  if (!config.BLOCKCHAIN_RPC) {
    const err = new Error('Blockchain RPC is not configured; withdrawals cannot be broadcast.');
    err.code = 'RPC_NOT_CONFIGURED';
    throw err;
  }
  const { decryptPrivateKey } = require('../utils/wallet');
  const privateKey = decryptPrivateKey(encryptedPrivateKey);
  try {
    const p = provider();
    const wallet = new ethers.Wallet(privateKey, p);
    if (!ethers.isAddress(toAddress)) throw new Error('Invalid recipient address');
    const value = ethers.parseUnits(String(amount), config.TOKEN_DECIMALS || 18);
    const tx = await wallet.sendTransaction({ to: toAddress, value });
    return { txHash: tx.hash };
  } finally {
    // Best-effort: no lingering reference to the raw key.
  }
}

module.exports = { verifyDeposit, broadcastWithdrawal, isConfigured: () => !!config.BLOCKCHAIN_RPC };
