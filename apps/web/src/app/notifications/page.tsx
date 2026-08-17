'use client'
import { useEffect, useState } from 'react'
export default function Notifications() {
  const [rows, setRows] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
  useEffect(() => { setUser(JSON.parse(localStorage.getItem('nst_user') || 'null')) }, [])
  useEffect(() => {
    if (!user) return
    fetch('http://localhost:3011/api/social/notifications?to=' + user.username).then(r => r.json()).then(setRows).catch(() => {})
  }, [user])
  async function readAll() {
    if (!user) return
    await fetch('http://localhost:3011/api/social/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: user.username }) })
    setRows(rows.map(r => ({ ...r, read: 1 })))
  }
  if (!user) return <p className="p-6">Faça login para ver notificações.</p>
  return (
    <main className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Notificações</h1>
        <button onClick={readAll} className="px-3 py-1 rounded bg-gray-800 text-sm">Marcar todas como lidas</button>
      </div>
      {rows.length === 0 && <p className="text-gray-500">Nenhuma notificação.</p>}
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className={'p-3 rounded border text-sm ' + (r.read ? 'bg-gray-900 border-gray-800 text-gray-500' : 'bg-indigo-950 border-indigo-700')}>
            <p>{r.text}</p>
            <p className="text-xs mt-1">{r.type} • {r.created_at}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
