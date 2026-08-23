'use client'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { apiBase, thumbUrl, videoUrl, formatViews, formatDuration, timeAgo } from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import { VideoPlayer } from '../../components/VideoPlayer'
import { isInList, toggleList, type StoredVideo } from '../../lib/userLists'

const API = typeof window !== 'undefined' ? apiBase() : ''
const SOC = ''
const MOD = ''
const ANA = ''

type Related = {
  id: string; title: string; channel_name?: string; creator_name?: string
  views: number; duration: number; is_short: number; created_at: string
}

function VideoPage() {
  const params = useSearchParams()
  const id = params.get('id') || ''
  const { lang, t } = useI18n()
  const [v, setV] = useState<any>(null)
  const [st, setSt] = useState('ok')
  const [channel, setChannel] = useState('')
  const [sub, setSub] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [text, setText] = useState('')
  const [user, setUser] = useState<any>(null)
  const [reward, setReward] = useState('')
  const [related, setRelated] = useState<Related[]>([])
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(0)
  const [watchlisted, setWatchlisted] = useState(false)
  const [favorited, setFavorited] = useState(false)
  const vidRef = useRef<HTMLVideoElement>(null)
  const lastPos = useRef(0)
  const viewerRef = useRef('')

  useEffect(() => { setUser(JSON.parse(localStorage.getItem('nst_user') || 'null')) }, [])
  useEffect(() => {
    let viewer = localStorage.getItem('nst_viewer')
    if (!viewer) { viewer = 'viewer-' + Math.random().toString(36).slice(2, 10); localStorage.setItem('nst_viewer', viewer) }
    viewerRef.current = viewer
  }, [])
  useEffect(() => {
    if (!id) return
    setV(null); setRelated([])
    fetch(API + '/api/videos/' + id + '?viewer=' + viewerRef.current).then(r => r.json()).then(d => {
      setV(d.video)
      if (d.liked !== undefined) setLiked(d.liked)
      if (d.watchlisted !== undefined) setWatchlisted(d.watchlisted)
      if (d.favorited !== undefined) setFavorited(d.favorited)
      setLikes(d.video?.likes || 0)
    }).catch(() => {})
    fetch(API + '/api/videos/' + id + '/related?limit=10').then(r => r.json()).then(d => setRelated(d.videos || [])).catch(() => {})
    fetch(MOD + '/api/mod/status/' + id).then(r => r.json()).then(d => setSt(d.status)).catch(() => {})
    fetch(SOC + '/api/social/channel?videoId=' + id).then(r => r.json()).then(d => setChannel(d.channel || '')).catch(() => {})
    fetch(SOC + '/api/social/comments?videoId=' + id).then(r => r.json()).then(setComments).catch(() => {})
  }, [id])
  useEffect(() => {
    if (!user || !channel) return
    fetch(SOC + '/api/social/subscribed?subscriber=' + user.username + '&channel=' + channel).then(r => r.json()).then(d => setSub(d.subscribed)).catch(() => {})
  }, [user, channel])

  // Local list state (watchlist/favorites) — works offline
  useEffect(() => {
    if (!id) return
    setWatchlisted(isInList('watchlist', id))
    setFavorited(isInList('favorites', id))
  }, [id])

  function sendWatch(seconds: number, completed: number) {
    if (seconds <= 0) return
    const payload = { videoId: String(id), viewerId: viewerRef.current, user: user?.username || '', seconds, completed }
    try { navigator.sendBeacon(ANA + '/api/analytics/watch', new Blob([JSON.stringify(payload)], { type: 'application/json' })) } catch (e) {}
  }
  useEffect(() => {
    if (!v) return
    lastPos.current = 0
    const t = setInterval(() => {
      const el = vidRef.current
      if (!el || el.paused) return
      const delta = el.currentTime - lastPos.current
      if (delta > 0) sendWatch(delta, 0)
      lastPos.current = el.currentTime
    }, 15000)
    return () => clearInterval(t)
  }, [v])

  async function toggleLike() {
    const next = !liked
    setLiked(next); setLikes((n) => Math.max(0, n + (next ? 1 : -1)))
    try {
      const r = await fetch(API + '/api/videos/' + id + '/like?viewer=' + viewerRef.current, { method: 'POST' })
      const d = await r.json()
      if (d.liked !== undefined) setLiked(d.liked)
      if (typeof d.likes === 'number') setLikes(d.likes)
    } catch { /* optimistic */ }
  }

  async function toggleWatch() {
    const video: StoredVideo = {
      id: v?.id || id, title: v?.title || '', channel_name: v?.channel_name || v?.creator_name,
      views: v?.views, likes: v?.likes, duration: v?.duration, is_short: v?.is_short,
      category: v?.category, created_at: v?.created_at,
    }
    const added = await toggleList('watchlist', video)
    setWatchlisted(added)
  }

  async function toggleFav() {
    const video: StoredVideo = {
      id: v?.id || id, title: v?.title || '', channel_name: v?.channel_name || v?.creator_name,
      views: v?.views, likes: v?.likes, duration: v?.duration, is_short: v?.is_short,
      category: v?.category, created_at: v?.created_at,
    }
    const added = await toggleList('favorites', video)
    setFavorited(added)
  }

  async function toggleSub() {
    if (!user) { alert('Faça login primeiro'); return }
    const r = await fetch(SOC + (sub ? '/api/social/unsubscribe' : '/api/social/subscribe'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriber: user.username, channel }) }).then(x => x.json())
    setSub(r.subscribed)
  }
  async function sendComment(e: React.FormEvent) {
    e.preventDefault()
    if (!user) { alert('Faça login primeiro'); return }
    await fetch(SOC + '/api/social/comment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: String(id), username: user.username, content: text }) })
    setText('')
    fetch(SOC + '/api/social/comments?videoId=' + id).then(r => r.json()).then(setComments)
  }
  async function report() {
    const reason = prompt('Motivo da denúncia:')
    if (!reason) return
    await fetch(MOD + '/api/mod/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetType: 'video', targetId: String(id), reason, reporter: user ? user.username : 'anon' }) })
    alert('Denúncia registrada')
  }

  const isPt = lang === 'pt'

  if (!id) return <p className="p-6 text-gray-400">{isPt ? 'Vídeo não informado.' : 'No video specified.'}</p>
  if (st === 'removed') return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="p-6 bg-gray-900 border border-red-800 rounded text-red-300">🚫 {isPt ? 'Este vídeo foi removido pela moderação.' : 'This video was removed by moderation.'}</div>
    </main>
  )
  if (!v) return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="aspect-video rounded-2xl bg-gray-900 nx-shimmer" />
      <div className="h-6 bg-gray-800 rounded w-2/3 mt-4" />
      <div className="h-4 bg-gray-800 rounded w-1/3 mt-2" />
    </main>
  )

  const ch = v.channel_name || v.creator_name || 'NexaStream'
  const relatedList = related.filter((r) => r.id !== id)

  return (
    <main className="max-w-7xl mx-auto p-3 md:p-5 pb-24 md:pb-8">
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        {/* Coluna principal */}
        <div>
          <VideoPlayer
            src={videoUrl(v)}
            poster={thumbUrl(v)}
            sources={(v.qualities && v.qualities.length ? v.qualities : [{ label: '360p', url: videoUrl(v) }]).map((s: any) => ({ label: s.label || 'Auto', url: s.url.startsWith('http') ? s.url : apiBase() + s.url }))}
          />

          <h1 className="text-lg md:text-xl font-bold mt-3 leading-snug">{v.title}</h1>

          {/* Channel row + actions */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-900 flex items-center justify-center text-sm font-bold text-indigo-200">
                {ch[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{ch}</p>
                <p className="text-[11px] text-gray-500">
                  {formatViews(v.views)} {t('views')} • {v.created_at ? timeAgo(v.created_at, lang) : ''}
                </p>
              </div>
              {channel && (
                <button onClick={toggleSub}
                  className={'ml-2 px-4 py-1.5 rounded-full text-xs font-semibold shrink-0 ' + (sub ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-950')}>
                  {sub ? (isPt ? 'Inscrito ✓' : 'Subscribed ✓') : (isPt ? 'Inscrever-se' : 'Subscribe')}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={toggleLike}
                className={'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition active:scale-95 ' +
                  (liked ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700')}>
                <svg viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.6 11H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2.6M11 5.6 9.9 9.2a2 2 0 0 1-1.9 1.3H4v11h13.2a2 2 0 0 0 2-1.6l1.5-8a2 2 0 0 0-2-2.4H14l1-4.4V4a2 2 0 0 0-2-2l-3 3.6Z" />
                </svg>
                {formatViews(likes || v.likes)}
              </button>
              <button onClick={toggleWatch}
                className={'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition active:scale-95 ' +
                  (watchlisted ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700')}
                title={isPt ? 'Assistir depois' : 'Watch later'}>
                <svg viewBox="0 0 24 24" fill={watchlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 3H7a2 2 0 0 0-2 2v16l7-4 7 4V5a2 2 0 0 0-2-2Z" />
                </svg>
                <span className="hidden sm:inline">{isPt ? 'Assistir depois' : 'Watch later'}</span>
              </button>
              <button onClick={toggleFav}
                className={'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition active:scale-95 ' +
                  (favorited ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-200 hover:bg-gray-700')}
                title={isPt ? 'Favoritar' : 'Favorite'}>
                <svg viewBox="0 0 24 24" fill={favorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                <span className="hidden sm:inline">{isPt ? 'Favorito' : 'Favorite'}</span>
              </button>
              <button onClick={report} className="px-3 py-2 rounded-full bg-gray-800 text-xs text-red-300 hover:bg-red-950 transition" title={isPt ? 'Denunciar' : 'Report'}>
                ⚠️
              </button>
            </div>
          </div>

          {reward && <p className="text-xs text-indigo-300 mt-2">{reward}</p>}

          {/* Description */}
          {v.description && (
            <div className="mt-4 p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 text-sm text-gray-300">
              <p className="line-clamp-4">{v.description}</p>
            </div>
          )}

          {/* Comments */}
          <h2 className="text-base font-bold mt-6 mb-3">
            {isPt ? 'Comentários' : 'Comments'} ({comments.length})
          </h2>
          <form onSubmit={sendComment} className="flex gap-2 mb-4">
            <input className="flex-1 p-2.5 rounded-full bg-gray-900 border border-gray-700 focus:border-indigo-500 outline-none text-sm"
              placeholder={user ? (isPt ? 'Comentar...' : 'Comment...') : (isPt ? 'Faça login para comentar' : 'Sign in to comment')}
              value={text} onChange={e => setText(e.target.value)} required />
            <button className="px-4 py-2 rounded-full bg-indigo-600 text-sm font-semibold">{isPt ? 'Enviar' : 'Send'}</button>
          </form>
          <div className="space-y-2">
            {comments.length === 0 && (
              <p className="text-xs text-gray-500">{isPt ? 'Seja o primeiro a comentar!' : 'Be the first to comment!'}</p>
            )}
            {comments.map(c => (
              <div key={c.id} className="p-3 bg-gray-900 rounded-xl border border-gray-800 text-sm">
                <p className="text-indigo-300 font-semibold">{c.username} <span className="text-gray-500 font-normal">• {c.created_at}</span></p>
                <p className="text-gray-200 mt-1">{c.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar: related */}
        <aside>
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-indigo-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7Z" />
            </svg>
            {isPt ? 'Relacionados' : 'Related'}
          </h2>
          <div className="space-y-3">
            {relatedList.length === 0 && Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-36 aspect-video rounded-lg bg-gray-800" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3 bg-gray-800 rounded w-4/5" />
                  <div className="h-3 bg-gray-800 rounded w-1/2" />
                </div>
              </div>
            ))}
            {relatedList.map((r) => {
              const rc = r.channel_name || r.creator_name || 'NexaStream'
              return (
                <Link key={r.id} href={'/video?id=' + r.id} className="flex gap-3 group active:bg-gray-900 rounded-xl p-1">
                  <div className="relative shrink-0 w-36 aspect-video rounded-lg overflow-hidden bg-gray-800">
                    <img src={thumbUrl(r)} alt={r.title} loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    {r.duration > 0 && (
                      <span className="absolute bottom-1 right-1 text-[10px] font-semibold bg-black/80 px-1 py-0.5 rounded">{formatDuration(r.duration)}</span>
                    )}
                  </div>
                  <div className="min-w-0 py-0.5">
                    <h3 className="text-sm font-semibold line-clamp-2 group-hover:text-indigo-300 transition">{r.title}</h3>
                    <p className="text-xs text-gray-400 mt-1 truncate">{rc}</p>
                    <p className="text-[11px] text-gray-500">{formatViews(r.views)} {t('views')} • {timeAgo(r.created_at, lang)}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </aside>
      </div>
    </main>
  )
}

export default function VideoPageWrapper() {
  return (
    <Suspense fallback={<p className="p-6">Carregando...</p>}>
      <VideoPage />
    </Suspense>
  )
}
