'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Video } from '@/types';
import { formatNumber, formatDuration, formatRelativeTime } from '@/lib/utils';
import { Play, Eye, ThumbsUp, Clock, TrendingUp, Sparkles } from 'lucide-react';

interface VideoCardProps {
  video: Video;
  showChannel?: boolean;
  variant?: 'default' | 'compact' | 'horizontal';
}

export function VideoCard({ video, showChannel = false, variant = 'default' }: VideoCardProps) {
  const engagementRate = video.views > 0 
    ? ((video.likes + video.comments) / video.views * 100).toFixed(1) 
    : '0';

  if (variant === 'horizontal') {
    return (
      <Link href={`/watch/${video.id}`} className="flex gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group">
        <div className="relative w-40 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-dark-100">
          <Image
            src={video.thumbnail || '/placeholder-thumbnail.jpg'}
            alt={video.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 rounded text-xs text-white font-medium">
            {formatDuration(video.duration)}
          </div>
          {video.isShort && (
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-accent/90 rounded text-xs text-white font-bold">
              Short
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium line-clamp-2 mb-1 group-hover:text-primary transition-colors">
            {video.title}
          </h3>
          <p className="text-gray-400 text-sm">{formatNumber(video.views)} views</p>
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Clock className="w-3 h-3" />
            <span>{formatRelativeTime(video.createdAt)}</span>
          </div>
        </div>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link href={`/watch/${video.id}`} className="block group">
        <div className="relative aspect-video rounded-lg overflow-hidden bg-dark-100 mb-2">
          <Image
            src={video.thumbnail || '/placeholder-thumbnail.jpg'}
            alt={video.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 rounded text-xs text-white font-medium">
            {formatDuration(video.duration)}
          </div>
          {video.isBoosted && (
            <div className="absolute top-2 right-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
            </div>
          )}
        </div>
        <h3 className="text-white text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
          {video.title}
        </h3>
      </Link>
    );
  }

  return (
    <Link href={`/watch/${video.id}`} className="block group">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-dark-100 mb-3">
        <Image
          src={video.thumbnail || '/placeholder-thumbnail.jpg'}
          alt={video.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
          <div className="w-14 h-14 bg-primary/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform scale-90 group-hover:scale-100">
            <Play className="w-6 h-6 text-white ml-1" />
          </div>
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs text-white font-medium">
          {formatDuration(video.duration)}
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-2">
          {video.isBoosted && (
            <div className="px-2 py-1 bg-yellow-500/90 rounded text-xs text-black font-bold flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Boosted
            </div>
          )}
          {video.isShort && (
            <div className="px-2 py-1 bg-accent/90 rounded text-xs text-white font-bold">
              Short
            </div>
          )}
        </div>
      </div>

      {/* Video info */}
      <div className="flex gap-3">
        {showChannel && (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent flex-shrink-0 flex items-center justify-center text-white font-bold text-sm">
            {video.channelId.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium line-clamp-2 mb-1 group-hover:text-primary transition-colors">
            {video.title}
          </h3>
          
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <Eye className="w-4 h-4" />
            <span>{formatNumber(video.views)}</span>
            <span>•</span>
            <ThumbsUp className="w-4 h-4" />
            <span>{formatNumber(video.likes)}</span>
          </div>
          
          <p className="text-gray-500 text-sm mt-1">
            ${video.earnings.toFixed(2)} USDC
          </p>
        </div>
      </div>
    </Link>
  );
}
