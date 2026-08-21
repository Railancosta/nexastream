import { NextRequest, NextResponse } from 'next/server';
import getStore from '@/lib/store';

const store = getStore();
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q') || '';
  if (!q) return NextResponse.json({ videos: [] });
  const lower = q.toLowerCase();
  const results = [...store.videos.values()].filter(v => v.title.toLowerCase().includes(lower) || v.description.toLowerCase().includes(lower) || v.category.toLowerCase().includes(lower)).sort((a, b) => b.views - a.views).slice(0, 20);
  return NextResponse.json({ videos: results, query: q });
}
