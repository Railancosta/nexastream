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
    <Link href={'/video?id=' + v.id} className="group block">
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

  // Landing page profissional quando não há vídeos (backend offline ou sem conteúdo)
  if (empty && !error && !loading) {
    return (
      <main className="min-h-screen">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-indigo-950/50 to-gray-950 py-20 px-4">
          <div className="absolute inset-0 bg-[url('/icon.svg')] bg-center bg-no-repeat bg-[length:200px] opacity-5" />
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/25">
              <span className="text-5xl">🎬</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">
              NexaStream
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-3 font-medium">
              {lang === 'pt' ? 'A Plataforma de Vídeo Descentralizada' : 'The Decentralized Video Platform'}
            </p>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              {lang === 'pt'
                ? 'Streaming P2P, blockchain nativa, carteira NST e governança DAO. O futuro do conteúdo digital é aberto, distribuído e programável.'
                : 'P2P streaming, native blockchain, NST wallet and DAO governance. The future of digital content is open, distributed and programmable.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login" className="px-8 py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-500 font-semibold text-white transition active:scale-95 shadow-lg shadow-indigo-500/25">
                {lang === 'pt' ? '🚀 Começar Agora' : '🚀 Get Started'}
              </Link>
              <Link href="/search" className="px-8 py-3.5 rounded-full bg-gray-800 hover:bg-gray-700 font-semibold text-gray-200 transition active:scale-95 border border-gray-700">
                {lang === 'pt' ? '🔍 Explorar Vídeos' : '🔍 Explore Videos'}
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-4 bg-gray-950">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              {lang === 'pt' ? 'Por que NexaStream?' : 'Why NexaStream?'}
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: '⚡',
                  title: lang === 'pt' ? 'Streaming P2P' : 'P2P Streaming',
                  desc: lang === 'pt' ? 'Entrega descentralizada via WebTorrent. Sem CDN centralizado, mais resistente e econômico.' : 'Decentralized delivery via WebTorrent. No central CDN, more resilient and cost-effective.'
                },
                {
                  icon: '🔗',
                  title: lang === 'pt' ? 'Blockchain Nativa' : 'Native Blockchain',
                  desc: lang === 'pt' ? 'Cadeia própria com PoA, NFTs e content addressing SHA-256. Transparência total.' : 'Own chain with PoA, NFTs and SHA-256 content addressing. Full transparency.'
                },
                {
                  icon: '💰',
                  title: lang === 'pt' ? 'Carteira NST' : 'NST Wallet',
                  desc: lang === 'pt' ? 'Recompensas para criadores, pagamentos feeless via Nano bridge. Economia justa.' : 'Creator rewards, feeless payments via Nano bridge. Fair economy.'
                },
                {
                  icon: '🗳️',
                  title: lang === 'pt' ? 'Governança DAO' : 'DAO Governance',
                  desc: lang === 'pt' ? 'Comunidade decide o futuro da plataforma. Propostas, votações e transparência.' : 'Community decides the platform future. Proposals, votes and transparency.'
                },
                {
                  icon: '🎨',
                  title: lang === 'pt' ? 'Creator Studio' : 'Creator Studio',
                  desc: lang === 'pt' ? 'Dashboard completo: analytics, monetização, NFTs e gestão de conteúdo.' : 'Complete dashboard: analytics, monetization, NFTs and content management.'
                },
                {
                  icon: '🌍',
                  title: lang === 'pt' ? 'i18n Automático' : 'Auto i18n',
                  desc: lang === 'pt' ? 'Tradução automática de títulos para 12 idiomas via IP. Alcance global.' : 'Auto-translation of titles to 12 languages via IP. Global reach.'
                }
              ].map((f, i) => (
                <div key={i} className="p-6 rounded-2xl bg-gray-900/50 border border-gray-800 hover:border-indigo-500/50 transition group">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition">{f.icon}</div>
                  <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-16 px-4 bg-gradient-to-b from-gray-900 to-gray-950">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: '19', label: lang === 'pt' ? 'Páginas' : 'Pages' },
                { value: '12', label: lang === 'pt' ? 'Idiomas' : 'Languages' },
                { value: '55M', label: 'NST ' + (lang === 'pt' ? 'Oferta' : 'Supply') },
                { value: '100%', label: lang === 'pt' ? 'Open Source' : 'Open Source' }
              ].map((s, i) => (
                <div key={i}>
                  <div className="text-3xl md:text-4xl font-bold text-indigo-400 mb-1">{s.value}</div>
                  <div className="text-sm text-gray-400">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 bg-gray-950">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">
              {lang === 'pt' ? 'Pronto para o Futuro?' : 'Ready for the Future?'}
            </h2>
            <p className="text-gray-400 mb-8">
              {lang === 'pt'
                ? 'Junte-se à revolução do conteúdo descentralizado. Crie, compartilhe e ganhe com NexaStream.'
                : 'Join the decentralized content revolution. Create, share and earn with NexaStream.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="px-8 py-3.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-semibold text-white transition active:scale-95 shadow-lg">
                {lang === 'pt' ? 'Criar Conta Grátis' : 'Create Free Account'}
              </Link>
              <Link href="/upload" className="px-8 py-3.5 rounded-full bg-gray-800 hover:bg-gray-700 font-semibold text-gray-200 transition active:scale-95 border border-gray-700">
                {lang === 'pt' ? '📤 Enviar Primeiro Vídeo' : '📤 Upload First Video'}
              </Link>
            </div>
          </div>
        </section>
      </main>
    )
  }

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
