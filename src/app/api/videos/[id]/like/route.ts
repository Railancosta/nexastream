import { NextRequest, NextResponse } from 'next/server'
import getStore from '@/lib/store'
import { verifyJWT, generateId } from '@/lib/jwt'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 })
  const payload = await verifyJWT(auth.slice(7))
  if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  const store = getStore()
  const likeKey = `${id}:${payload.sub}`
  if (store.likes.has(likeKey)) {
    store.likes.delete(likeKey)
    const v = store.videos.get(id); if (v) v.likes = Math.max(0, v.likes - 1)
    return NextResponse.json({ liked: false })
  } else {
    store.likes.set(likeKey, { video_id: id, user_id: payload.sub })
    const v = store.videos.get(id)
    if (v) { v.likes += 1; if (v.user_id !== payload.sub) { const c = store.users.get(v.user_id); if (c) c.nst_balance += 5; store.transactions.set('tx_' + generateId(), { id: 'tx_' + generateId(), user_id: v.user_id, type: 'like_reward', amount: 5, description: `Like no vídeo ${id}`, status: 'completed', created_at: new Date().toISOString() }) } }
    return NextResponse.json({ liked: true })
  }
}
