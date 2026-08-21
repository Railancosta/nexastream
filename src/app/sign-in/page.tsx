'use client'
import { useEffect, useState } from 'react'

export default function SignInPage() {
  const [clerkReady, setClerkReady] = useState(false)
  const [clerkKey, setKey] = useState('')

  useEffect(() => {
    const k = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    if (k && k.startsWith('pk_') && !k.includes('placeholder')) {
      setKey(k)
      import('@clerk/clerk-react').then(m => {
        ;(window as any).__ClerkReact = m
        setClerkReady(true)
      })
    }
  }, [])

  if (clerkReady && clerkKey) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center p-6">
        <div id="clerk-signin" />
      </main>
    )
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Entrar</h1>
      <form onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const email = fd.get('email') as string
        const pw = fd.get('password') as string
        const users = JSON.parse(localStorage.getItem('nst_users') || '{}')
        const user = users[email]
        if (!user || user.password !== pw) { alert('Conta não encontrada ou senha incorreta'); return }
        localStorage.setItem('nst_token', 'tok_' + Math.random().toString(36).slice(2))
        localStorage.setItem('nst_user', JSON.stringify({ id: user.id, username: user.username, email: user.email }))
        window.location.href = '/'
      }} className="space-y-3">
        <input name="email" className="w-full p-2 rounded bg-gray-900 border border-gray-700" type="email" placeholder="email" required />
        <input name="password" className="w-full p-2 rounded bg-gray-900 border border-gray-700" type="password" placeholder="senha" required />
        <button className="w-full p-2 rounded bg-indigo-600 font-semibold">Entrar</button>
      </form>
      <p className="text-sm text-gray-400 mt-4 text-center">
        Não tem conta? <a href="/register" className="text-indigo-400 underline">Criar conta</a>
      </p>
      {!clerkKey && (
        <p className="text-xs text-gray-600 mt-2 text-center">
          Para login com Google/GitHub, configure <code className="text-indigo-400">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>
        </p>
      )}
    </main>
  )
}
