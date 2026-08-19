'use client'
import { useEffect, useState } from 'react'

// ---------------------------------------------------------------------------
// i18n zero-custo: dicionários locais para a UI + detecção automática por IP
// (CF-IPCountry via /api/geo) ou Accept-Language. Conteúdo (títulos) passa
// por LibreTranslate self-hosted via /api/translate quando configurado.
// ---------------------------------------------------------------------------

export type Dict = Record<string, string>

const pt: Dict = {
  forYou: 'Para você', shorts: 'Shorts', videos: 'Vídeos', smartFeed: 'feed inteligente',
  recommended: 'Recomendados', seeAll: 'Ver todos', views: 'views',
  emptyTitle: 'Ainda não há vídeos', emptyBody: 'Seja o primeiro a publicar!',
  uploadFirst: 'Enviar meu primeiro vídeo', errorLoading: 'Falha ao carregar o feed.',
  retry: 'Tentar novamente', home: 'Início', live: 'Ao vivo', profile: 'Perfil', alerts: 'Alertas',
  searchPlaceholder: 'Buscar vídeos e Shorts...', upload: 'Enviar', login: 'Entrar',
  installApp: 'Instalar app', language: 'Idioma', hoursAgo: 'h', minutesAgo: 'min',
  justNow: 'agora', yesterday: 'ontem', daysAgo: 'd', monthsAgo: 'mês', monthsAgoP: 'meses',
  open: 'Abrir', sound: 'Som', sendVideo: 'Enviar vídeo', shortType: 'Short', longType: 'Vídeo longo',
  tapToChoose: 'Toque para escolher ou gravar um vídeo', titlePlaceholder: 'Título do vídeo',
  descPlaceholder: 'Descrição (opcional)', publish: 'Publicar vídeo', publishing: 'Enviando',
  transcoding: 'Processando vídeo...', publishOk: 'Vídeo publicado! Processando em background.'
}

const en: Dict = {
  forYou: 'For you', shorts: 'Shorts', videos: 'Videos', smartFeed: 'smart feed',
  recommended: 'Recommended', seeAll: 'See all', views: 'views',
  emptyTitle: 'No videos yet', emptyBody: 'Be the first to publish!',
  uploadFirst: 'Upload my first video', errorLoading: 'Failed to load the feed.',
  retry: 'Try again', home: 'Home', live: 'Live', profile: 'Profile', alerts: 'Alerts',
  searchPlaceholder: 'Search videos and Shorts...', upload: 'Upload', login: 'Sign in',
  installApp: 'Install app', language: 'Language', hoursAgo: 'h', minutesAgo: 'min',
  justNow: 'now', yesterday: 'yesterday', daysAgo: 'd', monthsAgo: 'month', monthsAgoP: 'months',
  open: 'Open', sound: 'Sound', sendVideo: 'Upload video', shortType: 'Short', longType: 'Long video',
  tapToChoose: 'Tap to choose or record a video', titlePlaceholder: 'Video title',
  descPlaceholder: 'Description (optional)', publish: 'Publish video', publishing: 'Uploading',
  transcoding: 'Processing video...', publishOk: 'Video published! Processing in background.'
}

const es: Dict = {
  forYou: 'Para ti', shorts: 'Shorts', videos: 'Videos', smartFeed: 'feed inteligente',
  recommended: 'Recomendados', seeAll: 'Ver todos', views: 'vistas',
  emptyTitle: 'Aún no hay videos', emptyBody: '¡Sé el primero en publicar!',
  uploadFirst: 'Subir mi primer video', errorLoading: 'Error al cargar el feed.',
  retry: 'Reintentar', home: 'Inicio', live: 'En vivo', profile: 'Perfil', alerts: 'Alertas',
  searchPlaceholder: 'Buscar videos y Shorts...', upload: 'Subir', login: 'Entrar',
  installApp: 'Instalar app', language: 'Idioma', hoursAgo: 'h', minutesAgo: 'min',
  justNow: 'ahora', yesterday: 'ayer', daysAgo: 'd', monthsAgo: 'mes', monthsAgoP: 'meses',
  open: 'Abrir', sound: 'Sonido', sendVideo: 'Subir video', shortType: 'Short', longType: 'Video largo',
  tapToChoose: 'Toca para elegir o grabar un video', titlePlaceholder: 'Título del video',
  descPlaceholder: 'Descripción (opcional)', publish: 'Publicar video', publishing: 'Subiendo',
  transcoding: 'Procesando video...', publishOk: '¡Video publicado! Procesando en segundo plano.'
}

const DICTS: Record<string, Dict> = { pt, en, es }

export function t(lang: string, key: string): string {
  return DICTS[lang]?.[key] ?? en[key] ?? pt[key] ?? key
}

export async function detectLang(): Promise<string> {
  const saved = localStorage.getItem('nst_lang')
  if (saved) return saved
  const nav = (navigator.language || 'pt').split('-')[0]
  try {
    const cached = sessionStorage.getItem('nst_geo')
    if (cached) return JSON.parse(cached).lang || nav
    const r = await fetch('/api/geo')
    if (r.ok) {
      const d = await r.json()
      sessionStorage.setItem('nst_geo', JSON.stringify(d))
      return d.lang || nav
    }
  } catch (e) {}
  return nav
}

export function setLang(lang: string) {
  localStorage.setItem('nst_lang', lang)
}

// Hook: idioma atual + t()
export function useI18n() {
  const [lang, setLangState] = useState('pt')
  useEffect(() => { detectLang().then(setLangState) }, [])
  const change = (l: string) => { setLang(l); setLangState(l) }
  return { lang, setLang: change, t: (k: string) => t(lang, k) }
}

// Tradução de conteúdo (títulos) via /api/translate com cache local
export async function translateTexts(texts: string[], target: string): Promise<string[]> {
  if (target === 'pt' || !texts.length) return texts
  const cacheKey = 'nst_tr_' + target
  let cache: Record<string, string> = {}
  try { cache = JSON.parse(localStorage.getItem(cacheKey) || '{}') } catch (e) {}
  const missing = texts.filter(x => !(x in cache))
  if (missing.length) {
    try {
      const r = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: missing, target })
      })
      if (r.ok) {
        const d = await r.json()
        missing.forEach((x, i) => { cache[x] = d.translations?.[i] || x })
        localStorage.setItem(cacheKey, JSON.stringify(cache))
      }
    } catch (e) { /* mantém original */ }
  }
  return texts.map(x => cache[x] || x)
}
