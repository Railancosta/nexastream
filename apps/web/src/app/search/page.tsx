'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { API, thumbUrl, formatViews, formatDuration, timeAgo } from '../../lib/api'

function SearchInner() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const timer = useRef<any>(null)

  useEffect(() => {
    if (!q.trim()) { setResults([]); setSearched(false); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await fetch(API() + '/api/search?q=' + encodeURIComponent(q.trim()))
        const d = await r.json()
        setResults(d.videos || [])
      } catch { setResults([]) }
      setLoading(false); setSearched(true)
    }, 350)
    return () => clearTimeout(timer.current)
  }, [q])

  return (
    <main className="max-w-3xl mx-auto p-4 pb-24 md:pb-8">
      <div className="sticky top-14 z-20 bg-gray-950 py-2">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar vídeos e Shorts..."
          className="w-full p-3.5 rounded-full bg-gray-900 border border-gray-700 focus:border-indigo-500 outline-none"
        />
      </div>
      {loading && <p className="text-sm text-gray-500 mt-6 text-center">Buscando...</p>}
      {searched && !loading && results.length === 0 && (
        <p className="text-sm text-gray-500 mt-6 text-center">Nenhum resultado para “{q}”.</p>
      )}
      <div className="mt-4 space-y-4">
        {results.map((v) => (
          <Link key={v.id} href={v.is_short ? '/shorts?start=' + v.id : '/video/' + v.id} className="flex gap-3 active:bg-gray-900 rounded-xl p-1">
            <div className={'relative shrink-0 rounded-lg overflow-hidden bg-gray-800 ' + (v.is_short ? 'w-20 h-36' : 'w-40 aspect-video')}>
              <img src={thumbUrl(v)} alt={v.title} loading="lazy" className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
              {v.is_short ? (
                <span className="absolute top-1 left-1 text-[9px] font-bold bg-indigo-600/90 px-1 py-0.5 rounded">SHORT</span>
              ) : v.duration > 0 && (
                <span className="absolute bottom-1 right-1 text-[10px] font-semibold bg-black/80 px-1 py-0.5 rounded">{formatDuration(v.duration)}</span>
              )}
            </div>
            <div className="min-w-0 py-1">
              <h3 className="font-semibold text-sm line-clamp-2">{v.title}</h3>
              <p className="text-xs text-gray-400 mt-1">{formatViews(v.views)} views • {timeAgo(v.created_at)}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}

export default function SearchPage() {
  return <Suspense fallback={null}><SearchInner /></Suspense>
}
