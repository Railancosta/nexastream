import { NextRequest, NextResponse } from 'next/server'
import getStore from '@/lib/store'
import { signJWT, hashPassword, generateId } from '@/lib/jwt'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { username, email, password } = await req.json()
    if (!username || !email || !password) return NextResponse.json({ error: 'Preencha todos os campos' }, { status: 400 })
    if (password.length < 6) return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 })
    const store = getStore()
    const existing = [...store.users.values()].find(u => u.email === email)
    if (existing) return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
    const { hash, salt } = await hashPassword(password)
    const id = generateId()
    const user = { id, username, email, password_hash: `${hash}:${salt}`, nst_balance: 1000, reputation: 1, is_creator: 0, bio: '', created_at: new Date().toISOString() }
    store.users.set(id, user)
    store.transactions.set('tx_' + id, { id: 'tx_' + id, user_id: id, type: 'welcome_bonus', amount: 1000, description: 'Bônus de boas-vindas NexaStream', status: 'completed', created_at: new Date().toISOString() })
    const token = await signJWT({ sub: id, username, email })
    return NextResponse.json({ token, user: { id, username, email } }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ error: e.message || 'Erro interno' }, { status: 500 }) }
}
