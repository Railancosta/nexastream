'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
const API = 'http://localhost:3002'
const T: Record<string, Record<string, string>> = {
  pt: { feed: 'Feed', views: 'visualizações', empty: 'Nenhum vídeo ainda. Envie o primeiro!' },
  es: { feed: 'Inicio', views: 'vistas', empty: 'Aún no hay vídeos.' },
  en: { feed: 'Feed', views: 'views', empty: 'No videos yet. Upload the first!' },
  fr: { feed: 'Accueil', views: 'vues', empty: 'Pas encore de vidéos.' },
  ja: { feed: 'フィード', views: '回再生', empty: 'まだ動画がありません。' }
}
export default function Home() {
  const [videos, setVideos] = useState<any[]>([])
  const lang = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : 'en'
  const t = (k: string) => ((T[lang] || T.en)[k] || T.en[k])
  useEffect(() => { fetch(API + '/api/videos').then(r => r.json()).then(d => setVideos(d.videos || [])).catch(() => {}) }, [])
  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('feed')} <span className="text-xs text-gray-500">[{lang}]</span></h1>
      {videos.length === 0 && <p className="text-gray-400">{t('empty')}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map(v => (
          <Link key={v.id} href={'/video/' + v.id} className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
            <div className="aspect-video bg-gray-800">
              {v.thumbnail_path && <img src={API + v.thumbnail_path} alt={v.title} className="w-full h-full object-cover" />}
            </div>
            <div className="p-3">
              <h3 className="font-semibold line-clamp-2">{v.title}</h3>
              <p className="text-xs text-gray-400 mt-1">{v.views} {t('views')} • {v.channel_name}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
