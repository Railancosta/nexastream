import { NextRequest, NextResponse } from 'next/server';
import getStore from '@/lib/store';
import { verifyJWT } from '@/lib/jwt';

const store = getStore();
export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
  const payload = await verifyJWT(auth.slice(7));
  if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  const txs = [...store.transactions.values()].filter(t => t.user_id === payload.sub).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 50);
  return NextResponse.json({ transactions: txs });
}
