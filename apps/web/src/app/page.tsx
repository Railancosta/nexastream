'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { API, thumbUrl, viewerId, formatViews, formatDuration, timeAgo } from '../lib/api'
import { useI18n, translateTexts } from '../lib/i18n'

type Video = {
  id: string; title: string; description?: string; channel_name?: string
  views: number; likes: number; duration: number; is_short: number
  created_at: string; score?: number; status?: string
}

const LANG_OPTIONS = [
  ['pt', 'Português'], ['en', 'English'], ['es', 'Español'], ['fr', 'Français'],
  ['de', 'Deutsch'], ['it', 'Italiano'], ['ja', '日本語'], ['ko', '한국어'],
  ['zh', '中文'], ['ru', 'Русский'], ['ar', 'العربية'], ['hi', 'हिन्दी']
]

function ShortCard({ v, viewsLabel }: { v: Video; viewsLabel: string }) {
  return (
    <Link href={'/shorts?start=' + v.id} className="snap-start shrink-0 w-[132px] group">
      <div className="relative w-[132px] h-[234px] rounded-xl overflow-hidden bg-gray-800">
        <img src={thumbUrl(v)} alt={v.title} loading="lazy"
          className="w-full h-full object-cover group-active:scale-105 transition"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <span className="absolute top-2 left-2 text-[10px] font-bold bg-indigo-600/90 px-1.5 py-0.5 rounded">SHORT</span>
        <div className="absolute bottom-0 inset-x-0 p-2">
          <p className="text-xs font-semibold line-clamp-2 leading-tight">{v.title}</p>
          <p className="text-[10px] text-gray-300 mt-0.5">{formatViews(v.views)} {viewsLabel}</p>
        </div>
      </div>
    </Link>
  )
}

