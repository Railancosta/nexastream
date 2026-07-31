'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatCrypto, truncateAddress, formatNumber, formatRelativeTime } from '@/lib/utils';
import { USDC_ADDRESSES, ERC20_ABI, PLATFORM_OWNER_ADDRESS } from '@/lib/blockchain';
import toast from 'react-hot-toast';
import { 
  Wallet, 
  ArrowDownRight, 
  ArrowUpRight, 
  Copy, 
  ExternalLink,
  TrendingUp,
  Zap,
  Shield,
  ChevronDown,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  CreditCard
} from 'lucide-react';

export default function WalletPage() {
  const { address, isConnected, connector } = useAccount();
  const [activeTab, setActiveTab] = useState<'overview' | 'withdraw' | 'deposit' | 'swap'>('overview');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Mock balance data
  const mockUSDCBalance = 1250.50;
  const mockNEXABalance = 5000;
  const mockPendingBalance = 150.00;

  // Demo transaction history
  const transactionHistory = [
    { id: '1', type: 'earning', amount: 25.50, currency: 'USDC', status: 'confirmed', txHash: '0x1234...5678', createdAt: new Date() },
    { id: '2', type: 'earning', amount: 18.30, currency: 'USDC', status: 'confirmed', txHash: '0xabcd...efgh', createdAt: new Date(Date.now() - 86400000) },
    { id: '3', type: 'withdrawal', amount: 100.00, currency: 'USDC', status: 'confirmed', txHash: '0x9999...0000', createdAt: new Date(Date.now() - 172800000) },
    { id: '4', type: 'earning', amount: 42.80, currency: 'USDC', status: 'confirmed', txHash: '0x5555...6666', createdAt: new Date(Date.now() - 259200000) },
  ];

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success('Address copied to clipboard!');
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (parseFloat(withdrawAmount) > mockUSDCBalance) {
      toast.error('Insufficient balance');
      return;
    }

    setIsWithdrawing(true);
    try {
      // Simulate transaction
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`Withdrawal of $${withdrawAmount} USDC initiated!`);
      setWithdrawAmount('');
      // In real implementation, this would call the smart contract
    } catch (error) {
      toast.error('Withdrawal failed. Please try again.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleSwap = (direction: 'toNEXA' | 'toUSDC') => {
    toast.loading('Processing swap...', { duration: 2000 });
    setTimeout(() => {
      toast.success('Swap completed successfully!');
    }, 2500);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-dark-100 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-gray-400 mb-8">
            Connect your Web3 wallet to manage your USDC and $NEXA tokens, view your earnings, and make withdrawals.
          </p>
          <a href="/login" className="btn-primary">
            Connect Wallet
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-100">
      {/* Header */}
      <div className="bg-dark-200 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-white mb-2">Wallet</h1>
          <p className="text-gray-400">Manage your on-chain earnings, powered by blockchain smart contracts</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Wallet Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Balance Cards */}
            <div className="grid sm:grid-cols-3 gap-4">
              {/* USDC Balance */}
              <div className="bg-gradient-to-br from-primary to-blue-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5" />
                  <span className="text-white/80 font-medium">USDC Balance</span>
                </div>
                <p className="text-3xl font-bold">${mockUSDCBalance.toFixed(2)}</p>
                <p className="text-white/60 text-sm mt-1">Stablecoin · Pegged to USD</p>
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => setActiveTab('withdraw')}
                    className="flex-1 py-2 bg-white/20 rounded-lg font-medium hover:bg-white/30 transition-colors"
                  >
                    Withdraw
                  </button>
                  <button 
                    onClick={() => setActiveTab('deposit')}
                    className="flex-1 py-2 bg-white/20 rounded-lg font-medium hover:bg-white/30 transition-colors"
                  >
                    Deposit
                  </button>
                </div>
              </div>

              {/* $NEXA Balance */}
              <div className="bg-gradient-to-br from-accent to-purple-600 rounded-2xl p-6 text-white">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-white/80 font-medium">$NEXA Balance</span>
                </div>
                <p className="text-3xl font-bold">{formatNumber(mockNEXABalance)}</p>
                <p className="text-white/60 text-sm mt-1">≈ $2,500.00 USD · Platform Token</p>
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => setActiveTab('swap')}
                    className="flex-1 py-2 bg-white/20 rounded-lg font-medium hover:bg-white/30 transition-colors"
                  >
                    Swap
                  </button>
                  <button className="flex-1 py-2 bg-white/20 rounded-lg font-medium hover:bg-white/30 transition-colors">
                    Boost
                  </button>
                </div>
              </div>

              {/* Pending Balance */}
              <div className="bg-dark-200 rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  <span className="text-gray-400 font-medium">Pending</span>
                </div>
                <p className="text-3xl font-bold text-white">${mockPendingBalance.toFixed(2)}</p>
                <p className="text-gray-500 text-sm mt-1">Processing · ~24 hours</p>
                <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg">
                  <p className="text-yellow-500 text-xs">Pending payments are being processed</p>
                </div>
              </div>
            </div>

            {/* $NEXA Use Cases */}
            <div className="bg-dark-200 rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">$NEXA Use Cases</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-4 bg-primary/10 rounded-xl text-center">
                  <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-white font-medium">Boost Videos</p>
                  <p className="text-gray-400 text-sm">Promote your content</p>
                </div>
                <div className="p-4 bg-accent/10 rounded-xl text-center">
                  <Shield className="w-6 h-6 text-accent mx-auto mb-2" />
                  <p className="text-white font-medium">Governance</p>
                  <p className="text-gray-400 text-sm">Vote on platform decisions</p>
                </div>
                <div className="p-4 bg-green-500/10 rounded-xl text-center">
                  <Zap className="w-6 h-6 text-green-500 mx-auto mb-2" />
                  <p className="text-white font-medium">Premium</p>
                  <p className="text-gray-400 text-sm">Unlock special features</p>
                </div>
              </div>
            </div>

            {/* Revenue Split Info */}
            <div className="bg-dark-200 rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">How You Earn</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-green-500">80%</span>
                  </div>
                  <p className="text-white font-medium">Ad Revenue</p>
                  <p className="text-gray-400 text-sm">To you via USDC</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-blue-500">5%</span>
                  </div>
                  <p className="text-white font-medium">Watch-to-Earn</p>
                  <p className="text-gray-400 text-sm">For viewers in $NEXA</p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-2xl font-bold text-gray-500">15%</span>
                  </div>
                  <p className="text-white font-medium">Platform Fee</p>
                  <p className="text-gray-400 text-sm">NexaStream (vs 45% YT)</p>
                </div>
              </div>
            </div>

            {/* Action Tabs */}
            <div className="bg-dark-200 rounded-2xl border border-white/10 overflow-hidden">
              <div className="flex border-b border-white/10">
                <button
                  onClick={() => setActiveTab('withdraw')}
                  className={`flex-1 py-4 font-medium transition-colors ${
                    activeTab === 'withdraw' 
                      ? 'text-primary border-b-2 border-primary' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Withdraw
                </button>
                <button
                  onClick={() => setActiveTab('deposit')}
                  className={`flex-1 py-4 font-medium transition-colors ${
                    activeTab === 'deposit' 
                      ? 'text-primary border-b-2 border-primary' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Deposit
                </button>
                <button
                  onClick={() => setActiveTab('swap')}
                  className={`flex-1 py-4 font-medium transition-colors ${
                    activeTab === 'swap' 
                      ? 'text-primary border-b-2 border-primary' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Swap
                </button>
              </div>

              <div className="p-6">
                {activeTab === 'withdraw' && (
                  <div className="space-y-4">
                    <p className="text-gray-400 text-sm">
                      Withdraw your USDC earnings directly to your connected wallet or bank account.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Amount (USDC)
                        </label>
                        <input
                          type="number"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-4 py-3 bg-dark-100 rounded-lg border border-white/10 
                                   text-white placeholder-gray-500 focus:outline-none focus:border-primary"
                        />
                        <div className="flex justify-between mt-2 text-sm">
                          <button 
                            onClick={() => setWithdrawAmount((mockUSDCBalance * 0.25).toFixed(2))}
                            className="text-primary hover:underline"
                          >
                            25%
                          </button>
                          <button 
                            onClick={() => setWithdrawAmount((mockUSDCBalance * 0.50).toFixed(2))}
                            className="text-primary hover:underline"
                          >
                            50%
                          </button>
                          <button 
                            onClick={() => setWithdrawAmount((mockUSDCBalance * 0.75).toFixed(2))}
                            className="text-primary hover:underline"
                          >
                            75%
                          </button>
                          <button 
                            onClick={() => setWithdrawAmount(mockUSDCBalance.toFixed(2))}
                            className="text-primary hover:underline"
                          >
                            Max
                          </button>
                        </div>
                      </div>
                      <div className="p-4 bg-dark-100 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400">To Address</span>
                        </div>
                        <p className="text-white font-mono text-sm">{address}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Shield className="w-4 h-4" />
                        <span>Transfers are secured by Ethereum smart contracts</span>
                      </div>
                    </div>
                    <button
                      onClick={handleWithdraw}
                      disabled={isWithdrawing || !withdrawAmount}
                      className="w-full py-3 bg-primary text-white rounded-lg font-semibold 
                               hover:bg-primary/90 transition-colors disabled:opacity-50 
                               disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isWithdrawing ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <ArrowUpRight className="w-5 h-5" />
                          Withdraw {withdrawAmount ? `$${withdrawAmount}` : ''} USDC
                        </>
                      )}
                    </button>
                  </div>
                )}

                {activeTab === 'deposit' && (
                  <div className="space-y-4">
                    <p className="text-gray-400 text-sm">
                      Deposit USDC to boost videos or participate in platform features.
                    </p>
                    <div className="p-6 bg-dark-100 rounded-xl text-center">
                      <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-white font-medium mb-2">Buy Crypto with Card</p>
                      <p className="text-gray-400 text-sm mb-4">
                        Purchase USDC directly with your credit/debit card
                      </p>
                      <button className="btn-primary w-full">
                        Buy USDC
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-4 bg-dark-200 text-gray-400">or transfer directly</span>
                      </div>
                    </div>
                    <div className="p-4 bg-dark-100 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400">Your Deposit Address</span>
                        <button onClick={handleCopyAddress} className="text-primary hover:text-primary/80">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-white font-mono text-sm">{address}</p>
                    </div>
                  </div>
                )}

                {activeTab === 'swap' && (
                  <div className="space-y-4">
                    <p className="text-gray-400 text-sm">
                      Swap between USDC and $NEXA tokens.
                    </p>
                    <div className="space-y-3">
                      <div className="p-4 bg-dark-100 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400">From</span>
                          <span className="text-gray-400 text-sm">Balance: ${mockUSDCBalance.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            placeholder="0.00"
                            className="flex-1 bg-transparent text-white text-2xl font-medium focus:outline-none"
                          />
                          <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-medium">USDC</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <button 
                          onClick={() => handleSwap('toNEXA')}
                          className="p-2 bg-dark-100 rounded-full hover:bg-white/10 transition-colors"
                        >
                          <RefreshCw className="w-5 h-5 text-gray-400" />
                        </button>
                      </div>
                      <div className="p-4 bg-dark-100 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400">To</span>
                          <span className="text-gray-400 text-sm">Balance: {formatNumber(mockNEXABalance)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            placeholder="0.00"
                            className="flex-1 bg-transparent text-white text-2xl font-medium focus:outline-none"
                          />
                          <div className="flex items-center gap-2 px-3 py-2 bg-accent/20 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-accent" />
                            <span className="font-medium text-accent">$NEXA</span>
                          </div>
                        </div>
                      </div>
                      <button className="btn-primary w-full">
                        Swap
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Wallet Info */}
            <div className="bg-dark-200 rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Your Wallet</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-medium">{connector?.name || 'Wallet'}</p>
                  <p className="text-gray-400 text-sm font-mono">{truncateAddress(address || '')}</p>
                </div>
              </div>
              <button 
                onClick={handleCopyAddress}
                className="w-full py-2 bg-white/10 rounded-lg text-gray-300 hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy Address
              </button>
              <a 
                href={`https://etherscan.io/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 w-full py-2 bg-white/10 rounded-lg text-gray-300 hover:bg-white/20 transition-colors flex items-center justify-center gap-2"
              >
                View on Etherscan
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            {/* Platform Owner Address */}
            <div className="bg-dark-200 rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Platform Payout Address</h3>
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
                <p className="text-xs text-gray-400 mb-2">USDC Payout Address (Mainnet)</p>
                <p className="text-white font-mono text-sm break-all">{PLATFORM_OWNER_ADDRESS}</p>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(PLATFORM_OWNER_ADDRESS);
                    toast.success('Address copied!');
                  }}
                  className="mt-2 text-primary text-sm hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy
                </button>
              </div>
            </div>

            {/* Transaction History */}
            <div className="bg-dark-200 rounded-2xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Transaction History</h3>
              <div className="space-y-3">
                {transactionHistory.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        tx.type === 'earning' ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}>
                        {tx.type === 'earning' ? (
                          <ArrowDownRight className="w-4 h-4 text-green-500" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium capitalize">{tx.type}</p>
                        <p className="text-gray-500 text-xs">{formatRelativeTime(tx.createdAt)}</p>
                      </div>
                    </div>
                    <p className={`font-semibold ${
                      tx.type === 'earning' ? 'text-green-500' : 'text-red-500'
                    }`}>
                      {tx.type === 'earning' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
              <a href="/transactions" className="mt-4 text-primary hover:text-primary/80 text-sm flex items-center justify-center gap-1">
                View all transactions
                <ChevronDown className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
