"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export default function CreatorStudio() {
  const [activeTab, setActiveTab] = useState('videos');
  const [videos, setVideos] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadStudio();
  }, [activeTab]);

  async function loadStudio() {
    try {
      setLoading(true);
      const profileRes = await api.getProfile().catch(() => ({ channels: [] }));
      const ch = profileRes.channels?.[0];
      setChannel(ch);

      if (ch) {
        if (activeTab === 'videos') {
          const res = await api.getChannelVideos(ch.id);
          setVideos(res.videos || []);
        } else if (activeTab === 'analytics' && ch) {
          const res = await api.getChannelAnalytics(ch.id);
          setAnalytics(res);
        }
      }
    } catch (error) {
      console.error('Failed to load studio:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleVideoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadRes = await api.uploadFile(file, setUploadProgress);
      const videoRes = await api.createVideo({
        title: file.name.replace(/\.[^/.]+$/, ''),
        videoUrl: uploadRes.file.url,
      });
      setVideos([videoRes.video, ...videos]);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  }

  async function handleGoLive() {
    try {
      const stream = await api.createLivestream({
        title: 'My Live Stream',
        category: 'Entertainment',
      });
      alert(`Stream key: ${stream.streamKey}\nRTMP URL: ${stream.streamUrl}`);
    } catch (error) {
      console.error('Failed to start stream:', error);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
              NexaStream Studio
            </Link>
            {channel && (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-600 rounded-full"></div>
                <span>{channel.displayName}</span>
                {channel.isVerified && <span className="text-blue-500">✓</span>}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-gray-400 hover:text-white">
              ← Back to NexaStream
            </Link>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: 'videos', label: 'Videos', icon: '🎬' },
              { id: 'live', label: 'Live', icon: '🔴' },
              { id: 'analytics', label: 'Analytics', icon: '📊' },
              { id: 'nft', label: 'NFTs', icon: '🎨' },
              { id: 'settings', label: 'Settings', icon: '⚙️' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-500'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {activeTab === 'videos' && (
          <div>
            {/* Upload Area */}
            <div className="mb-8">
              <label className="block bg-gray-800 border-2 border-dashed border-gray-600 rounded-xl p-12 text-center cursor-pointer hover:border-purple-500 transition">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                  disabled={uploading}
                />
                {uploading ? (
                  <div>
                    <div className="text-4xl mb-4">⏳</div>
                    <p className="text-lg mb-2">Uploading... {uploadProgress.toFixed(0)}%</p>
                    <div className="w-64 h-2 bg-gray-700 rounded-full mx-auto">
                      <div
                        className="h-full bg-purple-500 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-4">📤</div>
                    <p className="text-lg mb-2">Drag and drop your video here</p>
                    <p className="text-gray-400">or click to browse</p>
                    <p className="text-sm text-gray-500 mt-4">Max size: 500MB • MP4, MOV, AVI supported</p>
                  </div>
                )}
              </label>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <button onClick={handleGoLive} className="bg-red-600 hover:bg-red-700 p-6 rounded-xl text-left transition">
                <div className="text-3xl mb-2">🔴</div>
                <h3 className="text-lg font-bold">Go Live</h3>
                <p className="text-gray-300 text-sm">Start streaming now</p>
              </button>
              <button className="bg-purple-600 hover:bg-purple-700 p-6 rounded-xl text-left transition">
                <div className="text-3xl mb-2">📹</div>
                <h3 className="text-lg font-bold">Schedule Stream</h3>
                <p className="text-gray-300 text-sm">Plan ahead</p>
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 p-6 rounded-xl text-left transition">
                <div className="text-3xl mb-2">🎬</div>
                <h3 className="text-lg font-bold">Create Short</h3>
                <p className="text-gray-300 text-sm">60 second clips</p>
              </button>
            </div>

            {/* Videos List */}
            <h2 className="text-xl font-bold mb-4">Your Videos</h2>
            {loading ? (
              <div className="text-center py-12">Loading...</div>
            ) : videos.length > 0 ? (
              <div className="space-y-4">
                {videos.map((video) => (
                  <div key={video.id} className="bg-gray-800 rounded-xl p-4 flex items-center space-x-4">
                    <img
                      src={video.thumbnail || `https://picsum.photos/seed/${video.id}/320/180`}
                      alt={video.title}
                      className="w-40 h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium">{video.title}</h3>
                      <p className="text-sm text-gray-400">
                        {video.views?.toLocaleString() || 0} views • {video.likes || 0} likes
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          video.status === 'published' ? 'bg-green-600' : 'bg-yellow-600'
                        }`}>
                          {video.status}
                        </span>
                        {video.isPremium && <span className="px-2 py-1 rounded text-xs bg-purple-600">Premium</span>}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Link href={`/studio/edit/${video.id}`} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg">
                        Edit
                      </Link>
                      <Link href={`/watch/${video.id}`} className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg">
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-800 rounded-xl">
                <div className="text-4xl mb-4">📹</div>
                <p className="text-gray-400">No videos yet. Upload your first video!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'live' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">🔴 Start Live Stream</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Stream Title</label>
                    <input
                      type="text"
                      placeholder="My Live Stream"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Category</label>
                    <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500">
                      <option>Entertainment</option>
                      <option>Gaming</option>
                      <option>Music</option>
                      <option>Crypto</option>
                      <option>Education</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                    <div>
                      <p className="font-medium">Monetization</p>
                      <p className="text-sm text-gray-400">Enable Super Chat & Subscriptions</p>
                    </div>
                    <div className="w-12 h-6 bg-purple-600 rounded-full relative cursor-pointer">
                      <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                    </div>
                  </div>
                  <button onClick={handleGoLive} className="w-full bg-red-600 hover:bg-red-700 py-3 rounded-lg font-bold">
                    🔴 Start Streaming
                  </button>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">📊 Stream Stats</h2>
                <div className="space-y-4">
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Active Viewers</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Peak Viewers</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Total Watch Time</p>
                    <p className="text-2xl font-bold">0h</p>
                  </div>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Tips Received</p>
                    <p className="text-2xl font-bold">0 NEXA</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">🎨 Stream Setup</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-2">🎨</div>
                  <p className="font-medium">Overlays</p>
                  <p className="text-sm text-gray-400">Customize your stream</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-2">💬</div>
                  <p className="font-medium">Chat Settings</p>
                  <p className="text-sm text-gray-400">Moderation tools</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg text-center">
                  <div className="text-2xl mb-2">🎵</div>
                  <p className="font-medium">Audio</p>
                  <p className="text-sm text-gray-400">Sound effects</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gray-800 p-6 rounded-xl">
                <p className="text-gray-400 text-sm">Total Views</p>
                <p className="text-3xl font-bold">{analytics?.summary?.totalViews?.toLocaleString() || channel?.totalViews?.toLocaleString() || '0'}</p>
                <p className="text-green-500 text-sm">↑ 12% this week</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl">
                <p className="text-gray-400 text-sm">Subscribers</p>
                <p className="text-3xl font-bold">{channel?.subscribers?.toLocaleString() || '0'}</p>
                <p className="text-green-500 text-sm">↑ 5% this week</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl">
                <p className="text-gray-400 text-sm">Watch Time</p>
                <p className="text-3xl font-bold">{((analytics?.summary?.totalWatchTime || 0) / 3600).toFixed(1)}h</p>
                <p className="text-green-500 text-sm">↑ 8% this week</p>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl">
                <p className="text-gray-400 text-sm">Revenue</p>
                <p className="text-3xl font-bold">{channel?.totalEarnings?.toFixed(2) || '0'} NEXA</p>
                <p className="text-green-500 text-sm">↑ 15% this week</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">📈 Views Over Time</h3>
                <div className="h-64 bg-gray-700 rounded-lg flex items-center justify-center">
                  <p className="text-gray-400">Chart visualization</p>
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-lg font-bold mb-4">🎯 Top Performing Videos</h3>
                <div className="space-y-3">
                  {analytics?.videos?.slice(0, 5).map((video, i) => (
                    <div key={video.id} className="flex items-center justify-between">
                      <span className="text-gray-400">{i + 1}.</span>
                      <span className="flex-1 truncate mx-2">{video.title}</span>
                      <span className="text-purple-400">{video.views?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-bold mb-4">🌍 Audience Demographics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Top Country</p>
                  <p className="font-bold">🇺🇸 United States</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Top Age</p>
                  <p className="font-bold">25-34 years</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Gender</p>
                  <p className="font-bold">68% Male, 32% Female</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-400 text-sm">Top Traffic</p>
                  <p className="font-bold">YouTube Search</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'nft' && (
          <div>
            <div className="mb-8">
              <button className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 rounded-lg font-bold">
                🎨 Create New NFT
              </button>
            </div>

            <h2 className="text-xl font-bold mb-4">Your NFTs</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { id: 1, title: 'Exclusive Clip #1', price: '10', views: 1500 },
                { id: 2, title: 'Behind the Scenes', price: '5', views: 890 },
                { id: 3, title: 'Fan Art Collection', price: '25', views: 2300 },
              ].map((nft) => (
                <div key={nft.id} className="bg-gray-800 rounded-xl overflow-hidden">
                  <img
                    src={`https://picsum.photos/seed/${nft.id}/400/400`}
                    alt={nft.title}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="p-4">
                    <h3 className="font-medium">{nft.title}</h3>
                    <p className="text-purple-400 font-bold">{nft.price} NEXA</p>
                    <div className="flex justify-between text-sm text-gray-400 mt-2">
                      <span>{nft.views} views</span>
                      <span>Listed</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold mb-6">Channel Settings</h2>
            <div className="space-y-6">
              <div className="bg-gray-800 p-6 rounded-xl">
                <h3 className="font-medium mb-4">Basic Info</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Display Name</label>
                    <input
                      type="text"
                      defaultValue={channel?.displayName}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Description</label>
                    <textarea
                      rows={4}
                      defaultValue={channel?.description}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 p-6 rounded-xl">
                <h3 className="font-medium mb-4">Monetization</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                    <div>
                      <p className="font-medium">Enable Ads</p>
                      <p className="text-sm text-gray-400">Show ads on your videos</p>
                    </div>
                    <div className="w-12 h-6 bg-purple-600 rounded-full relative cursor-pointer">
                      <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                    <div>
                      <p className="font-medium">Super Thanks</p>
                      <p className="text-sm text-gray-400">Allow fans to send tips</p>
                    </div>
                    <div className="w-12 h-6 bg-purple-600 rounded-full relative cursor-pointer">
                      <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                    <div>
                      <p className="font-medium">Channel Memberships</p>
                      <p className="text-sm text-gray-400">Create subscription tiers</p>
                    </div>
                    <div className="w-12 h-6 bg-gray-600 rounded-full relative cursor-pointer">
                      <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5"></div>
                    </div>
                  </div>
                </div>
              </div>

              <button className="w-full bg-purple-600 hover:bg-purple-700 py-3 rounded-lg font-bold">
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
