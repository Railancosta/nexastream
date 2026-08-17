'use client'
import { useEffect, useState } from 'react'
const MOD = 'http://localhost:3014'
export default function ModPage() {
  const [queue, setQueue] = useState<any[]>([])
  const [audit, setAudit] = useState<any[]>([])
  const [vid, setVid] = useState(''); const [reason, setReason] = useState(''); const [reporter, setReporter] = useState(''); const [msg, setMsg] = useState('')
  const load = () => {
    fetch(MOD + '/api/mod/queue').then(r => r.json()).then(d => setQueue(d.reports || [])).catch(() => {})
    fetch(MOD + '/api/mod/audit').then(r => r.json()).then(d => setAudit(d.audit || [])).catch(() => {})
  }
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t) }, [])
  async function report(e: React.FormEvent) {
    e.preventDefault()
    const d = await fetch(MOD + '/api/mod/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetType: 'video', targetId: vid, reason, reporter: reporter || 'anon' }) }).then(r => r.json())
    setMsg(d.error ? 'Erro: ' + d.error : 'Denúncia registrada' + (d.autoReview ? ' • auto-review ativado (3+ denúncias)' : ''))
    load()
  }
  async function act(targetId: string, action: string) {
    await fetch(MOD + '/api/mod/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId, action, moderator: 'mod-admin' }) })
    load()
  }
  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Moderação de Conteúdo (Item 31)</h1>
      <form onSubmit={report} className="p-4 bg-gray-900 rounded border border-gray-800 space-y-2">
        <p className="font-semibold text-sm">Denunciar vídeo</p>
        <input className="w-full p-2 rounded bg-gray-950 border border-gray-700 text-sm" placeholder="ID do vídeo" value={vid} onChange={e => setVid(e.target.value)} required />
        <input className="w-full p-2 rounded bg-gray-950 border border-gray-700 text-sm" placeholder="motivo" value={reason} onChange={e => setReason(e.target.value)} required />
        <input className="w-full p-2 rounded bg-gray-950 border border-gray-700 text-sm" placeholder="seu usuário (opcional)" value={reporter} onChange={e => setReporter(e.target.value)} />
        <button className="w-full p-2 rounded bg-red-600 text-sm font-semibold">Enviar denúncia</button>
        {msg && <p className="text-xs text-indigo-300">{msg}</p>}
      </form>
      <div>
        <h2 className="text-lg font-bold mb-2">Fila de moderação ({queue.length})</h2>
        {queue.length === 0 && <p className="text-gray-500 text-sm">Fila vazia.</p>}
        <div className="space-y-2">
          {queue.map(r => (
            <div key={r.id} className="p-3 bg-gray-900 rounded border border-gray-800 text-sm flex justify-between items-center gap-2 flex-wrap">
              <div className="break-all">
                <p className="font-semibold">{r.target_id} <span className="text-xs text-yellow-400">[{r.vstatus}]</span></p>
                <p className="text-gray-400 text-xs">“{r.reason}” — {r.reporter} • {r.created_at}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => act(r.target_id, 'approve')} className="px-3 py-1 rounded bg-green-700 text-xs">Aprovar</button>
                <button onClick={() => act(r.target_id, 'remove')} className="px-3 py-1 rounded bg-red-700 text-xs">Remover</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-lg font-bold mb-2">Trilha de auditoria</h2>
        <div className="space-y-1">
          {audit.map(a => (
            <p key={a.id} className="text-xs text-gray-400 break-all">[{a.created_at}] <span className="text-indigo-300">{a.action}</span> por {a.actor} → {a.target_id} {a.note}</p>
          ))}
        </div>
      </div>
    </main>
  )
}
