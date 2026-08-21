import { NextRequest, NextResponse } from 'next/server'
import getStore from '@/lib/store'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const tab = url.searchParams.get('tab') || 'all'
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50)
  const store = getStore()
  let videos = [...store.videos.values()]
  if (tab === 'shorts') videos = videos.filter(v => v.is_short)
  else if (tab === 'videos') videos = videos.filter(v => !v.is_short)
  const now = Date.now()
  videos.sort((a, b) => (b.likes * 3 + b.views + (now - new Date(b.created_at).getTime()) / (7 * 86400000) * -1000) - (a.likes * 3 + a.views + (now - new Date(a.created_at).getTime()) / (7 * 86400000) * -1000))
  return NextResponse.json({ videos: videos.slice(0, limit), tab })
}
