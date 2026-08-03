'use client'

import { PlaySquare } from 'lucide-react'

interface Video {
  id: string
  title: string
  thumbnailUrl: string
  duration: number
  views: number
  rewardAmount: number
  channel: {
    name: string
    verified: boolean
  }
}

interface VideoCardProps {
  video: Video
}

export function VideoCard({ video }: VideoCardProps) {
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
    <div className="video-card group cursor-pointer">
      <div className="relative aspect-video rounded-xl overflow-hidden mb-3">
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
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
  )
}
