'use client'
import { useEffect, useState } from 'react'
const M = ''
export default function MainnetPage() {
  const [s, setS] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const load = () => fetch(M + '/api/mainnet/status').then(r => r.json()).then(setS).catch(() => {})
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t) }, [])
  async function activate() {
    const r = await fetch(M + '/api/mainnet/activate', { method: 'POST' })
    const d = await r.json(); setMsg(r.ok ? 'MAINNET ATIVA: ' + d.genesisHash : 'BLOQUEADO (Item 40): ' + JSON.stringify(d.missing || d.error))
  }
  if (!s) return <p className="p-6">Carregando gates...</p>
  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Mainnet NST — Gate de Lançamento (Item 40)</h1>
      <div className={'p-4 rounded border ' + (s.mode === 'mainnet' ? 'bg-green-950 border-green-700' : 'bg-yellow-950 border-yellow-700')}>
        <p className="font-bold">Modo atual: {s.mode.toUpperCase()}</p>
        <p className="text-sm mt-1">{s.ready ? 'Todos os gates passaram.' : 'MAINNET NÃO É UM BOTÃO — gates pendentes abaixo.'}</p>
      </div>
      <div className="p-4 bg-gray-900 rounded border border-gray-800 text-sm space-y-1">
        <p className="font-semibold">Genesis final</p>
        <p>Token: {s.genesis?.token} • Supply máx: {s.genesis?.maxSupply?.toLocaleString()}</p>
        <p className="text-gray-500 break-all">hash: {s.genesis?.hash}</p>
        <p className="text-gray-400">{(s.genesis?.allocations || []).map((a: any) => a.name + ' ' + a.pct + '%').join(' · ')}</p>
      </div>
      <div className="space-y-2">
        {(s.gates || []).map((g: any) => (
          <div key={g.id} className="p-3 bg-gray-900 rounded border border-gray-800 flex justify-between text-sm">
            <div><p className="font-semibold">{g.id}</p><p className="text-xs text-gray-500">{g.name}</p>{g.evidence && <p className="text-xs text-gray-600">{g.evidence}</p>}</div>
            <span className={g.passed ? 'text-green-400' : 'text-red-400'}>{g.passed ? 'PASS' : 'PENDENTE'}</span>
          </div>
        ))}
      </div>
      <button onClick={activate} className="w-full p-3 rounded bg-indigo-600 font-semibold">Tentar ativar mainnet</button>
      {msg && <p className="text-sm text-yellow-300">{msg}</p>}
    </main>
  )
}
