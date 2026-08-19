// Resolução da base da API NexaStream.
// Prioridade: ?api=URL (persistido em localStorage ns_api) > mesmo domínio (same-origin).
// Em desenvolvimento o Next.js faz proxy de /api e /storage para o core (:3002).
export function apiBase(): string {
  if (typeof window === 'undefined') return ''
  const q = new URLSearchParams(window.location.search).get('api')
  if (q) {
    window.localStorage.setItem('ns_api', q)
    return q.replace(/\/$/, '')
  }
  const stored = window.localStorage.getItem('ns_api')
  if (stored) return stored.replace(/\/$/, '')
  return ''
}

export const API = () => apiBase()
export const CORE = () => apiBase()
export const VIDEO = () => apiBase()

export function thumbUrl(v: any): string {
  return v.thumbnail_path ? apiBase() + v.thumbnail_path : apiBase() + '/storage/thumbs/' + v.id + '.jpg'
}

export function videoUrl(v: any): string {
  return apiBase() + (v.video_path || '')
}

export function viewerId(): string {
  if (typeof window === 'undefined') return 'anon'
  let id = window.localStorage.getItem('nst_viewer')
  if (!id) {
    id = 'viewer-' + Math.random().toString(36).slice(2, 10)
    window.localStorage.setItem('nst_viewer', id)
  }
  return id
}

export function formatViews(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.', ',') + ' mi'
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.', ',').replace(',0', '') + ' mil'
  return String(n || 0)
}

export function formatDuration(s: number): string {
  if (!s) return ''
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return m + ':' + String(sec).padStart(2, '0')
}

export function timeAgo(dateStr: string): string {
  const t = new Date((dateStr || '').replace(' ', 'T') + 'Z').getTime()
  if (!t) return ''
  const diff = Math.max(0, Date.now() - t) / 1000
  if (diff < 3600) return 'há ' + Math.max(1, Math.floor(diff / 60)) + ' min'
  if (diff < 86400) return 'há ' + Math.floor(diff / 3600) + ' h'
  if (diff < 2592000) return 'há ' + Math.floor(diff / 86400) + ' d'
  if (diff < 31536000) return 'há ' + Math.floor(diff / 2592000) + ' meses'
  return 'há ' + Math.floor(diff / 31536000) + ' anos'
}
