'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getDemoChannels } from '@/lib/db/mockData';
import { formatNumber } from '@/lib/utils';
import { Search, Filter, Users, Eye, TrendingUp, CheckCircle, Plus } from 'lucide-react';

export default function ChannelsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'subscribers' | 'views' | 'recent'>('subscribers');
  const channels = getDemoChannels();

  const filteredChannels = channels
    .filter(channel => 
      channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.description?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'subscribers') return b.subscriberCount - a.subscriberCount;
      if (sortBy === 'views') return b.totalViews - a.totalViews;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="min-h-screen bg-dark-100">
      {/* Header */}
      <div className="bg-dark-200 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Channels</h1>
              <p className="text-gray-400 mt-1">Discover and subscribe to your favorite creators</p>
            </div>
            <Link href="/create-channel" className="btn-primary flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create Channel
            </Link>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-dark-100 rounded-xl border border-white/10 
                         text-white placeholder-gray-500 focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('subscribers')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  sortBy === 'subscribers' 
                    ? 'bg-primary text-white' 
                    : 'bg-dark-100 text-gray-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                Subscribers
              </button>
              <button
                onClick={() => setSortBy('views')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  sortBy === 'views' 
                    ? 'bg-primary text-white' 
                    : 'bg-dark-100 text-gray-400 hover:text-white'
                }`}
              >
                <Eye className="w-4 h-4" />
                Views
              </button>
              <button
                onClick={() => setSortBy('recent')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  sortBy === 'recent' 
                    ? 'bg-primary text-white' 
                    : 'bg-dark-100 text-gray-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Rising
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Channels Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredChannels.map((channel) => (
            <Link 
              key={channel.id} 
              href={`/channel/${channel.slug}`}
              className="bg-dark-200 rounded-2xl border border-white/10 overflow-hidden hover:border-primary/50 transition-all group"
            >
              {/* Banner */}
              <div className="h-24 bg-gradient-to-r from-primary/20 to-accent/20 relative">
                {channel.banner && (
                  <Image
                    src={channel.banner}
                    alt={`${channel.name} banner`}
                    fill
                    className="object-cover"
                  />
                )}
              </div>

              {/* Channel Info */}
              <div className="p-4 -mt-8 relative">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent 
                              flex items-center justify-center text-white font-bold text-xl
                              border-4 border-dark-200 group-hover:border-primary transition-colors">
                  {channel.name.slice(0, 2).toUpperCase()}
                </div>

                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold group-hover:text-primary transition-colors">
                      {channel.name}
                    </h3>
                    {channel.isVerified && (
                      <CheckCircle className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mt-1">@{channel.slug}</p>
                  
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {formatNumber(channel.subscriberCount)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {formatNumber(channel.totalViews)}
                    </span>
                  </div>

                  {channel.description && (
                    <p className="text-gray-500 text-sm mt-2 line-clamp-2">
                      {channel.description}
                    </p>
                  )}

                  <div className="mt-4">
                    <button className="w-full py-2 bg-white/10 rounded-lg text-white font-medium 
                                     hover:bg-primary transition-colors">
                      Subscribe
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredChannels.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No channels found</h3>
            <p className="text-gray-400">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
