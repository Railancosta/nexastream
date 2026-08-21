import { NextRequest, NextResponse } from 'next/server'
import getStore from '@/lib/store'
import { verifyJWT } from '@/lib/jwt'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return NextResponse.json({ error: 'Autenticação necessária' }, { status: 401 })
  const payload = await verifyJWT(auth.slice(7))
  if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  const { address, chain, wallet_type } = await req.json()
  if (!address || !chain) return NextResponse.json({ error: 'Endereço e chain são obrigatórios' }, { status: 400 })
  const validators: Record<string, RegExp> = { ethereum: /^0x[a-fA-F0-9]{40}$/, bitcoin: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/, solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, nano: /^(nano|xrb_)_[a-f0-9]{52,60}$/ }
  if (validators[chain] && !validators[chain].test(address)) return NextResponse.json({ error: `Endereço inválido para ${chain}` }, { status: 400 })
  const store = getStore()
  const key = `${payload.sub}:${address}:${chain}`
  store.wallets.set(key, { id: store.wallets.size + 1, user_id: payload.sub, address, chain, wallet_type: wallet_type || 'external', connected_at: new Date().toISOString() })
  return NextResponse.json({ ok: true, address, chain })
}
