'use client'
import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { API, thumbUrl, formatViews, formatDuration, timeAgo } from '../../lib/api'
import { useI18n } from '../../lib/i18n'

type Cat = { name: string; count: number; label: string; icon: string }

const TRENDING = ['Bitcoin', 'Next.js', 'DeFi', 'Rust', 'iPhone', 'NFT', 'blockchain', 'crypto']

function SearchInner() {
  const { lang } = useI18n()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [cats, setCats] = useState<Cat[]>([])
  const [cat, setCat] = useState('')
  const [type, setType] = useState('')
  const [sort, setSort] = useState('recent')
  const timer = useRef<any>(null)

  useEffect(() => {
    fetch(API() + '/api/categories').then((r) => r.json()).then((d) => {
      if (d.categories?.length) setCats(d.categories)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const query = q.trim()
    clearTimeout(timer.current)
    if (!query && !cat && !type) { setResults([]); setSearched(false); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (query) params.set('q', query)
        if (cat) params.set('category', cat)
        if (type) params.set('type', type)
        params.set('sort', sort)
        const r = await fetch(API() + '/api/search?' + params.toString())
        const d = await r.json()
        setResults(d.videos || [])
      } catch { setResults([]) }
      setLoading(false); setSearched(true)
    }, 350)
    return () => clearTimeout(timer.current)
  }, [q, cat, type, sort])

  const isPt = lang === 'pt'

  return (
    <main className="max-w-5xl mx-auto p-4 pb-24 md:pb-8">
      <div className="sticky top-14 z-20 bg-gray-950 py-2">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={isPt ? 'Buscar vídeos e Shorts...' : 'Search videos and Shorts...'}
          className="w-full p-3.5 rounded-full bg-gray-900 border border-gray-700 focus:border-indigo-500 outline-none"
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mt-3 items-center">
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria"
          className="bg-gray-900 border border-gray-700 text-sm rounded-full px-3 py-1.5 text-gray-200">
          <option value="">{isPt ? 'Todas as categorias' : 'All categories'}</option>
          {cats.map((c) => <option key={c.name} value={c.name}>{c.icon} {c.label}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipo"
          className="bg-gray-900 border border-gray-700 text-sm rounded-full px-3 py-1.5 text-gray-200">
          <option value="">{isPt ? 'Todos os tipos' : 'All types'}</option>
          <option value="video">{isPt ? 'Vídeos' : 'Videos'}</option>
          <option value="short">Shorts</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar"
          className="bg-gray-900 border border-gray-700 text-sm rounded-full px-3 py-1.5 text-gray-200">
          <option value="recent">{isPt ? 'Mais recentes' : 'Most recent'}</option>
          <option value="popular">{isPt ? 'Mais populares' : 'Most popular'}</option>
        </select>
      </div>

      {/* Trending chips when idle */}
      {!searched && !loading && (
        <div className="mt-5">
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wide">{isPt ? 'Em alta' : 'Trending'}</p>
          <div className="flex gap-2 flex-wrap">
            {TRENDING.map((term) => (
              <button key={term} onClick={() => setQ(term)}
                className="px-3.5 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 text-sm text-gray-200 transition">
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-gray-500 mt-6 text-center">{isPt ? 'Buscando...' : 'Searching...'}</p>}
      {searched && !loading && results.length === 0 && (
        <p className="text-sm text-gray-500 mt-6 text-center">
          {isPt ? `Nenhum resultado para "${q}".` : `No results for "${q}".`}
        </p>
      )}
      <div className="mt-4 space-y-4">
        {results.map((v) => (
          <Link key={v.id} href={v.is_short ? '/shorts?start=' + v.id : '/video?id=' + v.id} className="flex gap-3 active:bg-gray-900 rounded-xl p-1">
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
              <p className="text-xs text-gray-400 mt-1">
                {v.channel_name || v.creator_name || 'NexaStream'} • {formatViews(v.views)} views • {timeAgo(v.created_at, lang)}
              </p>
              {v.category && (
                <span className="inline-block mt-1.5 text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{v.category}</span>
              )}
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
