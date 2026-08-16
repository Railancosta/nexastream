"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';

export default function Settings() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('account');

  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    bio: '',
    avatar: '',
    language: 'en',
    timezone: 'UTC',
  });

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    newSubscribers: true,
    newComments: true,
    likes: false,
    tips: true,
    liveAlerts: true,
  });

  const [privacy, setPrivacy] = useState({
    profilePublic: true,
    showSubscribers: true,
    showEarnings: false,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const res = await api.getProfile().catch(() => ({
        user: { displayName: 'Demo User', email: 'demo@example.com', bio: '' },
        channels: []
      }));
      setUser(res.user);
      setFormData({
        displayName: res.user?.displayName || '',
        email: res.user?.email || '',
        bio: res.user?.bio || '',
        avatar: res.user?.avatar || '',
        language: res.user?.language || 'en',
        timezone: res.user?.timezone || 'UTC',
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      await api.updateProfile(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
            NexaStream
          </Link>
          <Link href="/dashboard" className="text-gray-400 hover:text-white">
            ← Back
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Settings</h1>

        <div className="flex flex-wrap -mx-4">
          {/* Sidebar */}
          <aside className="w-64 px-4">
            <div className="bg-gray-800 rounded-xl p-4 sticky top-24">
              {[
                { id: 'account', label: 'Account', icon: '👤' },
                { id: 'channel', label: 'Channel', icon: '📺' },
                { id: 'privacy', label: 'Privacy', icon: '🔒' },
                { id: 'notifications', label: 'Notifications', icon: '🔔' },
                { id: 'wallet', label: 'Wallet', icon: '💰' },
                { id: 'security', label: 'Security', icon: '🛡️' },
                { id: 'billing', label: 'Billing', icon: '💳' },
                { id: 'appearance', label: 'Appearance', icon: '🎨' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition ${
                    activeSection === item.id
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 px-4 min-w-0">
            {saved && (
              <div className="bg-green-600 text-white px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
                <span>✓ Changes saved successfully!</span>
                <button onClick={() => setSaved(false)}>✕</button>
              </div>
            )}

            {activeSection === 'account' && (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-xl p-6">
                  <h2 className="text-xl font-bold mb-6">Account Settings</h2>
                  
                  <div className="flex items-center space-x-6 mb-6">
                    <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center text-2xl font-bold">
                      {formData.displayName?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <button className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg">
                        Change Avatar
                      </button>
                      <p className="text-sm text-gray-400 mt-2">JPG, PNG or GIF. Max 2MB.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Display Name</label>
                      <input
                        type="text"
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm text-gray-400 mb-2">Bio</label>
                    <textarea
                      rows={4}
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Language</label>
                      <select
                        value={formData.language}
                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                      >
                        <option value="en">English</option>
                        <option value="pt">Português</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Timezone</label>
                      <select
                        value={formData.timezone}
                        onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/Sao_Paulo">São Paulo (BRT)</option>
                        <option value="America/New_York">New York (EST)</option>
                        <option value="Europe/London">London (GMT)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleSave}
                    className="mt-6 bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-lg font-bold"
                  >
                    Save Changes
                  </button>
                </div>

                <div className="bg-gray-800 rounded-xl p-6">
                  <h3 className="font-bold mb-4 text-red-400">Danger Zone</h3>
                  <p className="text-gray-400 mb-4">Once you delete your account, there is no going back.</p>
                  <button className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg">
                    Delete Account
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-6">Notification Preferences</h2>
                
                <div className="space-y-4">
                  {[
                    { key: 'email', label: 'Email Notifications', desc: 'Receive updates via email' },
                    { key: 'push', label: 'Push Notifications', desc: 'Browser push notifications' },
                    { key: 'newSubscribers', label: 'New Subscribers', desc: 'When someone subscribes to your channel' },
                    { key: 'newComments', label: 'New Comments', desc: 'When someone comments on your videos' },
                    { key: 'likes', label: 'Video Likes', desc: 'When someone likes your video' },
                    { key: 'tips', label: 'Tips & Donations', desc: 'When you receive a tip' },
                    { key: 'liveAlerts', label: 'Live Stream Alerts', desc: 'Going live notifications' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-gray-400">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key] })}
                        className={`w-14 h-7 rounded-full relative transition ${
                          notifications[item.key] ? 'bg-purple-600' : 'bg-gray-600'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition ${
                          notifications[item.key] ? 'right-1' : 'left-1'
                        }`}></div>
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setSaved(true)}
                  className="mt-6 bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-lg font-bold"
                >
                  Save Preferences
                </button>
              </div>
            )}

            {activeSection === 'privacy' && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-6">Privacy Settings</h2>
                
                <div className="space-y-4">
                  {[
                    { key: 'profilePublic', label: 'Public Profile', desc: 'Anyone can see your profile' },
                    { key: 'showSubscribers', label: 'Show Subscribers', desc: 'Display subscriber count on channel' },
                    { key: 'showEarnings', label: 'Show Earnings', desc: 'Let others see your revenue' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm text-gray-400">{item.desc}</p>
                      </div>
                      <button
                        onClick={() => setPrivacy({ ...privacy, [item.key]: !privacy[item.key] })}
                        className={`w-14 h-7 rounded-full relative transition ${
                          privacy[item.key] ? 'bg-purple-600' : 'bg-gray-600'
                        }`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition ${
                          privacy[item.key] ? 'right-1' : 'left-1'
                        }`}></div>
                      </button>
                    </div>
                  ))}
                </div>

                <button className="mt-6 bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-lg font-bold">
                  Save Privacy Settings
                </button>
              </div>
            )}

            {activeSection === 'security' && (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-xl p-6">
                  <h2 className="text-xl font-bold mb-6">Change Password</h2>
                  <div className="space-y-4 max-w-md">
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Current Password</label>
                      <input
                        type="password"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">New Password</label>
                      <input
                        type="password"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">Confirm New Password</label>
                      <input
                        type="password"
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <button className="bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-lg font-bold">
                      Update Password
                    </button>
                  </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-6">
                  <h2 className="text-xl font-bold mb-6">Two-Factor Authentication</h2>
                  <p className="text-gray-400 mb-4">Add an extra layer of security to your account.</p>
                  <button className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-bold">
                    Enable 2FA
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'wallet' && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-6">Wallet Settings</h2>
                <div className="space-y-4">
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Wallet Address</p>
                    <code className="text-sm break-all">{user?.walletAddress || '0x...'}</code>
                  </div>
                  <button className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-bold">
                    Export Private Key
                  </button>
                </div>
              </div>
            )}

            {activeSection === 'appearance' && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-6">Appearance</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Theme</label>
                    <div className="grid grid-cols-3 gap-4">
                      {['Dark', 'Light', 'System'].map((theme) => (
                        <button
                          key={theme}
                          className={`p-4 rounded-lg border-2 transition ${
                            theme === 'Dark' ? 'border-purple-500 bg-purple-600' : 'border-gray-600 bg-gray-700 hover:border-purple-400'
                          }`}
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-gray-700 p-4 rounded-lg">
                    <div>
                      <p className="font-medium">Compact Mode</p>
                      <p className="text-sm text-gray-400">Show more content on screen</p>
                    </div>
                    <button className="w-14 h-7 bg-gray-600 rounded-full relative">
                      <div className="w-5 h-5 bg-white rounded-full absolute left-1 top-1"></div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {['channel', 'billing'].includes(activeSection) && (
              <div className="bg-gray-800 rounded-xl p-6 text-center py-16">
                <div className="text-6xl mb-4">🚧</div>
                <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
                <p className="text-gray-400">This section is under development.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
