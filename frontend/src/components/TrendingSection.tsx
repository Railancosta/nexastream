'use client'

import { TrendingUp, Flame, DollarSign } from 'lucide-react'

export function TrendingSection() {
  const trendingTopics = [
    { name: 'Bitcoin', posts: '12.5K', growth: '+15%' },
    { name: 'DeFi', posts: '8.2K', growth: '+23%' },
    { name: 'NFT Drop', posts: '6.8K', growth: '+45%' },
    { name: 'Web3', posts: '5.1K', growth: '+12%' },
    { name: 'Crypto News', posts: '4.3K', growth: '+8%' },
  ]

  const topCreators = [
    { name: 'Crypto Academy', subscribers: '1.2M', earnings: '125,000', avatar: 'CA' },
    { name: 'DeFi Masters', subscribers: '890K', earnings: '98,500', avatar: 'DM' },
    { name: 'NFT World', subscribers: '650K', earnings: '72,000', avatar: 'NW' },
    { name: 'Web3 Education', subscribers: '520K', earnings: '58,200', avatar: 'WE' },
  ]

  return (
    <section className="px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trending Topics */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Trending Now</h3>
              <p className="text-sm text-slate-400">Hot topics on NexaStream</p>
            </div>
          </div>

          <div className="space-y-3">
            {trendingTopics.map((topic, index) => (
              <div
                key={topic.name}
                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-slate-600">#{index + 1}</span>
                  <span className="font-medium text-white">{topic.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-400">{topic.posts} posts</div>
                  <div className="text-xs text-green-400 font-medium">{topic.growth}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Earners */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Top Earners</h3>
              <p className="text-sm text-slate-400">This month&apos;s best creators</p>
            </div>
          </div>

          <div className="space-y-3">
            {topCreators.map((creator, index) => (
              <div
                key={creator.name}
                className="flex items-center justify-between p-3 bg-slate-700/50 rounded-xl hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{creator.avatar}</span>
                    </div>
                    {index < 3 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                        {index + 1}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-white">{creator.name}</div>
                    <div className="text-xs text-slate-400">{creator.subscribers} subs</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-green-400">{creator.earnings}</div>
                  <div className="text-xs text-slate-400">$NEXA</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Stats */}
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Platform Stats</h3>
              <p className="text-sm text-slate-400">Live statistics</p>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Active Users', value: '2.5M+', percent: 75 },
              { label: 'Videos Uploaded', value: '15.8M', percent: 66 },
              { label: 'Rewards Distributed', value: '$4.2M', percent: 100 },
              { label: 'Active Creators', value: '12.5K', percent: 50 },
            ].map(stat => (
              <div key={stat.label} className="p-4 bg-slate-800/50 rounded-xl">
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-400">{stat.label}</div>
                <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                    style={{ width: `${stat.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
