'use client'

import { useState, useEffect } from 'react'
import { Home, Compass, TrendingUp, Library, History, PlaySquare, Clock, ThumbsUp, ChevronDown, Menu, X, Search, Bell, Upload, Wallet, User, LogIn } from 'lucide-react'
import { TrendingSection } from '@/components/TrendingSection'
import { StatsBanner } from '@/components/StatsBanner'
import { LiveSection } from '@/components/LiveSection'
import { VideoCard } from '@/components/VideoCard'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.nexastream.org'

interface Video {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  videoUrl: string
  duration: number
  views: number
  likes: number
  category: string
  rewardAmount: number
  createdAt: string
  channel: {
    id: string
    name: string
    handle: string
    avatarUrl: string
    verified: boolean
    subscribers: number
  }
}

const categories = [
  { id: 'all', name: 'All', emoji: '🎬' },
  { id: 'crypto', name: 'Crypto', emoji: '₿' },
  { id: 'defi', name: 'DeFi', emoji: '💰' },
  { id: 'nft', name: 'NFT', emoji: '🎨' },
  { id: 'gaming', name: 'Gaming', emoji: '🎮' },
  { id: 'education', name: 'Education', emoji: '📚' },
  { id: 'entertainment', name: 'Entertainment', emoji: '🎭' },
  { id: 'technology', name: 'Technology', emoji: '💻' },
]

