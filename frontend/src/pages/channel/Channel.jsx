"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useParams } from 'next/navigation';

export default function Channel() {
  const params = useParams();
  const username = params?.username;
  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('videos');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (username) {
      loadChannel();
    }
  }, [username]);

  async function loadChannel() {
    try {
      setLoading(true);
      const res = await api.getChannel(username).catch(() => null);
      
      if (res?.channel) {
        setChannel(res.channel);
        setVideos(res.videos || []);
        setSubscribed(res.isSubscribed);
      } else {
        // Demo data
        setChannel({
          id: 'demo',
          username,
          displayName: username,
          description: 'Welcome to my channel!',
          subscribers: 125000,
          totalViews: 5000000,
          totalVideos: 156,
          isVerified: true,
        });
        setVideos([
          { id: '1', title: 'Video 1', thumbnail: 'https://picsum.photos/seed/1/640/360', views: 10000 },
          { id: '2', title: 'Video 2', thumbnail: 'https://picsum.photos/seed/2/640/360', views: 8000 },
        ]);
      }
    } catch (error) {
      console.error('Failed to load channel:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe() {
    try {
      const res = await api.subscribe(channel.id);
      setSubscribed(res.subscribed);
      setChannel(prev => ({
        ...prev,
        subscribers: res.subscribed ? prev.subscribers + 1 : prev.subscribers - 1
      }));
    } catch (error) {
      console.error('Failed to subscribe:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold mb-2">Channel Not Found</h2>
          <Link href="/" className="text-purple-400 hover:text-purple-300">Go Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            NexaStream
          </Link>
          <div className="flex-1 max-w-md mx-4">
            <input
              type="text"
              placeholder="Search..."
              className="w-full bg-gray-700 border border-gray-600 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/studio" className="text-gray-400 hover:text-white">+ Create</Link>
            <Link href="/wallet" className="bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 rounded-full text-sm">💰</Link>
          </div>
        </div>
      </header>

      {/* Banner */}
      <div className="h-48 bg-gradient-to-r from-purple-900 via-pink-900 to-purple-900"></div>

      {/* Channel Info */}
      <div className="container mx-auto px-4">
        <div className="flex items-start justify-between -mt-12 mb-6">
          <div className="flex items-end space-x-6">
            <div className="w-24 h-24 bg-purple-600 rounded-full border-4 border-gray-900 flex items-center justify-center text-3xl font-bold">
              {channel.displayName?.[0]?.toUpperCase() || 'C'}
            </div>
            <div className="pb-2">
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold">{channel.displayName}</h1>
                {channel.isVerified && (
                  <span className="bg-blue-500 text-xs px-2 py-0.5 rounded-full">✓ Verified</span>
                )}
              </div>
              <p className="text-gray-400">@{channel.username}</p>
              <p className="text-sm text-gray-400 mt-1">
                {channel.subscribers?.toLocaleString()} subscribers • {(channel.totalViews || 0).toLocaleString()} views
              </p>
            </div>
          </div>
          <button
            onClick={handleSubscribe}
            className={`px-8 py-3 rounded-full font-bold text-lg transition ${
              subscribed
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {subscribed ? 'Subscribed ✓' : 'Subscribe'}
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-6">
          <div className="flex space-x-8">
            {['videos', 'playlists', 'community', 'about'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 border-b-2 transition capitalize ${
                  activeTab === tab
                    ? 'border-purple-500 text-purple-500'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeTab === 'videos' && (
          <div>
            {/* Sort/Filter */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <button className="px-4 py-2 bg-gray-800 rounded-lg">Popular</button>
                <button className="px-4 py-2 text-gray-400 hover:bg-gray-800 rounded-lg">Recent</button>
                <button className="px-4 py-2 text-gray-400 hover:bg-gray-800 rounded-lg">Oldest</button>
              </div>
              <button className="flex items-center space-x-2 text-gray-400">
                <span>Grid</span>
                <span>List</span>
              </button>
            </div>

            {/* Video Grid */}
            {videos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {videos.map((video) => (
                  <Link key={video.id} href={`/watch/${video.id}`} className="group">
                    <div className="bg-gray-800 rounded-xl overflow-hidden group-hover:scale-105 transition">
                      <div className="relative">
                        <img
                          src={video.thumbnail || `https://picsum.photos/seed/${video.id}/640/360`}
                          alt={video.title}
                          className="w-full h-40 object-cover"
                        />
                        <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs">
                          {video.duration || '10:00'}
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium line-clamp-2 group-hover:text-purple-400">{video.title}</h3>
                        <p className="text-sm text-gray-400 mt-2">
                          {(video.views || 0).toLocaleString()} views • {formatTime(video.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📹</div>
                <h3 className="text-xl font-bold mb-2">No videos yet</h3>
                <p className="text-gray-400">This channel hasn't uploaded any videos.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'playlists' && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold mb-2">No playlists</h3>
            <p className="text-gray-400">This channel hasn't created any playlists.</p>
          </div>
        )}

        {activeTab === 'community' && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-bold mb-2">Community Posts</h3>
            <p className="text-gray-400">No community posts yet.</p>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="max-w-2xl">
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="font-bold mb-4">About</h3>
              <p className="text-gray-300 mb-4">
                {channel.description || 'No description provided.'}
              </p>
              <div className="border-t border-gray-700 pt-4">
                <p className="text-gray-400">
                  <span className="font-medium text-white">Joined:</span>{' '}
                  {channel.createdAt ? new Date(channel.createdAt).toLocaleDateString() : 'Recently'}
                </p>
                <p className="text-gray-400 mt-2">
                  <span className="font-medium text-white">Total Views:</span>{' '}
                  {(channel.totalViews || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(date) {
  if (!date) return 'Recently';
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}
