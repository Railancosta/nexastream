import { NextRequest, NextResponse } from 'next/server';
import getStore from '@/lib/store';
import { verifyJWT } from '@/lib/jwt';

const store = getStore();
export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const payload = await verifyJWT(auth.slice(7));
  if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const user = store.users.get(payload.sub);
  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  return NextResponse.json({ user: { id: user.id, username: user.username, email: user.email, nst_balance: user.nst_balance, bio: user.bio, created_at: user.created_at } });
}
