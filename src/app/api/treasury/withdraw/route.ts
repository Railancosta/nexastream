import { NextRequest, NextResponse } from 'next/server';
import getStore from '@/lib/store';
import { verifyJWT, generateId } from '@/lib/jwt';

const store = getStore();
export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 });
  const payload = await verifyJWT(auth.slice(7));
  if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const { amount, currency, wallet_address, memo } = await req.json();
  if (!amount || !currency || !wallet_address) return NextResponse.json({ error: 'Campos obrigatórios: amount, currency, wallet_address' }, { status: 400 });

  const user = store.users.get(payload.sub);
  if ((user?.nst_balance || 0) < amount) return NextResponse.json({ error: 'Saldo insuficiente' }, { status: 400 });

  // Memo/Tag validation for exchanges
  const MEMO_CURRENCIES = ['XRP', 'XLM', 'EOS', 'TON', 'ATOM', 'SEI', 'INJ'];
  if (MEMO_CURRENCIES.includes(currency.toUpperCase()) && !memo) {
    return NextResponse.json({ error: `Moeda ${currency} requer Memo/Tag para exchange. Preencha o campo memo.` }, { status: 400 });
  }

  if (user) user.nst_balance -= amount;
  const txId = 'tx_' + generateId();
  store.transactions.set(txId, { id: txId, user_id: payload.sub, type: 'withdrawal', amount: -amount, description: `Saque ${amount} NST → ${currency} (${wallet_address})`, status: 'pending', created_at: new Date().toISOString() });

  return NextResponse.json({ ok: true, transaction_id: txId, status: 'pending', message: `Saque de ${amount} NST para ${currency} processado. Em produção: Li.Fi/THORChain.` });
}
