import { NextRequest, NextResponse } from 'next/server';
import getStore from '@/lib/store';
import { signJWT, verifyPassword } from '@/lib/jwt';

const store = getStore();
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Preencha email e senha' }, { status: 400 });

    const user = [...store.users.values()].find(u => u.email === email);
    if (!user) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });

    // For demo users with empty password_hash, accept any password
    if (user.password_hash && user.password_hash.includes(':')) {
      const [hash, salt] = user.password_hash.split(':');
      const valid = await verifyPassword(password, hash, salt);
      if (!valid) return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
    }

    const token = await signJWT({ sub: user.id, username: user.username, email: user.email });
    return NextResponse.json({ token, user: { id: user.id, username: user.username, email: user.email, nst_balance: user.nst_balance } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro interno' }, { status: 500 });
  }
}
