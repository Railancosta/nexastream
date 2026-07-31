import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import api from '@/lib/api';
import { useAuth } from '@/lib/store';
import { Play, Wallet, TrendingUp, DollarSign, Users, Video, Settings, LogOut, ExternalLink, Plus, ArrowUpRight, ArrowDownRight, Eye, ThumbsUp, Copy, Check } from 'lucide-react';

const USDC_ADDRESS = '0xa453B71A216a8A6608e79247B162df47B2770899';

export default function Dashboard() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'wallet' | 'videos' | 'analytics'>('overview');

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    loadDashboard();
  }, [isAuthenticated]);

  async function loadDashboard() {
    try {
      const [dashRes, txRes] = await Promise.all([
        api.getPaymentDashboard().catch(() => ({ data: { balanceUsdc: 0, balanceEth: 0, totalEarnings: 0, recentTransactions: [] } })),
        api.getTransactions({ limit: 10 }).catch(() => ({ data: [] }))
      ]);
      setDashboard(dashRes.data);
      setTransactions(txRes.data || []);
    } catch (e) { console.error(e); }
  }

  async function handleWithdraw(e: React.FormEvent) {
    e.preventDefault();
    if (!withdrawAmount || parseFloat(withdrawAmount) < 10) { alert('Minimum withdrawal is $10'); return; }
    try {
      await api.withdraw(parseFloat(withdrawAmount), 'USDC');
      alert('Withdrawal initiated! You will receive USDC at: ' + USDC_ADDRESS);
      setWithdrawAmount('');
      loadDashboard();
    } catch (e: any) { alert(e.message || 'Withdrawal failed'); }
  }

  async function copyAddress() {
    await navigator.clipboard.writeText(USDC_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Head><title>Dashboard - NexaStream</title></Head>
      
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-xl flex items-center justify-center"><Play size={20} className="text-white fill-white" /></div>
            <span className="text-xl font-bold gradient-text">NexaStream</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">@{user?.username}</span>
            <button onClick={logout} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"><LogOut size={18} /> Logout</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Creator Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { icon: <DollarSign />, label: 'Balance (USDC)', value: `$${dashboard?.balanceUsdc?.toFixed(2) || '0.00'}`, color: 'bg-green-500' },
            { icon: <TrendingUp />, label: 'Total Earnings', value: `$${dashboard?.totalEarnings?.toFixed(2) || '0.00'}`, color: 'bg-purple-500' },
            { icon: <Video />, label: 'Videos', value: dashboard?.videos?.length || '0', color: 'bg-blue-500' },
            { icon: <Users />, label: 'Subscribers', value: dashboard?.subscribers || '0', color: 'bg-pink-500' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-white`}>{stat.icon}</div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          {(['overview', 'wallet', 'videos', 'analytics'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 px-2 font-medium capitalize ${activeTab === tab ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
              {transactions.length > 0 ? (
                <div className="space-y-3">
                  {transactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {tx.type === 'WITHDRAWAL' ? <ArrowUpRight className="text-red-500" /> : <ArrowDownRight className="text-green-500" />}
                        <div>
                          <p className="font-medium">{tx.type}</p>
                          <p className="text-sm text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${tx.type === 'WITHDRAWAL' ? 'text-red-600' : 'text-green-600'}`}>
                          {tx.type === 'WITHDRAWAL' ? '-' : '+'}${tx.amount?.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">{tx.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-gray-500 text-center py-8">No transactions yet</p>}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Link href="/studio" className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition">
                  <Plus className="text-purple-600" /><span className="font-medium">Upload New Video</span>
                </Link>
                <Link href="/channel/create" className="flex items-center gap-3 p-4 bg-pink-50 rounded-lg hover:bg-pink-100 transition">
                  <Video className="text-pink-600" /><span className="font-medium">Create Channel</span>
                </Link>
                <Link href="/wallet" className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition">
                  <Wallet className="text-green-600" /><span className="font-medium">Withdraw Earnings</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Wallet Tab */}
        {activeTab === 'wallet' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">💰 Your Wallet</h2>
              <div className="space-y-4 mb-6">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">USDC Balance</p>
                  <p className="text-3xl font-bold text-green-700">${dashboard?.balanceUsdc?.toFixed(2) || '0.00'}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">ETH Balance</p>
                  <p className="text-3xl font-bold text-blue-700">{dashboard?.balanceEth?.toFixed(6) || '0.000000'} ETH</p>
                </div>
              </div>
              <h3 className="font-semibold mb-2">Your USDC Payment Address</h3>
              <div className="p-4 bg-gray-100 rounded-lg font-mono text-sm break-all">
                {USDC_ADDRESS}
                <button onClick={copyAddress} className="ml-2 text-purple-600 hover:text-purple-800">{copied ? <Check size={16} /> : <Copy size={16} />}</button>
              </div>
              <p className="text-sm text-gray-500 mt-2">All USDC withdrawals will be sent to this address</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">💸 Withdraw Earnings</h2>
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Amount (USDC)</label>
                  <input type="number" step="0.01" min="10" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder="Enter amount (min $10)" />
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">⚠️ Minimum withdrawal: $10.00</p>
                  <p className="text-sm text-yellow-800">📍 Withdraw to: {USDC_ADDRESS.substring(0, 10)}...</p>
                  <p className="text-sm text-yellow-800">💰 Network: Ethereum (ERC-20)</p>
                </div>
                <button type="submit" className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-semibold rounded-lg hover:opacity-90">
                  Withdraw Now
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Your Videos</h2>
              <Link href="/studio" className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                <Plus size={18} /> Upload Video
              </Link>
            </div>
            <div className="space-y-4">
              {(dashboard?.videos || []).map((video: any) => (
                <div key={video.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <img src={video.thumbnailUrl} className="w-32 aspect-video object-cover rounded" />
                  <div className="flex-1">
                    <h3 className="font-semibold">{video.title}</h3>
                    <div className="flex gap-4 text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><Eye size={14} /> {Number(video.viewCount).toLocaleString()}</span>
                      <span className="flex items-center gap-1"><ThumbsUp size={14} /> {video.likeCount}</span>
                      <span className="text-green-600 font-medium">${video.earningsUsdc?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
              {(!dashboard?.videos || dashboard.videos.length === 0) && (
                <p className="text-center py-8 text-gray-500">No videos uploaded yet. <Link href="/studio" className="text-purple-600">Upload your first video!</Link></p>
              )}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-6">📊 Channel Analytics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: 'Total Views', value: Number(dashboard?.totalViews || 0).toLocaleString() },
                { label: 'Total Likes', value: dashboard?.totalLikes?.toLocaleString() || '0' },
                { label: 'Total Earnings', value: `$${dashboard?.totalEarnings?.toFixed(2) || '0.00'}` },
                { label: 'Videos', value: dashboard?.videos?.length || '0' },
              ].map((stat, i) => (
                <div key={i} className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{stat.value}</p>
                  <p className="text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
