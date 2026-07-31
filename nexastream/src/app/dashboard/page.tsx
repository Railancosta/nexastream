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
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  Settings,
  Play,
  Calendar,
  ChevronRight,
  Zap
} from 'lucide-react';
import { formatNumber, formatCurrency, formatCrypto, formatRelativeTime } from '@/lib/utils';
import { getDemoVideos, getDemoAlerts, getDemoTransactions } from '@/lib/db/mockData';
import { VideoCard } from '@/components/video/VideoCard';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'content'>('overview');
  
  const videos = getDemoVideos();
  const alerts = getDemoAlerts();
  const transactions = getDemoTransactions();

  // Mock analytics data
  const earningsData = [
    { date: 'Jan 1', earnings: 12.50 },
    { date: 'Jan 2', earnings: 18.30 },
    { date: 'Jan 3', earnings: 15.20 },
    { date: 'Jan 4', earnings: 25.80 },
    { date: 'Jan 5', earnings: 22.40 },
    { date: 'Jan 6', earnings: 30.10 },
    { date: 'Jan 7', earnings: 28.90 },
  ];

  const viewsData = [
    { date: 'Jan 1', views: 1200 },
    { date: 'Jan 2', views: 1800 },
    { date: 'Jan 3', views: 1500 },
    { date: 'Jan 4', views: 2400 },
    { date: 'Jan 5', views: 2100 },
    { date: 'Jan 6', views: 2800 },
    { date: 'Jan 7', views: 3200 },
  ];

  const unreadAlerts = alerts.filter(a => !a.read).length;

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-dark-100 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Zap className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h1>
          <p className="text-gray-400 mb-8">
            Connect your Web3 wallet to access your creator dashboard and start earning USDC.
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
              <p className="text-gray-400 mt-1">Welcome back! Here's your performance overview.</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Alerts */}
              <Link href="/alerts" className="relative p-3 bg-dark-100 rounded-lg hover:bg-white/5 transition-colors">
                <Bell className="w-5 h-5 text-gray-400" />
                {unreadAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadAlerts}
                  </span>
                )}
              </Link>
              {/* Settings */}
              <Link href="/settings" className="p-3 bg-dark-100 rounded-lg hover:bg-white/5 transition-colors">
                <Settings className="w-5 h-5 text-gray-400" />
              </Link>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-dark-100 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <DollarSign className="w-4 h-4 text-green-500" />
                </div>
                <span className="text-gray-400 text-sm">Total Earnings</span>
              </div>
              <p className="text-2xl font-bold text-white">$1,072.00</p>
              <div className="flex items-center gap-1 mt-1 text-green-500 text-sm">
                <ArrowUpRight className="w-4 h-4" />
                <span>+24.5% this month</span>
              </div>
            </div>

            <div className="bg-dark-100 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Eye className="w-4 h-4 text-primary" />
                </div>
                <span className="text-gray-400 text-sm">Total Views</span>
              </div>
              <p className="text-2xl font-bold text-white">{formatNumber(2150000)}</p>
              <div className="flex items-center gap-1 mt-1 text-green-500 text-sm">
                <ArrowUpRight className="w-4 h-4" />
                <span>+18.2% this month</span>
              </div>
            </div>

            <div className="bg-dark-100 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Users className="w-4 h-4 text-accent" />
                </div>
                <span className="text-gray-400 text-sm">Subscribers</span>
              </div>
              <p className="text-2xl font-bold text-white">{formatNumber(45200)}</p>
              <div className="flex items-center gap-1 mt-1 text-green-500 text-sm">
                <ArrowUpRight className="w-4 h-4" />
                <span>+1,234 this month</span>
              </div>
            </div>

            <div className="bg-dark-100 rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Video className="w-4 h-4 text-yellow-500" />
                </div>
                <span className="text-gray-400 text-sm">Videos</span>
              </div>
              <p className="text-2xl font-bold text-white">47</p>
              <div className="flex items-center gap-1 mt-1 text-gray-400 text-sm">
                <Calendar className="w-4 h-4" />
                <span>Last upload: 2 days ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
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
            {/* Charts */}
            {activeTab === 'overview' || activeTab === 'analytics' ? (
              <>
                <div className="bg-dark-200 rounded-2xl border border-white/10 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Earnings History</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={earningsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis dataKey="date" stroke="#888" fontSize={12} />
                        <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => `$${v}`} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            border: '1px solid #ffffff20',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number) => [`$${value.toFixed(2)} USDC`, 'Earnings']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="earnings" 
                          stroke="#0ea5e9" 
                          strokeWidth={2}
                          dot={{ fill: '#0ea5e9', strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-dark-200 rounded-2xl border border-white/10 p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Views History</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={viewsData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis dataKey="date" stroke="#888" fontSize={12} />
                        <YAxis stroke="#888" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            border: '1px solid #ffffff20',
                            borderRadius: '8px'
                          }}
                        />
                        <Bar dataKey="views" fill="#a855f7" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            ) : (
              /* Content Tab */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Your Videos</h3>
                  <Link href="/upload" className="btn-primary flex items-center gap-2 text-sm">
                    <Play className="w-4 h-4" />
                    Upload Video
                  </Link>
                </div>
                <div className="grid sm:grid-cols-2 gap-6">
                  {videos.slice(0, 4).map((video) => (
                    <VideoCard key={video.id} video={video} showChannel />
                  ))}
                </div>
                <Link 
                  href="/channel/videos" 
                  className="flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  View all videos
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Transactions */}
            <div className="bg-dark-200 rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Recent Transactions</h3>
                <Link href="/wallet" className="text-sm text-primary hover:text-primary/80">
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {transactions.slice(0, 4).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        tx.type === 'earning' ? 'bg-green-500/20' :
                        tx.type === 'withdrawal' ? 'bg-red-500/20' :
                        'bg-blue-500/20'
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
                      {tx.type === 'earning' ? '+' : '-'}{formatCrypto(tx.amount, tx.currency)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Alerts */}
            <div className="bg-dark-200 rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Recent Alerts</h3>
                <Link href="/alerts" className="text-sm text-primary hover:text-primary/80">
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {alerts.slice(0, 3).map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`p-3 rounded-lg ${
                      alert.read ? 'bg-dark-100' : 'bg-primary/10 border border-primary/30'
                    }`}
                  >
                    <p className="text-white text-sm font-medium">{alert.title}</p>
                    <p className="text-gray-400 text-xs mt-1">{alert.message}</p>
                    {!alert.read && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-primary/20 text-primary text-xs rounded">
                        New
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

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
                    <p className="text-gray-400 text-sm">Share new content</p>
                  </div>
                </Link>
                <Link href="/boost" className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Boost Content</p>
                    <p className="text-gray-400 text-sm">Promote your videos</p>
                  </div>
                </Link>
                <Link href="/withdraw" className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Withdraw Funds</p>
                    <p className="text-gray-400 text-sm">Transfer to your wallet</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
