'use client'

export default function SignUpPage() {
  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Criar conta</h1>
      <form onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        const username = fd.get('username') as string
        const email = fd.get('email') as string
        const pw = fd.get('password') as string
        if (!username || !email || !pw) { alert('Preencha todos os campos'); return }
        if (pw.length < 6) { alert('Senha deve ter pelo menos 6 caracteres'); return }
        const users = JSON.parse(localStorage.getItem('nst_users') || '{}')
        if (users[email]) { alert('Email já cadastrado'); return }
        const id = 'user_' + Math.random().toString(36).slice(2, 10)
        users[email] = { id, username, email, password: pw, createdAt: new Date().toISOString() }
        localStorage.setItem('nst_users', JSON.stringify(users))
        localStorage.setItem('nst_token', 'tok_' + Math.random().toString(36).slice(2))
        localStorage.setItem('nst_user', JSON.stringify({ id, username, email }))
        window.location.href = '/'
      }} className="space-y-3">
        <input name="username" className="w-full p-2 rounded bg-gray-900 border border-gray-700" placeholder="usuário" required />
        <input name="email" className="w-full p-2 rounded bg-gray-900 border border-gray-700" type="email" placeholder="email" required />
        <input name="password" className="w-full p-2 rounded bg-gray-900 border border-gray-700" type="password" placeholder="senha (mín. 6)" required minLength={6} />
        <button className="w-full p-2 rounded bg-indigo-600 font-semibold">Registrar</button>
      </form>
      <p className="text-sm text-gray-400 mt-4 text-center">
        Já tem conta? <a href="/login" className="text-indigo-400 underline">Entrar</a>
      </p>
      <p className="text-xs text-gray-600 mt-2 text-center">
        Para login com Google/GitHub, configure <code className="text-indigo-400">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code>
      </p>
    </main>
  )
}
