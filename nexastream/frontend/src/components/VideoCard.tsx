'use client'

interface VideoCardProps {
  video?: any
}

export function VideoCard({ video }: VideoCardProps) {
  if (!video) return null
  
  return (
    <div className="video-card group cursor-pointer">
      <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-slate-800">
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600">▶</div>
        )}
      </div>
      <div className="flex gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-accent" />
        <div>
          <h3 className="text-white font-medium line-clamp-2">{video.title}</h3>
          <p className="text-slate-400 text-sm">{video.channel_name}</p>
        </div>
      </div>
    </div>
  )
}
