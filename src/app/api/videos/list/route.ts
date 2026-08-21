import { NextRequest, NextResponse } from 'next/server'
import getStore from '@/lib/store'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50)
  const category = url.searchParams.get('category')
  const store = getStore()
  let videos = [...store.videos.values()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  if (category) videos = videos.filter(v => v.category === category)
  const total = videos.length
  return NextResponse.json({ videos: videos.slice((page - 1) * limit, page * limit), total, page, limit })
}
