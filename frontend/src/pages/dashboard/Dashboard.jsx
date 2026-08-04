"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [videos, setVideos] = useState([]);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [statsRes, videosRes, profileRes] = await Promise.all([
        api.getPlatformStats(),
        api.getTrendingVideos(),
        api.getProfile().catch(() => ({ user: null, channels: [] }))
      ]);
      
      setStats(statsRes);
      setVideos(videosRes.videos || []);
      setChannel(profileRes.channels?.[0] || null);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              NexaStream
            </span>
          </Link>
          
          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search videos, channels, NFT..."
                className="w-full bg-gray-700 border border-gray-600 rounded-full px-6 py-2 pl-12 focus:outline-none focus:border-purple-500"
              />
              <svg className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link href="/studio" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium">
              + Create
            </Link>
            <Link href="/wallet" className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-lg font-medium">
              💰 Wallet
            </Link>
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
              {channel?.displayName?.[0]?.toUpperCase() || 'U'}
            </div>
          </div>
        </div>
      </header>

      {/* Stats Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-pink-900 py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold">{stats?.totalVideos?.toLocaleString() || '0'}</div>
              <div className="text-gray-300">Videos</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{stats?.totalViews?.toLocaleString() || '0'}</div>
              <div className="text-gray-300">Total Views</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{stats?.totalUsers?.toLocaleString() || '0'}</div>
              <div className="text-gray-300">Users</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{stats?.liveStreams || '0'}</div>
              <div className="text-gray-300">🔴 Live Now</div>
            </div>
            <div>
              <div className="text-3xl font-bold">{stats?.totalEarnings?.toFixed(2) || '0'} NEXA</div>
              <div className="text-gray-300">Rewards Paid</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Link href="/studio/upload" className="bg-gray-800 hover:bg-gray-750 p-4 rounded-xl text-center transition">
            <div className="text-3xl mb-2">📤</div>
            <div className="text-sm">Upload Video</div>
          </Link>
          <Link href="/studio/stream" className="bg-gray-800 hover:bg-gray-750 p-4 rounded-xl text-center transition">
            <div className="text-3xl mb-2">🔴</div>
            <div className="text-sm">Go Live</div>
          </Link>
          <Link href="/studio/nft" className="bg-gray-800 hover:bg-gray-750 p-4 rounded-xl text-center transition">
            <div className="text-3xl mb-2">🎨</div>
            <div className="text-sm">Create NFT</div>
          </Link>
          <Link href="/studio/analytics" className="bg-gray-800 hover:bg-gray-750 p-4 rounded-xl text-center transition">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-sm">Analytics</div>
          </Link>
          <Link href="/wallet" className="bg-gray-800 hover:bg-gray-750 p-4 rounded-xl text-center transition">
            <div className="text-3xl mb-2">💎</div>
            <div className="text-sm">Wallet</div>
          </Link>
          <Link href="/settings" className="bg-gray-800 hover:bg-gray-750 p-4 rounded-xl text-center transition">
            <div className="text-3xl mb-2">⚙️</div>
            <div className="text-sm">Settings</div>
          </Link>
        </div>
      </div>

      {/* Trending Videos */}
      <div className="container mx-auto px-4 py-6">
        <h2 className="text-xl font-bold mb-4">🔥 Trending Videos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {videos.map((video) => (
            <Link key={video.id} href={`/watch/${video.id}`} className="bg-gray-800 rounded-xl overflow-hidden hover:transform hover:scale-105 transition">
              <div className="relative">
                <img 
                  src={video.thumbnail || `https://picsum.photos/seed/${video.id}/640/360`} 
                  alt={video.title}
                  className="w-full h-40 object-cover"
                />
                <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs">
                  {video.duration || '10:00'}
                </div>
                {video.isLive && (
                  <div className="absolute top-2 left-2 bg-red-600 px-2 py-1 rounded text-xs font-bold">
                    🔴 LIVE
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-medium line-clamp-2 mb-2">{video.title}</h3>
                <div className="flex items-center text-sm text-gray-400">
                  <div className="w-6 h-6 bg-purple-600 rounded-full mr-2"></div>
                  <span>{video.channelName || 'Creator'}</span>
                </div>
                <div className="text-sm text-gray-400 mt-2">
                  {video.views?.toLocaleString() || '0'} views • {(video.createdAt || Date.now() - 86400000) ? `${Math.floor((Date.now() - new Date(video.createdAt).getTime()) / 86400000)}d ago` : 'Today'}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="container mx-auto px-4 py-6">
        <h2 className="text-xl font-bold mb-4">📂 Categories</h2>
        <div className="flex flex-wrap gap-3">
          {['Crypto', 'DeFi', 'NFT', 'Tutorial', 'Gaming', 'Music', 'Entertainment', 'News', 'Sports', 'Tech'].map((cat) => (
            <Link key={cat} href={`/explore?category=${cat}`} className="bg-gray-800 hover:bg-purple-600 px-4 py-2 rounded-full transition">
              {cat}
            </Link>
          ))}
        </div>
      </div>

      {/* Live Streams */}
      <div className="container mx-auto px-4 py-6">
        <h2 className="text-xl font-bold mb-4">🔴 Live Now</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {videos.filter(v => v.isLive).slice(0, 3).map((video) => (
            <Link key={video.id} href={`/watch/${video.id}`} className="bg-gray-800 rounded-xl overflow-hidden hover:transform hover:scale-105 transition relative">
              <div className="relative">
                <img 
                  src={video.thumbnail} 
                  alt={video.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 left-2 bg-red-600 px-2 py-1 rounded text-xs font-bold animate-pulse">
                  🔴 LIVE • {video.viewers?.toLocaleString() || '0'}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-medium">{video.title}</h3>
                <div className="text-sm text-gray-400 mt-2">{video.channelName}</div>
              </div>
            </Link>
          ))}
          {(!videos.some(v => v.isLive)) && (
            <div className="col-span-full text-center py-12 bg-gray-800 rounded-xl">
              <div className="text-4xl mb-4">📺</div>
              <p className="text-gray-400">No live streams right now. Be the first to go live!</p>
              <Link href="/studio/stream" className="inline-block mt-4 bg-purple-600 px-6 py-2 rounded-lg">
                Start Streaming
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p>© 2024 NexaStream. Powered by Blockchain Technology.</p>
          <div className="flex justify-center space-x-4 mt-4">
            <Link href="/about" className="hover:text-white">About</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
