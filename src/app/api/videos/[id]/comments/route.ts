import { NextRequest, NextResponse } from 'next/server';
import getStore from '@/lib/store';
import { verifyJWT, generateId } from '@/lib/jwt';

const store = getStore();

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const comments = [...store.comments.values()].filter(c => c.video_id === id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50);
  return NextResponse.json({ comments });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
  const payload = await verifyJWT(auth.slice(7));
  if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: 'Comentário não pode ser vazio' }, { status: 400 });

  const user = store.users.get(payload.sub);
  const commentId = generateId();
  store.comments.set(commentId, { id: commentId, video_id: id, user_id: payload.sub, text, created_at: new Date().toISOString(), username: user?.username });

  if (user) user.nst_balance += 10;
  store.transactions.set('tx_' + generateId(), { id: 'tx_' + generateId(), user_id: payload.sub, type: 'comment_reward', amount: 10, description: `Comentário no vídeo ${id}`, status: 'completed', created_at: new Date().toISOString() });

  const video = store.videos.get(id);
  if (video) video.comments_count += 1;

  return NextResponse.json({ ok: true, id: commentId }, { status: 201 });
}
