import { NextRequest, NextResponse } from 'next/server';
import getStore from '@/lib/store';
import { verifyJWT, generateId } from '@/lib/jwt';

const store = getStore();
export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
  const payload = await verifyJWT(auth.slice(7));
  if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { video_id, bytes_uploaded } = await req.json();
  if (!video_id) return NextResponse.json({ error: 'video_id obrigatório' }, { status: 400 });

  const reward = Math.min(Math.floor((bytes_uploaded || 0) / (10 * 1024 * 1024)), 100);
  if (reward > 0) {
    const user = store.users.get(payload.sub);
    if (user) user.nst_balance += reward;
    store.transactions.set('tx_' + generateId(), { id: 'tx_' + generateId(), user_id: payload.sub, type: 'seeding_reward', amount: reward, description: `Seeding vídeo ${video_id}`, status: 'completed', created_at: new Date().toISOString() });
  }

  store.peers.set(`${payload.sub}:${video_id}`, { user_id: payload.sub, video_id, bytes_uploaded: bytes_uploaded || 0, last_seen: new Date().toISOString() });
  return NextResponse.json({ ok: true, reward });
}
