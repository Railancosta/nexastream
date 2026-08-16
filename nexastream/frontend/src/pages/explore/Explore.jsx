"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

const CATEGORIES = [
  { id: 'all', name: 'All', icon: '🎬' },
  { id: 'crypto', name: 'Crypto', icon: '₿' },
  { id: 'defi', name: 'DeFi', icon: '💰' },
  { id: 'nft', name: 'NFT', icon: '🎨' },
  { id: 'tutorial', name: 'Tutorial', icon: '📚' },
  { id: 'gaming', name: 'Gaming', icon: '🎮' },
  { id: 'music', name: 'Music', icon: '🎵' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎭' },
  { id: 'news', name: 'News', icon: '📰' },
  { id: 'sports', name: 'Sports', icon: '⚽' },
  { id: 'tech', name: 'Tech', icon: '💻' },
];

const FILTERS = [
  { id: 'recent', name: 'Recent' },
  { id: 'popular', name: 'Most Popular' },
  { id: 'trending', name: 'Trending' },
  { id: 'oldest', name: 'Oldest' },
];

const DURATIONS = [
  { id: 'all', name: 'Any duration' },
  { id: 'short', name: 'Under 4 min' },
  { id: 'medium', name: '4-20 min' },
  { id: 'long', name: 'Over 20 min' },
];

export default function Explore() {
  const [videos, setVideos] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [filter, setFilter] = useState('recent');
  const [duration, setDuration] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadContent();
  }, [category, filter, page]);

  async function loadContent() {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (category !== 'all') params.category = category;
      if (filter) params.sort = filter;
      
      const [videosRes, channelsRes] = await Promise.all([
        api.getVideos(params).catch(() => ({ videos: [] })),
        api.getTrendingChannels().catch(() => ({ channels: [] })),
      ]);
      
      if (page === 1) {
        setVideos(videosRes.videos || []);
      } else {
        setVideos(prev => [...prev, ...(videosRes.videos || [])]);
      }
      setChannels(channelsRes.channels?.slice(0, 5) || []);
      setHasMore((videosRes.videos?.length || 0) === 20);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    try {
      const res = await api.getVideos({ search: searchQuery });
      setVideos(res.videos || []);
    } catch (error) {
      console.error('Search failed:', error);
    }
  }

  function loadMore() {
    if (hasMore && !loading) {
      setPage(p => p + 1);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              NexaStream
            </Link>
            
            <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-8">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search videos, channels, NFT..."
                  className="w-full bg-gray-700 border border-gray-600 rounded-full px-6 py-2 pl-12 focus:outline-none focus:border-purple-500"
                />
                <svg className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </form>
            
            <div className="flex items-center space-x-4">
              <Link href="/notifications" className="relative">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute -top-1 -right-1 bg-red-500 text-xs w-4 h-4 rounded-full flex items-center justify-center">3</span>
              </Link>
              <Link href="/studio" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium">
                + Create
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Categories */}
        <div className="flex space-x-3 overflow-x-auto pb-4 mb-6">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setCategory(cat.id); setPage(1); }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full whitespace-nowrap transition ${
                category === cat.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between mb-6">
          <div className="flex space-x-4">
            <select
              value={filter}
              onChange={(e) => { setFilter(e.target.value); setPage(1); }}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
            >
              {FILTERS.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <select
              value={duration}
              onChange={(e) => { setDuration(e.target.value); setPage(1); }}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
            >
              {DURATIONS.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="text-gray-400">
            {videos.length} videos found
          </div>
        </div>

        <div className="flex flex-wrap -mx-4">
          {/* Main Content */}
          <div className="flex-1 px-4">
            {/* Video Grid */}
            {loading && videos.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-800 rounded-xl h-40 mb-4"></div>
                    <div className="h-4 bg-gray-800 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-800 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : videos.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {videos.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
                
                {hasMore && (
                  <div className="text-center mt-8">
                    <button
                      onClick={loadMore}
                      className="bg-gray-800 hover:bg-gray-700 px-8 py-3 rounded-lg transition"
                    >
                      {loading ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold mb-2">No videos found</h3>
                <p className="text-gray-400">Try adjusting your filters or search terms</p>
              </div>
            )}
          </div>

          {/* Sidebar - Trending Channels */}
          <aside className="w-80 px-4">
            <div className="bg-gray-800 rounded-xl p-6 sticky top-24">
              <h3 className="text-lg font-bold mb-4">🔥 Trending Channels</h3>
              <div className="space-y-4">
                {channels.map((channel, i) => (
                  <Link key={channel.id} href={`/channel/${channel.username}`} className="flex items-center space-x-3 hover:bg-gray-700 p-2 rounded-lg transition">
                    <div className="relative">
                      <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                        {channel.displayName?.[0]?.toUpperCase() || 'C'}
                      </div>
                      <span className="absolute -top-1 -left-1 bg-yellow-500 text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                        {i + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{channel.displayName}</p>
                      <p className="text-sm text-gray-400">{channel.subscribers?.toLocaleString()} subscribers</p>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-700">
                <h4 className="font-medium mb-3">Quick Links</h4>
                <div className="space-y-2">
                  <Link href="/trending" className="flex items-center space-x-2 text-gray-400 hover:text-white">
                    <span>📈</span><span>Trending</span>
                  </Link>
                  <Link href="/live" className="flex items-center space-x-2 text-gray-400 hover:text-white">
                    <span>🔴</span><span>Live Now</span>
                  </Link>
                  <Link href="/shorts" className="flex items-center space-x-2 text-gray-400 hover:text-white">
                    <span>📱</span><span>Shorts</span>
                  </Link>
                  <Link href="/nft" className="flex items-center space-x-2 text-gray-400 hover:text-white">
                    <span>🎨</span><span>NFT Gallery</span>
                  </Link>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function VideoCard({ video }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <Link 
      href={`/watch/${video.id}`}
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="bg-gray-800 rounded-xl overflow-hidden group-hover:scale-105 transition duration-300">
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
            <div className="absolute top-2 left-2 bg-red-600 px-2 py-1 rounded text-xs font-bold animate-pulse">
              🔴 LIVE
            </div>
          )}
          {video.isPremium && (
            <div className="absolute top-2 right-2 bg-yellow-500 px-2 py-1 rounded text-xs font-bold">
              ⭐ PRO
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-medium line-clamp-2 mb-2 group-hover:text-purple-400 transition">
            {video.title}
          </h3>
          <div className="flex items-center text-sm text-gray-400">
            <div className="w-6 h-6 bg-purple-600 rounded-full mr-2 flex-shrink-0"></div>
            <span className="truncate">{video.channelName || 'Creator'}</span>
          </div>
          <div className="flex items-center text-sm text-gray-500 mt-2">
            <span>{formatViews(video.views)} views</span>
            <span className="mx-1">•</span>
            <span>{formatTime(video.createdAt)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function formatViews(views) {
  if (!views) return '0';
  if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
  if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
  return views;
}

function formatTime(date) {
  if (!date) return 'Recently';
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}
