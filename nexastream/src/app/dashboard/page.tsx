'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import { 
  TrendingUp, 
  Eye, 
  DollarSign, 
  Users, 
  Video, 
  Bell,
  Settings,
  Play,
  Calendar,
  Zap,
  Server,
  Wallet
} from 'lucide-react';
import { getNetworkStats } from '@/lib/db/mockData';

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'content'>('overview');
  
  const networkStats = getNetworkStats();

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-dark-100 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-gray-400 mb-8">
            Connect your NexaChain wallet to access your creator dashboard.
            Your private keys remain under your control.
          </p>
          <Link href="/login" className="btn-primary">
            Connect Wallet
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-100">
      {/* Dashboard Header */}
      <div className="bg-dark-200 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Creator Dashboard</h1>
              <p className="text-gray-400 mt-1">
                Wallet: {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/settings" className="p-3 bg-dark-100 rounded-lg hover:bg-white/5 transition-colors">
                <Settings className="w-5 h-5 text-gray-400" />
              </Link>
            </div>
          </div>

          {/* Quick Stats - Honest Data */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-dark-100 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <DollarSign className="w-4 h-4 text-green-500" />
                </div>
                <span className="text-gray-400 text-sm">Total Earnings</span>
              </div>
              <p className="text-2xl font-bold text-white">{networkStats.totalEarnings}</p>
              <div className="flex items-center gap-1 mt-1 text-gray-400 text-sm">
                <Server className="w-4 h-4" />
                <span>50/50 split enabled</span>
              </div>
            </div>

            <div className="bg-dark-100 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Eye className="w-4 h-4 text-primary" />
                </div>
                <span className="text-gray-400 text-sm">Total Views</span>
              </div>
              <p className="text-2xl font-bold text-white">{networkStats.totalViews}</p>
              <div className="flex items-center gap-1 mt-1 text-gray-400 text-sm">
                <span>From network</span>
              </div>
            </div>

            <div className="bg-dark-100 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Users className="w-4 h-4 text-accent" />
                </div>
                <span className="text-gray-400 text-sm">Subscribers</span>
              </div>
              <p className="text-2xl font-bold text-white">-</p>
              <div className="flex items-center gap-1 mt-1 text-gray-400 text-sm">
                <span>Connect to network</span>
              </div>
            </div>

            <div className="bg-dark-100 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Video className="w-4 h-4 text-yellow-500" />
                </div>
                <span className="text-gray-400 text-sm">Videos</span>
              </div>
              <p className="text-2xl font-bold text-white">{networkStats.totalVideos}</p>
              <div className="flex items-center gap-1 mt-1 text-gray-400 text-sm">
                <Calendar className="w-4 h-4" />
                <span>On IPFS</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Network Status Banner */}
        <div className="mb-8 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
          <p className="text-yellow-200 text-sm">
            ⚠️ Network Status: {networkStats.networkStatus}
            <br />
            <span className="text-xs opacity-75">
              Connect to the NexaStream P2P network to see real statistics and enable all features.
            </span>
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-white/10">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'overview' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'analytics' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === 'content' 
                ? 'text-primary border-b-2 border-primary' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Content
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {activeTab === 'overview' ? (
              <>
                {/* Network Connection Status */}
                <div className="bg-dark-200 rounded-2xl border border-white/10 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">P2P Network Status</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-dark-100 p-4 rounded-lg">
                      <p className="text-gray-400 text-sm">Block Height</p>
                      <p className="text-2xl font-bold text-white">{networkStats.blockHeight}</p>
                    </div>
                    <div className="bg-dark-100 p-4 rounded-lg">
                      <p className="text-gray-400 text-sm">Connected Peers</p>
                      <p className="text-2xl font-bold text-white">{networkStats.peers}</p>
                    </div>
                    <div className="bg-dark-100 p-4 rounded-lg">
                      <p className="text-gray-400 text-sm">Validators</p>
                      <p className="text-2xl font-bold text-white">{networkStats.validators}</p>
                    </div>
                    <div className="bg-dark-100 p-4 rounded-lg">
                      <p className="text-gray-400 text-sm">Storage Nodes</p>
                      <p className="text-2xl font-bold text-white">{networkStats.storageNodes}</p>
                    </div>
                  </div>
                </div>

                {/* Revenue Info */}
                <div className="bg-dark-200 rounded-2xl border border-white/10 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Revenue Model</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-dark-100 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <p className="text-white font-medium">Creator Share</p>
                          <p className="text-gray-400 text-sm">50% of net revenue</p>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-green-500">50%</p>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-dark-100 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                          <Server className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-white font-medium">Platform Share</p>
                          <p className="text-gray-400 text-sm">50% for operations</p>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-primary">50%</p>
                    </div>
                  </div>
                  <p className="mt-4 text-gray-400 text-sm">
                    Revenue is distributed automatically when the platform generates real income.
                    No fake stats, no inflated numbers.
                  </p>
                </div>
              </>
            ) : activeTab === 'analytics' ? (
              <div className="bg-dark-200 rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Analytics</h3>
                <p className="text-gray-400">
                  Connect to the P2P network to view real analytics based on your content performance.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Your Videos</h3>
                  <Link href="/upload" className="btn-primary flex items-center gap-2 text-sm">
                    <Play className="w-4 h-4" />
                    Upload Video
                  </Link>
                </div>
                <div className="bg-dark-200 rounded-2xl border border-white/10 p-6 text-center">
                  <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">
                    Upload videos to IPFS to see them here. Content is stored on the distributed network.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-dark-200 rounded-2xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link href="/upload" className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Video className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Upload Video</p>
                    <p className="text-gray-400 text-sm">Store on IPFS</p>
                  </div>
                </Link>
                <Link href="/wallet" className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Wallet</p>
                    <p className="text-gray-400 text-sm">Manage NST</p>
                  </div>
                </Link>
                <Link href="/run-node" className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                    <Server className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Run a Node</p>
                    <p className="text-gray-400 text-sm">Support the network</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* Network Info */}
            <div className="bg-dark-200 rounded-2xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">NexaChain Info</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Token</span>
                  <span className="text-white font-medium">NST</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Max Supply</span>
                  <span className="text-white font-medium">55,000,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Consensus</span>
                  <span className="text-white font-medium">PoW + PoS</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
