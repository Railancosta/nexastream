import { NextRequest, NextResponse } from 'next/server';
import getStore from '@/lib/store';

const store = getStore();
export async function GET(req: NextRequest) {
  const videoId = new URL(req.url).searchParams.get('video_id');
  if (!videoId) return NextResponse.json({ error: 'video_id obrigatório' }, { status: 400 });
  const peers = [...store.peers.values()].filter(p => p.video_id === videoId).sort((a, b) => b.bytes_uploaded - a.bytes_uploaded).slice(0, 50);
  return NextResponse.json({ peers, count: peers.length });
}
