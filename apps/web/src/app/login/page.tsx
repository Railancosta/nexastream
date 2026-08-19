'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { API } from '../../lib/api'
export default function Login() {
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState('')
  const router = useRouter()
  async function go(e: React.FormEvent) {
    e.preventDefault()
    const r = await fetch(API() + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) })
    const d = await r.json()
    if (!r.ok) { setErr(d.error || 'erro'); return }
    localStorage.setItem('nst_token', d.token); localStorage.setItem('nst_user', JSON.stringify(d.user))
    router.push('/')
  }
  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Entrar</h1>
      {err && <p className="text-red-400 text-sm mb-2">{err}</p>}
      <form onSubmit={go} className="space-y-3">
        <input className="w-full p-2 rounded bg-gray-900 border border-gray-700" type="email" placeholder="email" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="w-full p-2 rounded bg-gray-900 border border-gray-700" type="password" placeholder="senha" value={pw} onChange={e => setPw(e.target.value)} required />
        <button className="w-full p-2 rounded bg-indigo-600 font-semibold">Entrar</button>
      </form>
      <p className="text-sm text-gray-400 mt-4 text-center">
        Não tem conta? <Link href="/register" className="text-indigo-400 underline">Criar conta</Link>
      </p>
    </main>
  )
}
