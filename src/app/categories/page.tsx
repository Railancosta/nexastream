'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { API, thumbUrl, formatViews, formatDuration, timeAgo } from '../../lib/api'
import { useI18n } from '../../lib/i18n'

type Cat = { name: string; count: number; label: string; icon: string }
type Video = {
  id: string; title: string; channel_name?: string; creator_name?: string
  views: number; likes: number; duration: number; is_short: number; category?: string; created_at: string
}

const FALLBACK_CATS: Cat[] = [
  { name: 'tech', count: 0, label: 'Tecnologia', icon: '💻' },
  { name: 'crypto', count: 0, label: 'Crypto', icon: '🪙' },
  { name: 'finance', count: 0, label: 'Finanças', icon: '📈' },
  { name: 'code', count: 0, label: 'Programação', icon: '👨‍💻' },
  { name: 'gaming', count: 0, label: 'Games', icon: '🎮' },
  { name: 'web3', count: 0, label: 'Web3', icon: '🔗' },
]

const DEMO_VIDEOS: Video[] = [
  { id: 'v1', title: 'Bitcoin ETF: O que muda em 2026', channel_name: 'CryptoCreator', views: 45230, likes: 3200, duration: 720, is_short: 0, category: 'crypto', created_at: '2026-08-20' },
  { id: 'v2', title: 'iPhone 18 Pro Review', channel_name: 'TechReviewer', views: 32100, likes: 2100, duration: 540, is_short: 0, category: 'tech', created_at: '2026-08-19' },
  { id: 'v3', title: 'Next.js 16 + Cloudflare Workers', channel_name: 'CodeMaster', views: 28500, likes: 4500, duration: 1200, is_short: 0, category: 'code', created_at: '2026-08-18' },
  { id: 'v4', title: 'Earn 20% APY com DeFi', channel_name: 'DeFiEducator', views: 19800, likes: 1800, duration: 480, is_short: 0, category: 'finance', created_at: '2026-08-17' },
  { id: 'v5', title: 'WebTorrent P2P para Iniciantes', channel_name: 'P2PBuilder', views: 15600, likes: 2400, duration: 360, is_short: 0, category: 'tech', created_at: '2026-08-16' },
  { id: 'v6', title: 'Solana vs Ethereum 2026', channel_name: 'CryptoCreator', views: 52000, likes: 4100, duration: 600, is_short: 0, category: 'crypto', created_at: '2026-08-15' },
  { id: 'v7', title: 'Rust para Backend', channel_name: 'CodeMaster', views: 21000, likes: 3600, duration: 900, is_short: 0, category: 'code', created_at: '2026-08-14' },
  { id: 'v8', title: 'MacBook Pro M5 Unboxing', channel_name: 'TechReviewer', views: 67000, likes: 5200, duration: 300, is_short: 1, category: 'tech', created_at: '2026-08-13' },
  { id: 'v9', title: 'Tokenização de Ativos Reais', channel_name: 'DeFiEducator', views: 13400, likes: 1100, duration: 420, is_short: 0, category: 'finance', created_at: '2026-08-12' },
  { id: 'v10', title: 'NexaStream: Como Funciona', channel_name: 'P2PBuilder', views: 8900, likes: 1500, duration: 240, is_short: 1, category: 'tech', created_at: '2026-08-11' },
]

export default function CategoriesPage() {
  const { lang, t } = useI18n()
  const [cats, setCats] = useState<Cat[]>(FALLBACK_CATS)
  const [all, setAll] = useState<Video[]>([])
  const [selected, setSelected] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [c, v] = await Promise.all([
        fetch(API() + '/api/categories').then((r) => r.json()),
        fetch(API() + '/api/videos?limit=50').then((r) => r.json()),
      ])
      if ((c.categories || []).length) setCats(c.categories)
      setAll(v.videos || [])
    } catch {
      setCats(FALLBACK_CATS)
      setAll(DEMO_VIDEOS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const visible = selected ? all.filter((v) => (v.category || 'tech') === selected) : all
  const activeCat = cats.find((c) => c.name === selected)

  return (
    <main className="max-w-7xl mx-auto px-3 pb-24 md:pb-10 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-indigo-400">
            <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
          {lang === 'pt' ? 'Categorias' : lang === 'es' ? 'Categorías' : 'Categories'}
        </h1>
      </div>

      {/* Category rail */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-5">
        <button
          onClick={() => setSelected('')}
          className={'shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ' +
            (!selected ? 'bg-white text-gray-950' : 'bg-gray-800 text-gray-200 hover:bg-gray-700')}
        >
          {lang === 'pt' ? 'Todos' : lang === 'es' ? 'Todos' : 'All'}
        </button>
        {cats.map((c) => (
          <button
            key={c.name}
            onClick={() => setSelected(selected === c.name ? '' : c.name)}
            className={'shrink-0 px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-1.5 ' +
              (selected === c.name ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700')}
          >
            <span>{c.icon}</span>{c.label}
            {c.count > 0 && <span className="text-[10px] opacity-70">{c.count}</span>}
          </button>
        ))}
      </div>

      {activeCat && (
        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-indigo-950/60 to-gray-900 border border-indigo-900/50 text-sm text-gray-300">
          {activeCat.icon} <b>{activeCat.label}</b> — {activeCat.count} {t('videos')}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-7">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video rounded-xl bg-gray-800" />
              <div className="h-3 bg-gray-800 rounded w-11/12 mt-2.5" />
              <div className="h-3 bg-gray-800 rounded w-2/3 mt-2" />
            </div>
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-gray-500 text-sm">
          {lang === 'pt' ? 'Nenhum vídeo nesta categoria ainda.' : 'No videos in this category yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-7">
          {visible.map((v) => {
            const ch = v.channel_name || v.creator_name || 'NexaStream'
            const href = v.is_short ? '/shorts?start=' + v.id : '/video?id=' + v.id
            return (
              <Link key={v.id} href={href} className="group block">
                <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-800">
                  <img src={thumbUrl(v)} alt={v.title} loading="lazy"
                    className="w-full h-full object-cover group-active:scale-[1.02] transition"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  {v.is_short === 1 ? (
                    <span className="absolute top-2 left-2 text-[10px] font-bold bg-indigo-600/90 px-1.5 py-0.5 rounded">SHORT</span>
                  ) : v.duration > 0 && (
                    <span className="absolute bottom-1.5 right-1.5 text-[11px] font-semibold bg-black/80 px-1.5 py-0.5 rounded">{formatDuration(v.duration)}</span>
                  )}
                </div>
                <div className="flex gap-3 mt-2.5 px-1">
                  <div className="shrink-0 w-9 h-9 rounded-full bg-indigo-900 flex items-center justify-center text-sm font-bold text-indigo-200">
                    {ch[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[15px] leading-snug line-clamp-2">{v.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {ch} • {formatViews(v.views)} {t('views')} • {timeAgo(v.created_at, lang)}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
