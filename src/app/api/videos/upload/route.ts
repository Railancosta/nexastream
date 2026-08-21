import { NextRequest, NextResponse } from 'next/server';
import getStore from '@/lib/store';
import { verifyJWT, generateId } from '@/lib/jwt';

const store = getStore();
export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
  const payload = await verifyJWT(auth.slice(7));
  if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  try {
    const { title, description, category, duration, is_short, video_url, thumbnail_url } = await req.json();
    if (!title) return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 });

    const user = store.users.get(payload.sub);
    const id = generateId();
    const video = {
      id, user_id: payload.sub, title, description: description || '', category: category || 'tech',
      duration: duration || 0, is_short: is_short ? 1 : 0, video_url: video_url || '', thumbnail_url: thumbnail_url || '',
      torrent_hash: '', views: 0, likes: 0, comments_count: 0, status: 'ready',
      created_at: new Date().toISOString(), creator_name: user?.username || 'Unknown'
    };
    store.videos.set(id, video);
    return NextResponse.json({ video }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