function VideoCard({ v, lang, viewsLabel }: { v: Video; lang: string; viewsLabel: string }) {
  return (
    <Link href={'/video/' + v.id} className="group block">
      <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-800">
        <img src={thumbUrl(v)} alt={v.title} loading="lazy"
          className="w-full h-full object-cover group-active:scale-[1.02] transition"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
        {v.duration > 0 && (
          <span className="absolute bottom-1.5 right-1.5 text-[11px] font-semibold bg-black/80 px-1.5 py-0.5 rounded">
            {formatDuration(v.duration)}
          </span>
        )}
      </div>
      <div className="flex gap-3 mt-2.5 px-1">
        <div className="shrink-0 w-9 h-9 rounded-full bg-indigo-900 flex items-center justify-center text-sm font-bold text-indigo-200">
          {(v.channel_name || 'N')[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-[15px] leading-snug line-clamp-2">{v.title}</h3>
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            {v.channel_name || 'NexaStream'} • {formatViews(v.views)} {viewsLabel} • {timeAgo(v.created_at, lang)}
          </p>
        </div>
      </div>
    </Link>
  )
}

function Skeletons({ short }: { short?: boolean }) {
  return (
    <div className={short ? 'flex gap-3 overflow-hidden' : 'space-y-6'}>
      {Array.from({ length: short ? 5 : 4 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className={short ? 'w-[132px] h-[234px] rounded-xl bg-gray-800' : 'aspect-video rounded-xl bg-gray-800'} />
          {!short && (
            <div className="flex gap-3 mt-2.5">
              <div className="w-9 h-9 rounded-full bg-gray-800" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-800 rounded w-11/12" />
                <div className="h-3 bg-gray-800 rounded w-2/3" />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function Home() {
  const { lang, setLang, t } = useI18n()
  const [tab, setTab] = useState('all')
  const [shorts, setShorts] = useState<Video[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [algo, setAlgo] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const TABS = [
    { key: 'all', label: t('forYou') },
    { key: 'shorts', label: t('shorts') },
    { key: 'videos', label: t('videos') },
  ]

  const load = useCallback(async (tb: string, lg: string) => {
    setLoading(true); setError(false)
    try {
      const r = await fetch(API() + '/api/feed?tab=' + tb + '&viewer=' + viewerId())
      if (!r.ok) throw new Error('http ' + r.status)
      const d = await r.json()
      const rm = await fetch(API() + '/api/mod/removed').then(x => x.json()).catch(() => ({ removed: [] }))
      const blocked = new Set(rm.removed || [])
      const ss: Video[] = (d.shorts || []).filter((v: Video) => !blocked.has(v.id))
      const vs: Video[] = (d.videos || []).filter((v: Video) => !blocked.has(v.id))
      // Tradução automática de títulos conforme idioma detectado (IP/locale)
      if (lg && lg !== 'pt') {
        const all = [...ss, ...vs]
        const tr = await translateTexts(all.map(v => v.title), lg)
        all.forEach((v, i) => { v.title = tr[i] || v.title })
      }
      setShorts(ss); setVideos(vs)
      setAlgo(d.algorithm || '')
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(tab, lang) }, [tab, lang, load])

  const empty = !loading && shorts.length === 0 && videos.length === 0

  return (
    <main className="pb-24 md:pb-8">
      {/* Chips de filtro */}
      <div className="sticky top-0 z-30 bg-gray-950/95 backdrop-blur px-3 py-2.5 flex gap-2 overflow-x-auto no-scrollbar border-b border-gray-900">
        {TABS.map((tb) => (
          <button key={tb.key} onClick={() => setTab(tb.key)}
            className={'shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition ' +
              (tab === tb.key ? 'bg-white text-gray-950' : 'bg-gray-800 text-gray-200 active:bg-gray-700')}>
            {tb.label}
          </button>
        ))}
        <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t('language')}
          className="shrink-0 self-center ml-auto bg-gray-800 text-gray-200 text-xs rounded-full px-2 py-1.5 border border-gray-700">
          {LANG_OPTIONS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
        </select>
        {algo && (
          <span className="shrink-0 self-center text-[10px] text-gray-500 hidden sm:block" title={algo}>
            ⚡ {t('smartFeed')}
          </span>
        )}
      </div>

      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="m-4 p-4 rounded-xl bg-red-950/40 border border-red-900 text-sm flex items-center justify-between gap-3">
            <span>{t('errorLoading')}</span>
            <button onClick={() => load(tab, lang)} className="px-3 py-1.5 rounded-lg bg-red-900 text-xs font-semibold shrink-0">
              {t('retry')}
            </button>
          </div>
        )}

        {loading && (
          <div className="p-3 space-y-8">
            <Skeletons short />
            <Skeletons />
          </div>
        )}

        {empty && !error && (
          <div className="flex flex-col items-center text-center py-20 px-6">
            <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center text-3xl mb-4">🎬</div>
            <h2 className="text-lg font-bold">{t('emptyTitle')}</h2>
            <p className="text-sm text-gray-400 mt-1 mb-6">{t('emptyBody')}</p>
            <Link href="/upload" className="px-6 py-3 rounded-full bg-indigo-600 font-semibold text-sm active:scale-95 transition">
              ⬆ {t('uploadFirst')}
            </Link>
          </div>
        )}

        {/* Prateleira de Shorts */}
        {!loading && shorts.length > 0 && tab !== 'videos' && (
          <section className="pt-4">
            <div className="flex items-center justify-between px-3 mb-2">
              <h2 className="flex items-center gap-2 font-bold text-base">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-indigo-400">
                  <path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" />
                </svg>
                {t('shorts')}
              </h2>
              <Link href="/shorts" className="text-xs text-indigo-400 font-medium">{t('seeAll')}</Link>
            </div>
            <div ref={scrollRef} className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory px-3 pb-2">
              {shorts.map((v) => <ShortCard key={v.id} v={v} viewsLabel={t('views')} />)}
            </div>
          </section>
        )}

        {/* Vídeos longos */}
        {!loading && videos.length > 0 && tab !== 'shorts' && (
          <section className="pt-4 px-3">
            {tab === 'all' && <h2 className="font-bold text-base mb-3">{t('recommended')}</h2>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-7">
              {videos.map((v) => <VideoCard key={v.id} v={v} lang={lang} viewsLabel={t('views')} />)}
            </div>
          </section>
        )}

        {/* Aba Shorts: grade vertical */}
        {!loading && tab === 'shorts' && shorts.length > 0 && (
          <section className="pt-4 px-3">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {shorts.map((v) => <ShortCard key={v.id} v={v} viewsLabel={t('views')} />)}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
