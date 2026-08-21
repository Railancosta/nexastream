// Simple localStorage-based auth (works without backend)
export function localLogin(email: string, password: string): { ok: boolean; error?: string; user?: any; token?: string } {
  const users = JSON.parse(localStorage.getItem('nst_users') || '{}')
  const user = users[email]
  if (!user) return { ok: false, error: 'Conta não encontrada. Crie uma conta primeiro.' }
  if (user.password !== password) return { ok: false, error: 'Senha incorreta.' }
  const token = 'tok_' + Math.random().toString(36).slice(2)
  localStorage.setItem('nst_token', token)
  localStorage.setItem('nst_user', JSON.stringify({ id: user.id, username: user.username, email: user.email }))
  return { ok: true, user: { id: user.id, username: user.username, email: user.email }, token }
}

export function localRegister(username: string, email: string, password: string): { ok: boolean; error?: string; user?: any; token?: string } {
  if (!username || !email || !password) return { ok: false, error: 'Preencha todos os campos.' }
  if (password.length < 4) return { ok: false, error: 'Senha deve ter pelo menos 4 caracteres.' }
  const users = JSON.parse(localStorage.getItem('nst_users') || '{}')
  if (users[email]) return { ok: false, error: 'Email já cadastrado.' }
  const id = 'user_' + Math.random().toString(36).slice(2, 10)
  users[email] = { id, username, email, password, createdAt: new Date().toISOString() }
  localStorage.setItem('nst_users', JSON.stringify(users))
  const token = 'tok_' + Math.random().toString(36).slice(2)
  localStorage.setItem('nst_token', token)
  localStorage.setItem('nst_user', JSON.stringify({ id, username, email }))
  return { ok: true, user: { id, username, email }, token }
}

export function localLogout() {
  localStorage.removeItem('nst_token')
  localStorage.removeItem('nst_user')
}

export function getCurrentUser(): { id: string; username: string; email: string } | null {
  try {
    const u = localStorage.getItem('nst_user')
    return u ? JSON.parse(u) : null
  } catch { return null }
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem('nst_token')
}
