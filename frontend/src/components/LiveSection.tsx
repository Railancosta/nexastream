'use client'

import { Radio, Users } from 'lucide-react'

export function LiveSection() {
  const liveStreams = [
    {
      id: '1',
      title: 'Live: Q&A about Bitcoin halving 2024',
      channel: 'Crypto Academy',
      viewers: 12453,
      thumbnail: 'https://picsum.photos/seed/live1/640/360',
    },
    {
      id: '2',
      title: 'Building on Solana: Smart Contracts',
      channel: 'DeFi Masters',
      viewers: 8721,
      thumbnail: 'https://picsum.photos/seed/live2/640/360',
    },
    {
      id: '3',
      title: 'NFT Minting Live Event',
      channel: 'NFT World',
      viewers: 5432,
      thumbnail: 'https://picsum.photos/seed/live3/640/360',
    },
  ]

  return (
    <section className="px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-500 font-bold text-lg">LIVE</span>
          </div>
          <span className="text-slate-400">Watch live streams</span>
        </div>
        <button className="text-primary hover:text-primary-600 text-sm font-medium">
          See all live streams →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {liveStreams.map((stream) => (
          <div
            key={stream.id}
            className="relative group cursor-pointer"
          >
            <div className="relative aspect-video rounded-xl overflow-hidden">
              <img
                src={stream.thumbnail}
                alt={stream.title}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />

              {/* Live badge */}
              <div className="absolute top-3 left-3 px-2 py-1 bg-red-600 rounded text-xs font-bold text-white flex items-center gap-1">
                <Radio className="w-3 h-3" />
                LIVE
              </div>

              {/* Viewer count */}
              <div className="absolute bottom-3 left-3 px-2 py-1 bg-black/70 rounded text-xs font-medium text-white flex items-center gap-1">
                <Users className="w-3 h-3" />
                {stream.viewers.toLocaleString()}
              </div>

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Channel info */}
              <div className="absolute bottom-3 right-3 left-20">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <span className="text-white font-bold text-xs">
                      {stream.channel.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {stream.channel}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <h3 className="mt-3 text-white font-medium line-clamp-2 group-hover:text-primary transition-colors">
              {stream.title}
            </h3>
          </div>
        ))}
      </div>
    </section>
  )
}
