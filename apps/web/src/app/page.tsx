'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
export default function Home() {
  const [videos, setVideos] = useState<any[]>([])
  const [mode, setMode] = useState('cronológico')
  useEffect(() => {
    const chrono = () => fetch('http://localhost:3002/api/videos').then(r => r.json()).then(d => { setVideos(d.videos || []); setMode('cronológico') }).catch(() => {})
    const u = JSON.parse(localStorage.getItem('nst_user') || 'null')
    if (u) {
      fetch('http://localhost:3012/api/reco/feed?user=' + u.username)
        .then(r => r.json())
        .then(d => { setVideos(d.feed || []); setMode('personalizado • ' + d.signals.subscriptions + ' inscrições') })
        .catch(chrono)
    } else chrono()
  }, [])
  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Feed</h1>
        <span className="text-xs bg-gray-800 px-2 py-1 rounded">ranking: {mode}</span>
      </div>
      {videos.length === 0 && <p className="text-gray-500">Nenhum vídeo ainda.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map((v: any) => (
          <Link key={v.id} href={'/video/' + v.id} className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
            <div className="aspect-video bg-gray-800">
              <img src={'http://localhost:3002/storage/thumbs/' + v.id + '.jpg'} alt={v.title} className="w-full h-full object-cover" />
            </div>
            <div className="p-3">
              <h3 className="font-semibold line-clamp-2">{v.title}</h3>
              <p className="text-xs text-gray-400 mt-1">{v.channel} • {v.views || 0} views {v.score !== undefined ? '• score ' + v.score : ''}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
