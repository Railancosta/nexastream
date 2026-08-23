// Watchlist & favorites: localStorage-first with optional API sync.
// Works fully offline (the API may be unavailable); when authenticated the
// backend (Cloudflare Worker v3.0) is kept in sync.
import { apiBase } from './api'

export type ListKind = 'watchlist' | 'favorites'

const KEYS: Record<ListKind, string> = {
  watchlist: 'nst_watchlist',
  favorites: 'nst_favorites',
}

export type StoredVideo = {
  id: string
  title: string
  channel_name?: string
  creator_name?: string
  views?: number
  likes?: number
  duration?: number
  is_short?: number
  category?: string
  created_at?: string
}

function read(kind: ListKind): StoredVideo[] {
  try {
    const raw = localStorage.getItem(KEYS[kind])
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function write(kind: ListKind, items: StoredVideo[]) {
  try {
    localStorage.setItem(KEYS[kind], JSON.stringify(items.slice(0, 200)))
  } catch { /* storage full or unavailable — ignore */ }
}

export function getListItems(kind: ListKind): StoredVideo[] {
  return read(kind)
}

export function isInList(kind: ListKind, id: string): boolean {
  return read(kind).some((v) => v.id === id)
}

// Toggle membership. Returns the new state (true = added).
export async function toggleList(kind: ListKind, video: StoredVideo): Promise<boolean> {
  const items = read(kind)
  const exists = items.some((v) => v.id === video.id)
  const next = exists ? items.filter((v) => v.id !== video.id) : [video, ...items]
  write(kind, next)

  const token = localStorage.getItem('nst_token')
  if (token) {
    try {
      const method = exists ? 'DELETE' : 'POST'
      await fetch(`${apiBase()}/api/${kind}/${video.id}`, {
        method,
        headers: { Authorization: 'Bearer ' + token },
      })
    } catch { /* offline — local state already updated */ }
  }
  return !exists
}

export function removeFromList(kind: ListKind, id: string) {
  write(kind, read(kind).filter((v) => v.id !== id))
}

// Pull remote list (authenticated) and merge into local storage.
export async function syncListFromApi(kind: ListKind): Promise<StoredVideo[]> {
  const token = localStorage.getItem('nst_token')
  if (!token) return read(kind)
  try {
    const r = await fetch(`${apiBase()}/api/${kind}`, {
      headers: { Authorization: 'Bearer ' + token },
    })
    if (!r.ok) return read(kind)
    const d = await r.json()
    const remote: StoredVideo[] = d.videos || []
    const local = read(kind)
    const byId = new Map<string, StoredVideo>()
    remote.forEach((v) => byId.set(v.id, v))
    local.forEach((v) => { if (!byId.has(v.id)) byId.set(v.id, v) })
    const merged = [...byId.values()]
    write(kind, merged)
    return merged
  } catch {
    return read(kind)
  }
}
