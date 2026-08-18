// Base de API configuravel: ?api=https://seu-nodo ou localStorage ns_api
export function apiBase(port: string): string {
  if (typeof window === 'undefined') return 'http://localhost:' + port
  const q = new URLSearchParams(window.location.search).get('api')
  const stored = window.localStorage.getItem('ns_api')
  const base = q || stored
  if (base) {
    if (q) window.localStorage.setItem('ns_api', q)
    return base.replace(/\/$/, '')
  }
  return 'http://localhost:' + port
}
export const CORE = () => apiBase('3002')
export const VIDEO = () => apiBase('3002')
