import { NextRequest, NextResponse } from 'next/server';
import getStore from '@/lib/store';
import { verifyJWT, generateId } from '@/lib/jwt';

const store = getStore();
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
  const payload = await verifyJWT(auth.slice(7));
  if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { seconds, completed } = await req.json();
  store.watchHistory.push({ video_id: id, user_id: payload.sub, seconds_watched: seconds || 0, completed: completed ? 1 : 0, created_at: new Date().toISOString() });

  // Anti-fraud: credit only if watched > 30s
  if (completed || (seconds && seconds > 30)) {
    const v = store.videos.get(id);
    if (v && v.user_id !== payload.sub) {
      const reward = completed ? 2 : 1;
      const creator = store.users.get(v.user_id);
      if (creator) creator.nst_balance += reward;
      store.transactions.set('tx_' + generateId(), { id: 'tx_' + generateId(), user_id: v.user_id, type: 'watch_reward', amount: reward, description: `Watch ${seconds}s no vídeo ${id}`, status: 'completed', created_at: new Date().toISOString() });
    }
  }
  return NextResponse.json({ ok: true });
}
