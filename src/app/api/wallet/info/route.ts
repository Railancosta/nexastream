import { NextRequest, NextResponse } from 'next/server';
import getStore from '@/lib/store';
import { verifyJWT } from '@/lib/jwt';

const store = getStore();
export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
  const payload = await verifyJWT(auth.slice(7));
  if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const wallets = [...store.wallets.values()].filter(w => w.user_id === payload.sub);
  const user = store.users.get(payload.sub);
  return NextResponse.json({ wallets, nst_balance: user?.nst_balance || 0 });
}
