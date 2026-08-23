'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { thumbUrl, formatViews, formatDuration, timeAgo } from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import { getListItems, removeFromList, syncListFromApi, type ListKind, type StoredVideo } from '../../lib/userLists'

const TABS: { key: ListKind; icon: string; labelPt: string; labelEn: string }[] = [
  { key: 'watchlist', icon: '🔖', labelPt: 'Assistir depois', labelEn: 'Watch later' },
  { key: 'favorites', icon: '❤️', labelPt: 'Favoritos', labelEn: 'Favorites' },
]

export default function WatchlistPage() {
  const { lang, t } = useI18n()
  const [tab, setTab] = useState<ListKind>('watchlist')
  const [items, setItems] = useState<StoredVideo[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async (kind: ListKind) => {
    setLoading(true)
    const merged = await syncListFromApi(kind)
    setItems(merged)
    setLoading(false)
  }, [])

  useEffect(() => { refresh(tab) }, [tab, refresh])

  function remove(id: string) {
    removeFromList(tab, id)
    setItems(getListItems(tab))
  }

  const isPt = lang === 'pt'
  const emptyMsg = isPt
    ? (tab === 'watchlist' ? 'Nenhum vídeo salvo para assistir depois.' : 'Nenhum vídeo favoritado ainda.')
    : (tab === 'watchlist' ? 'No videos saved to watch later.' : 'No favorited videos yet.')

  return (
    <main className="max-w-5xl mx-auto px-3 pb-24 md:pb-10 pt-4">
      <h1 className="text-xl md:text-2xl font-bold mb-4 flex items-center gap-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-indigo-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 3H7a2 2 0 0 0-2 2v16l7-4 7 4V5a2 2 0 0 0-2-2Z" />
        </svg>
        {isPt ? 'Minha Biblioteca' : 'My Library'}
      </h1>

      <div className="flex gap-2 mb-5">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={'px-4 py-2 rounded-full text-sm font-medium transition flex items-center gap-1.5 ' +
              (tab === tb.key ? 'bg-white text-gray-950' : 'bg-gray-800 text-gray-200 hover:bg-gray-700')}
          >
            <span>{tb.icon}</span>{isPt ? tb.labelPt : tb.labelEn}
            {items.length > 0 && tab === tb.key && (
              <span className="text-[10px] bg-indigo-600 text-white rounded-full px-1.5 py-0.5">{items.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse flex gap-3 bg-gray-900/50 rounded-xl p-3">
              <div className="w-28 aspect-video rounded-lg bg-gray-800" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 bg-gray-800 rounded w-3/4" />
                <div className="h-3 bg-gray-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">{tab === 'watchlist' ? '🔖' : '❤️'}</div>
          <p className="text-gray-400 text-sm mb-4">{emptyMsg}</p>
          <div className="flex gap-3 justify-center">
            <Link href="/categories" className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm">
              {isPt ? 'Explorar Categorias' : 'Browse Categories'}
            </Link>
            <Link href="/search" className="px-5 py-2.5 rounded-full bg-gray-800 hover:bg-gray-700 font-semibold text-sm border border-gray-700">
              {isPt ? 'Buscar Vídeos' : 'Search Videos'}
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((v) => {
            const ch = v.channel_name || v.creator_name || 'NexaStream'
            const href = v.is_short === 1 ? '/shorts?start=' + v.id : '/video?id=' + v.id
            return (
              <div key={v.id} className="flex gap-3 bg-gray-900/50 hover:bg-gray-900 rounded-xl p-3 border border-gray-800/60 transition group">
                <Link href={href} className="relative shrink-0 w-32 md:w-40 aspect-video rounded-lg overflow-hidden bg-gray-800">
                  <img src={thumbUrl(v)} alt={v.title} loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  {v.is_short === 1 ? (
                    <span className="absolute top-1 left-1 text-[9px] font-bold bg-indigo-600/90 px-1 py-0.5 rounded">SHORT</span>
                  ) : (v.duration || 0) > 0 && (
                    <span className="absolute bottom-1 right-1 text-[10px] font-semibold bg-black/80 px-1 py-0.5 rounded">{formatDuration(v.duration || 0)}</span>
                  )}
                </Link>
                <div className="flex-1 min-w-0 py-1">
                  <Link href={href}>
                    <h3 className="font-semibold text-sm md:text-[15px] leading-snug line-clamp-2 group-hover:text-indigo-300 transition">{v.title}</h3>
                  </Link>
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {ch} • {formatViews(v.views || 0)} {t('views')} {v.created_at ? '• ' + timeAgo(v.created_at, lang) : ''}
                  </p>
                  <button
                    onClick={() => remove(v.id)}
                    className="mt-2 px-3 py-1 rounded-full bg-gray-800 hover:bg-red-950 hover:text-red-300 text-xs text-gray-300 transition"
                  >
                    {isPt ? 'Remover' : 'Remove'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
