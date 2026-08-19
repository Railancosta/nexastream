'use client'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { API, thumbUrl, videoUrl, viewerId, formatViews } from '../../lib/api'

type Short = {
  id: string; title: string; channel_name?: string; views: number; likes: number
}

function ShortSlide({ v, active }: { v: Short; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)
  const [likes, setLikes] = useState(v.likes || 0)
  const [liked, setLiked] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (active) {
      el.currentTime = 0
      el.play().catch(() => {})
    } else {
      el.pause()
    }
  }, [active])

  useEffect(() => {
    if (!active) return
    const t = setInterval(() => {
      const el = ref.current
      if (!el || el.paused) return
      fetch(API() + '/api/videos/' + v.id + '/watch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seconds: 5, completed: el.currentTime >= el.duration - 0.5 })
      }).catch(() => {})
    }, 5000)
    return () => clearInterval(t)
  }, [active, v.id])

  async function like() {
    if (liked) return
    setLiked(true); setLikes((n) => n + 1)
    try {
      const r = await fetch(API() + '/api/videos/' + v.id + '/like', { method: 'POST' })
      const d = await r.json()
      if (typeof d.likes === 'number') setLikes(d.likes)
    } catch { /* mantém otimista */ }
  }

  return (
    <div className="relative h-full w-full snap-start snap-always flex items-center justify-center bg-black">
      <video
        ref={ref}
        src={videoUrl(v)}
        poster={thumbUrl(v)}
        className="h-full w-full object-contain"
        loop
        muted={muted}
        playsInline
        onClick={() => setMuted((m) => !m)}
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

      <div className="absolute right-2 bottom-24 flex flex-col items-center gap-5">
        <button onClick={like} className="flex flex-col items-center gap-1 active:scale-90 transition">
          <span className={'w-11 h-11 rounded-full flex items-center justify-center ' + (liked ? 'bg-indigo-600' : 'bg-gray-800/80')}>
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </span>
          <span className="text-[11px] font-semibold">{formatViews(likes)}</span>
        </button>
        <Link href={'/video/' + v.id} className="flex flex-col items-center gap-1 active:scale-90 transition">
          <span className="w-11 h-11 rounded-full bg-gray-800/80 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8m-8 4h5m7-2a9 9 0 1 1-4.4-7.7L21 3l-.7 3.6A8.96 8.96 0 0 1 21 12Z" />
            </svg>
          </span>
          <span className="text-[11px] font-semibold">Abrir</span>
        </Link>
        <button onClick={() => setMuted((m) => !m)} className="flex flex-col items-center gap-1 active:scale-90 transition">
          <span className="w-11 h-11 rounded-full bg-gray-800/80 flex items-center justify-center">
            {muted ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4V5Zm10.5 3.5-5 5m0-5 5 5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4V5Zm4.5 4a5 5 0 0 1 0 6m2.5-9a9 9 0 0 1 0 12" transform="scale(0.95) translate(0.6 0.6)" />
              </svg>
            )}
          </span>
          <span className="text-[11px] font-semibold">{muted ? 'Som' : 'Mudo'}</span>
        </button>
      </div>

      <div className="absolute left-3 right-16 bottom-6">
        <p className="text-sm font-bold">@{v.channel_name || 'nexastream'}</p>
        <p className="text-sm mt-1 line-clamp-2">{v.title}</p>
        <p className="text-[11px] text-gray-300 mt-1">{formatViews(v.views)} visualizações</p>
      </div>
    </div>
  )
}

function ShortsFeed() {
  const params = useSearchParams()
  const start = params.get('start')
  const [shorts, setShorts] = useState<Short[]>([])
  const [active, setActive] = useState(0)
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(API() + '/api/feed?tab=shorts&viewer=' + viewerId())
      .then((r) => r.json())
      .then((d) => {
        let list: Short[] = d.shorts || []
        if (start) {
          const i = list.findIndex((v) => v.id === start)
          if (i > 0) list = [list[i], ...list.slice(0, i), ...list.slice(i + 1)]
        }
        setShorts(list)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [start])

  const onScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const idx = Math.round(el.scrollTop / el.clientHeight)
    setActive((prev) => (prev === idx ? prev : idx))
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between p-3 bg-gradient-to-b from-black/70 to-transparent">
        <Link href="/" className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800/70" aria-label="Voltar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <span className="font-bold text-sm tracking-wide">Shorts</span>
        <Link href="/upload" className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-800/70" aria-label="Enviar short">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
            <path strokeLinecap="round" d="M12 5v14m-7-7h14" />
          </svg>
        </Link>
      </div>

      {loading && (
        <div className="h-full flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && shorts.length === 0 && (
        <div className="h-full flex flex-col items-center justify-center gap-4 px-8 text-center">
          <p className="text-gray-400 text-sm">Nenhum Short publicado ainda.</p>
          <Link href="/upload" className="px-6 py-3 rounded-full bg-indigo-600 font-semibold text-sm">Enviar o primeiro Short</Link>
        </div>
      )}

      <div
        ref={containerRef}
        onScroll={onScroll}
        className="h-full overflow-y-auto snap-y snap-mandatory no-scrollbar"
      >
        {shorts.map((v, i) => (
          <div key={v.id} className="h-full">
            <ShortSlide v={v} active={i === active} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ShortsPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-black flex items-center justify-center"><div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <ShortsFeed />
    </Suspense>
  )
}
