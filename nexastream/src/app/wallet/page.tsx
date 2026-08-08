'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { 
  Wallet, 
  Copy, 
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Clock,
  Server,
  Info
} from 'lucide-react';

export default function WalletPage() {
  const { address, isConnected } = useAccount();
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
            Connect your NexaChain wallet to manage your NST tokens and view your balance.
            Your private keys remain under your control.
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
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Wallet</h1>
          <p className="text-gray-400">Manage your NexaChain assets</p>
        </div>

        {/* Network Status Banner */}
        <div className="mb-8 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <p className="text-yellow-200 font-medium">Network Status: NOT INITIALIZED</p>
              <p className="text-yellow-200/70 text-sm mt-1">
                This is a demo wallet. Connect to NexaChain to see real balances and transactions.
              </p>
            </div>
          </div>
        </div>

        {/* Wallet Card */}
        <div className="bg-dark-200 rounded-2xl border border-white/10 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Connected Wallet</p>
                <p className="text-white font-mono">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCopyAddress}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                title="Copy address"
              >
                {copied ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-400" />
                )}
              </button>
              <a 
                href={`https://nexastream.org/explorer/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                title="View on explorer"
              >
                <ExternalLink className="w-5 h-5 text-gray-400" />
              </a>
            </div>
          </div>

          {/* Demo Balance Display */}
          <div className="bg-dark-100 rounded-xl p-4 mb-4">
            <p className="text-gray-400 text-sm mb-2">NST Balance</p>
            <p className="text-4xl font-bold text-white mb-1">0 NST</p>
            <p className="text-gray-500 text-sm">$0.00 USD</p>
          </div>

          <div className="bg-dark-100 rounded-xl p-4">
            <p className="text-gray-400 text-sm mb-2">Pending Rewards</p>
            <p className="text-2xl font-bold text-white">0 NST</p>
            <p className="text-gray-500 text-sm">Available when network is live</p>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-dark-200 rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <Server className="w-6 h-6 text-primary" />
              <h3 className="text-lg font-semibold text-white">NexaChain Info</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Network</span>
                <span className="text-white">NexaStream Local</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Chain ID</span>
                <span className="text-white">TBD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Token</span>
                <span className="text-white">NST</span>
              </div>
            </div>
          </div>

          <div className="bg-dark-200 rounded-xl p-6 border border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <Info className="w-6 h-6 text-accent" />
              <h3 className="text-lg font-semibold text-white">50/50 Revenue Split</h3>
            </div>
            <p className="text-gray-400 text-sm">
              When the platform generates real revenue, 50% goes to creators 
              and 50% to platform operations. Transparent and verifiable on-chain.
            </p>
          </div>
        </div>

        {/* Transaction History - Empty State */}
        <div className="bg-dark-200 rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Transaction History</h3>
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No transactions yet</p>
            <p className="text-gray-500 text-sm mt-2">
              Transaction history will appear when connected to NexaChain
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