export default function HomePage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVideos()
  }, [selectedCategory])

  const fetchVideos = async () => {
    try {
      setLoading(true)
      const url = selectedCategory === 'all'
        ? `${API_URL}/videos?limit=12`
        : `${API_URL}/videos?category=${selectedCategory}&limit=12`
      
      const res = await fetch(url)
      const data = await res.json()
      setVideos(data.videos || [])
    } catch (error) {
      console.error('Failed to fetch videos:', error)
      // Use mock data as fallback
      setVideos(getMockVideos())
    } finally {
      setLoading(false)
    }
  }

  const getMockVideos = (): Video[] => {
    return [
      { id: '1', title: 'Bitcoin Halving 2024: Complete Guide', description: 'Everything you need to know', thumbnailUrl: 'https://picsum.photos/seed/v1/640/360', videoUrl: '', duration: 1234, views: 125000, likes: 8500, category: 'crypto', rewardAmount: 25, createdAt: new Date().toISOString(), channel: { id: '1', name: 'Crypto Academy', handle: 'cryptoacademy', avatarUrl: '', verified: true, subscribers: 1200000 } },
      { id: '2', title: 'Build Your First DeFi App', description: 'Step by step tutorial', thumbnailUrl: 'https://picsum.photos/seed/v2/640/360', videoUrl: '', duration: 2345, views: 89000, likes: 6200, category: 'defi', rewardAmount: 30, createdAt: new Date().toISOString(), channel: { id: '2', name: 'DeFi Masters', handle: 'defimaster', avatarUrl: '', verified: true, subscribers: 890000 } },
      { id: '3', title: 'NFT Minting Tutorial for Beginners', description: 'Learn how to mint NFTs', thumbnailUrl: 'https://picsum.photos/seed/v3/640/360', videoUrl: '', duration: 1567, views: 67000, likes: 4500, category: 'nft', rewardAmount: 20, createdAt: new Date().toISOString(), channel: { id: '3', name: 'NFT World', handle: 'nftworld', avatarUrl: '', verified: true, subscribers: 650000 } },
      { id: '4', title: 'Web3 Development Setup Guide', description: 'Complete setup tutorial', thumbnailUrl: 'https://picsum.photos/seed/v4/640/360', videoUrl: '', duration: 1890, views: 54000, likes: 3800, category: 'education', rewardAmount: 15, createdAt: new Date().toISOString(), channel: { id: '4', name: 'Web3 Education', handle: 'web3edu', avatarUrl: '', verified: true, subscribers: 520000 } },
      { id: '5', title: 'Top 10 Crypto Gains This Week', description: 'Weekly market analysis', thumbnailUrl: 'https://picsum.photos/seed/v5/640/360', videoUrl: '', duration: 980, views: 156000, likes: 12000, category: 'crypto', rewardAmount: 35, createdAt: new Date().toISOString(), channel: { id: '1', name: 'Crypto Academy', handle: 'cryptoacademy', avatarUrl: '', verified: true, subscribers: 1200000 } },
      { id: '6', title: 'Layer 2 Solutions Explained', description: 'Scaling Ethereum', thumbnailUrl: 'https://picsum.photos/seed/v6/640/360', videoUrl: '', duration: 1456, views: 43000, likes: 2900, category: 'technology', rewardAmount: 18, createdAt: new Date().toISOString(), channel: { id: '4', name: 'Web3 Education', handle: 'web3edu', avatarUrl: '', verified: true, subscribers: 520000 } },
      { id: '7', title: 'Staking Rewards: Maximize Returns', description: 'Yield optimization strategies', thumbnailUrl: 'https://picsum.photos/seed/v7/640/360', videoUrl: '', duration: 2134, views: 38000, likes: 2600, category: 'defi', rewardAmount: 22, createdAt: new Date().toISOString(), channel: { id: '2', name: 'DeFi Masters', handle: 'defimaster', avatarUrl: '', verified: true, subscribers: 890000 } },
      { id: '8', title: 'The Future of Gaming on Blockchain', description: 'Play to earn evolution', thumbnailUrl: 'https://picsum.photos/seed/v8/640/360', videoUrl: '', duration: 1678, views: 29000, likes: 2100, category: 'gaming', rewardAmount: 12, createdAt: new Date().toISOString(), channel: { id: '3', name: 'NFT World', handle: 'nftworld', avatarUrl: '', verified: true, subscribers: 650000 } },
    ]
  }

  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`
    return views.toString()
  }

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-dark/95 backdrop-blur border-b border-slate-800 z-50">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-slate-800 rounded-lg lg:hidden"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-800 rounded-lg hidden lg:block"
            >
              <Menu className="w-6 h-6" />
            </button>
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <PlaySquare className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl hidden sm:block">NexaStream</span>
            </a>
          </div>

          <div className="flex-1 max-w-2xl mx-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search videos, channels, topics..."
                className="w-full bg-slate-800 border border-slate-700 rounded-full px-4 py-2 pl-12 text-white placeholder-slate-400 focus:outline-none focus:border-primary"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-slate-800 rounded-lg relative">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button className="btn-primary hidden sm:flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span>Connect</span>
            </button>
            <button className="p-2 hover:bg-slate-800 rounded-lg">
              <User className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Stats Banner */}
      <StatsBanner />

      {/* Main Content */}
      <div className="flex pt-28">
        {/* Sidebar */}
        <aside className={`fixed left-0 top-28 h-[calc(100vh-7rem)] bg-dark border-r border-slate-800 transition-all duration-300 z-40 overflow-y-auto ${
          sidebarOpen ? 'w-64' : 'w-16'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
          <nav className="p-4 space-y-2">
            <a href="/" className="flex items-center gap-4 px-3 py-2.5 rounded-lg bg-slate-800 text-white">
              <Home className="w-5 h-5" />
              {sidebarOpen && <span>Home</span>}
            </a>
            <a href="/explore" className="flex items-center gap-4 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white">
              <Compass className="w-5 h-5" />
              {sidebarOpen && <span>Explore</span>}
            </a>
            <a href="/trending" className="flex items-center gap-4 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white">
              <TrendingUp className="w-5 h-5" />
              {sidebarOpen && <span>Trending</span>}
            </a>
            
            {sidebarOpen && <div className="my-4 border-t border-slate-800" />}
            
            <a href="/library" className="flex items-center gap-4 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white">
              <Library className="w-5 h-5" />
              {sidebarOpen && <span>Library</span>}
            </a>
            <a href="/history" className="flex items-center gap-4 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white">
              <History className="w-5 h-5" />
              {sidebarOpen && <span>History</span>}
            </a>
            <a href="/your-videos" className="flex items-center gap-4 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white">
              <PlaySquare className="w-5 h-5" />
              {sidebarOpen && <span>Your Videos</span>}
            </a>
            <a href="/watch-later" className="flex items-center gap-4 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white">
              <Clock className="w-5 h-5" />
              {sidebarOpen && <span>Watch Later</span>}
            </a>
            <a href="/liked" className="flex items-center gap-4 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white">
              <ThumbsUp className="w-5 h-5" />
              {sidebarOpen && <span>Liked Videos</span>}
            </a>
            
            {sidebarOpen && (
              <>
                <div className="my-4 border-t border-slate-800" />
                <div className="px-3 py-2">
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Subscriptions</h3>
                  {['Crypto Academy', 'DeFi Masters', 'NFT World', 'Web3 Education'].map(channel => (
                    <a key={channel} href={`/@${channel.toLowerCase().replace(' ', '')}`} className="flex items-center gap-3 py-2 text-slate-400 hover:text-white">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent" />
                      <span className="text-sm">{channel}</span>
                    </a>
                  ))}
                </div>
              </>
            )}
          </nav>
        </aside>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Main */}
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
          {/* Live Section */}
          <LiveSection />

          {/* Categories */}
          <div className="px-6 py-4">
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-primary text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {cat.emoji} {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Trending Section */}
          <TrendingSection />

          {/* Video Grid */}
          <section className="px-6 py-6">
            <h2 className="text-xl font-bold mb-4">Recommended</h2>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-video bg-slate-800 rounded-xl mb-3" />
                    <div className="h-4 bg-slate-800 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-800 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {videos.map(video => (
                  <div key={video.id} className="video-card group cursor-pointer">
                    <div className="relative aspect-video rounded-xl overflow-hidden mb-3">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs font-medium text-white">
                        {formatDuration(video.duration)}
                      </div>
                      <div className="absolute top-2 left-2 px-2 py-1 bg-gradient-to-r from-primary to-accent rounded-full text-xs font-bold text-white flex items-center gap-1">
                        <span>⭐</span>
                        {video.rewardAmount} NEXA
                      </div>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-14 h-14 bg-primary/90 rounded-full flex items-center justify-center">
                          <PlaySquare className="w-7 h-7 text-white ml-1" />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium line-clamp-2 group-hover:text-primary transition-colors">
                          {video.title}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-slate-400 mt-1">
                          <span>{video.channel.name}</span>
                          {video.channel.verified && (
                            <span className="text-primary">✓</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                          <span>{formatViews(video.views)} views</span>
                          <span>•</span>
                          <span>2 days ago</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Footer */}
          <footer className="border-t border-slate-800 mt-12 px-6 py-8">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                      <PlaySquare className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-lg">NexaStream</span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    The decentralized video platform powered by NexaChain blockchain.
                    Watch, create, and earn cryptocurrency.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium mb-4">Platform</h4>
                  <ul className="space-y-2 text-slate-400 text-sm">
                    <li><a href="/about" className="hover:text-white">About</a></li>
                    <li><a href="/careers" className="hover:text-white">Careers</a></li>
                    <li><a href="/press" className="hover:text-white">Press</a></li>
                    <li><a href="/blog" className="hover:text-white">Blog</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-4">Resources</h4>
                  <ul className="space-y-2 text-slate-400 text-sm">
                    <li><a href="/help" className="hover:text-white">Help Center</a></li>
                    <li><a href="/creators" className="hover:text-white">Creator Academy</a></li>
                    <li><a href="/docs" className="hover:text-white">Documentation</a></li>
                    <li><a href="/community" className="hover:text-white">Community</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-4">Legal</h4>
                  <ul className="space-y-2 text-slate-400 text-sm">
                    <li><a href="/terms" className="hover:text-white">Terms of Service</a></li>
                    <li><a href="/privacy" className="hover:text-white">Privacy Policy</a></li>
                    <li><a href="/cookies" className="hover:text-white">Cookie Policy</a></li>
                    <li><a href="/licenses" className="hover:text-white">Licenses</a></li>
                  </ul>
                </div>
              </div>
              <div className="border-t border-slate-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
                <p className="text-slate-400 text-sm">
                  © 2024 NexaStream. All rights reserved. Powered by NexaChain.
                </p>
                <div className="flex items-center gap-4 mt-4 md:mt-0">
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                    Network: Operational
                  </span>
                  <span className="px-3 py-1 bg-primary/20 text-primary rounded-full text-xs">
                    $NEXA: $0.0234
                  </span>
                </div>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  )
}
