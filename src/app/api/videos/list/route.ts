import { NextRequest, NextResponse } from 'next/server';
import getStore from '@/lib/store';

const store = getStore();
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
  const category = url.searchParams.get('category');

  let videos = [...store.videos.values()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  if (category) videos = videos.filter(v => v.category === category);

  const total = videos.length;
  const paged = videos.slice((page - 1) * limit, page * limit);

  return NextResponse.json({ videos: paged, total, page, limit });
}
