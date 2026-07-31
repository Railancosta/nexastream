/**
 * NexaStream - Home Page
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '../lib/store';
import api from '../lib/api';
import Head from 'next/head';

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  videoUrl?: string;
  duration: number;
  viewCount: string;
  likeCount: number;
  earningsUsdc: number;
  channel: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string;
  };
}

interface Channel {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string;
  subscriberCount: number;
  videoCount: number;
  totalEarnings: number;
}

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();
  const [videos, setVideos] = useState<Video[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeTab, setActiveTab] = useState<'forYou' | 'trending' | 'newCreators'>('forYou');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [videosRes, channelsRes] = await Promise.all([
        api.getVideos({ limit: 20, sort: 'trending' }),
        api.getChannels({ limit: 10, sort: 'subscribers' }),
      ]);
      setVideos(videosRes.data);
      setChannels(channelsRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setIsLoading(false);
  };

  const formatViews = (count: number | string) => {
    const num = typeof count === 'string' ? parseInt(count) : count;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Head>
        <title>NexaStream - The First Democratic Video Platform</title>
        <meta name="description" content="Instant monetization, transparent algorithms, creator-first economics. Join the revolution." />
      </Head>

      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-xl font-bold">
                N
              </div>
              <span className="text-xl font-bold">NexaStream</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
              <Link href="/" className="text-gray-300 hover:text-white transition">Home</Link>
              <Link href="/explore" className="text-gray-300 hover:text-white transition">Explore</Link>
              <Link href="/channels" className="text-gray-300 hover:text-white transition">Channels</Link>
            </nav>

            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <Link href="/studio" className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium transition">
                    Creator Studio
                  </Link>
                  <Link href="/wallet" className="bg-gradient-to-r from-green-400 to-cyan-400 text-black px-4 py-2 rounded-lg font-medium transition">
                    💰 Wallet
                  </Link>
                  <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg font-bold">
                        {user?.name?.[0] || 'U'}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login" className="text-gray-300 hover:text-white transition">
                    Sign In
                  </Link>
                  <Link href="/register" className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 rounded-lg font-medium hover:opacity-90 transition">
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="bg-gradient-to-b from-purple-900/50 to-gray-900 py-20">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              The First <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Democratic</span> Video Platform
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Instant monetization from your first view. Transparent algorithms you can customize. 
              Payments in USDC and crypto. Join 269,700+ creators earning their way.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/register" className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 rounded-xl font-bold text-lg hover:opacity-90 transition">
                Start Creating Today
              </Link>
              <Link href="/explore" className="bg-gray-800 hover:bg-gray-700 px-8 py-4 rounded-xl font-bold text-lg transition">
                Explore Platform
              </Link>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <div className="text-4xl font-bold text-purple-400">1.2M+</div>
                <div className="text-gray-400">Total Views</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-pink-400">269,700+</div>
                <div className="text-gray-400">Creators</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-green-400">$941+</div>
                <div className="text-gray-400">Paid to Creators</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-cyan-400">USDC</div>
                <div className="text-gray-400">Instant Payments</div>
              </div>
            </div>
          </div>
        </section>

        {/* Feed Tabs */}
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex gap-4 border-b border-gray-800 pb-4">
            {['forYou', 'trending', 'newCreators'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-2 rounded-lg font-medium transition ${
                  activeTab === tab
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {tab === 'forYou' ? 'For You' : tab === 'trending' ? '🔥 Trending' : '⭐ New Creators'}
              </button>
            ))}
          </div>

          {/* Algorithm Customization */}
          <div className="mt-6 bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Customize Your Algorithm</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="flex justify-between mb-2">
                  <span className="text-gray-400">🔥 Trending</span>
                  <span className="text-purple-400">33%</span>
                </label>
                <input type="range" min="0" max="100" defaultValue="33" className="w-full accent-purple-500" />
              </div>
              <div>
                <label className="flex justify-between mb-2">
                  <span className="text-gray-400">⭐ Merit</span>
                  <span className="text-pink-400">33%</span>
                </label>
                <input type="range" min="0" max="100" defaultValue="33" className="w-full accent-pink-500" />
              </div>
              <div>
                <label className="flex justify-between mb-2">
                  <span className="text-gray-400">👥 Social</span>
                  <span className="text-cyan-400">34%</span>
                </label>
                <input type="range" min="0" max="100" defaultValue="34" className="w-full accent-cyan-500" />
              </div>
            </div>
          </div>

          {/* Video Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-800 rounded-xl aspect-video mb-3" />
                  <div className="bg-gray-800 h-4 rounded w-3/4 mb-2" />
                  <div className="bg-gray-800 h-3 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              {videos.map((video) => (
                <Link key={video.id} href={`/watch/${video.id}`} className="group">
                  <div className="relative aspect-video bg-gray-800 rounded-xl overflow-hidden mb-3">
                    <img 
                      src={video.thumbnailUrl} 
                      alt={video.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-sm">
                      {formatDuration(video.duration)}
                    </div>
                    {video.earningsUsdc > 100 && (
                      <div className="absolute top-2 left-2 bg-green-500 px-2 py-1 rounded text-xs font-bold">
                        💰 ${video.earningsUsdc.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <h3 className="font-medium line-clamp-2 group-hover:text-purple-400 transition">
                    {video.title}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <img 
                      src={video.channel?.avatarUrl || 'https://api.dicebear.com/7.x/shapes/svg?seed=' + video.channel?.slug} 
                      alt={video.channel?.name}
                      className="w-8 h-8 rounded-full bg-gray-700"
                    />
                    <div className="text-sm text-gray-400">
                      <div>{video.channel?.name}</div>
                      <div>{formatViews(video.viewCount)} views</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Top Channels */}
        <section className="max-w-7xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-6">Top Creators</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {channels.map((channel, i) => (
              <Link 
                key={channel.id} 
                href={`/channel/${channel.slug}`}
                className="bg-gray-800/50 rounded-xl p-6 hover:bg-gray-800 transition border border-gray-700"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <img 
                      src={channel.avatarUrl || `https://api.dicebear.com/7.x/shapes/svg?seed=${channel.slug}`}
                      alt={channel.name}
                      className="w-16 h-16 rounded-full bg-gray-700"
                    />
                    {i < 3 && (
                      <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : 'bg-amber-600'
                      }`}>
                        {i + 1}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{channel.name}</h3>
                    <p className="text-sm text-gray-400">@{channel.slug}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400">Subscribers</div>
                    <div className="font-semibold">{formatViews(channel.subscriberCount)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Earnings</div>
                    <div className="font-semibold text-green-400">${channel.totalEarnings.toFixed(0)}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="bg-gray-800/50 py-16">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Why NexaStream?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-gray-900 rounded-2xl p-8 border border-gray-700">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-3xl mb-6">
                  💰
                </div>
                <h3 className="text-xl font-bold mb-3">Instant Monetization</h3>
                <p className="text-gray-400">
                  Earn from your very first view. No minimum subscribers, no waiting period. 
                  Get paid in USDC directly to your wallet.
                </p>
              </div>
              <div className="bg-gray-900 rounded-2xl p-8 border border-gray-700">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center text-3xl mb-6">
                  🎯
                </div>
                <h3 className="text-xl font-bold mb-3">Transparent Algorithms</h3>
                <p className="text-gray-400">
                  See exactly how videos are ranked. Customize your own feed with adjustable 
                  trending, merit, and social weights.
                </p>
              </div>
              <div className="bg-gray-900 rounded-2xl p-8 border border-gray-700">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center text-3xl mb-6">
                  🔐
                </div>
                <h3 className="text-xl font-bold mb-3">Blockchain Security</h3>
                <p className="text-gray-400">
                  Payments are secured by Ethereum blockchain. Your earnings are 
                  transparent, immutable, and truly yours.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 border-t border-gray-800 py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-xl font-bold">
                    N
                  </div>
                  <span className="text-xl font-bold">NexaStream</span>
                </div>
                <p className="text-gray-400">
                  The first democratic video platform. Built for creators, powered by blockchain.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Platform</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><Link href="/about" className="hover:text-white transition">About</Link></li>
                  <li><Link href="/creators" className="hover:text-white transition">For Creators</Link></li>
                  <li><Link href="/advertisers" className="hover:text-white transition">For Advertisers</Link></li>
                  <li><Link href="/pricing" className="hover:text-white transition">Pricing</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Resources</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><Link href="/help" className="hover:text-white transition">Help Center</Link></li>
                  <li><Link href="/docs" className="hover:text-white transition">Documentation</Link></li>
                  <li><Link href="/api" className="hover:text-white transition">API</Link></li>
                  <li><Link href="/blog" className="hover:text-white transition">Blog</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-4">Legal</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><Link href="/terms" className="hover:text-white transition">Terms of Service</Link></li>
                  <li><Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
                  <li><Link href="/cookies" className="hover:text-white transition">Cookie Policy</Link></li>
                  <li><Link href="/gdpr" className="hover:text-white transition">GDPR</Link></li>
                </ul>
              </div>
            </div>
            <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-400 text-sm">
                © 2024 NexaStream. All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition">
                  𝕏
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
