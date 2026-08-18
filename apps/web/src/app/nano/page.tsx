'use client'
import { useEffect, useState } from 'react'
const N = 'http://localhost:3019'
export default function NanoPage() {
  const [s, setS] = useState<any>(null)
  const [rows, setRows] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const load = () => {
    fetch(N + '/api/nano/status').then(r => r.json()).then(setS).catch(() => {})
    fetch(N + '/api/nano/anchors').then(r => r.json()).then(d => setRows(d.anchors || [])).catch(() => {})
  }
  useEffect(load, [])
  async function anchorRegistry() {
    setMsg('hashing registry + assinando...')
    try {
      const reg = await fetch('https://nexastream.org/registry.json').then(r => r.text())
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(reg))
      const hash = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
      const d = await fetch(N + '/api/nano/anchor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contentHash: hash, title: 'registry.json' }) }).then(r => r.json())
      setMsg(d.status === 'on-mainnet' ? '✅ ancorado na mainnet: ' + d.blockHash : '✍️ assinado: ' + (d.blockHash || d.error) + ' (aguarda funding p/ broadcast)')
      load()
    } catch (e) { setMsg('erro: ' + e) }
  }
  if (!s) return <p className="p-6">Conectando à Nano mainnet...</p>
  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Nano Mainnet — taxa zero (Item 14/20)</h1>
      <div className="p-4 bg-gray-900 rounded border border-gray-800 text-sm space-y-1 break-all">
        <p><span className="text-gray-400">conta:</span> {s.address}</p>
        <p><span className="text-gray-400">taxas:</span> {s.fees}</p>
        <p><span className="text-gray-400">modo:</span> {s.mode}</p>
        <p><span className="text-gray-400">saldo:</span> {s.balanceRaw} raw</p>
      </div>
      {!s.funded && (
        <div className="p-3 bg-yellow-950 border border-yellow-800 rounded text-sm text-yellow-300">
          ⚠️ Para transmitir à mainnet, envie <b>1 raw</b> (poeira, grátis via faucet comunitário Nano) para a conta acima. Até lá: modo sign-only (assinaturas verificáveis, Item 61).
        </div>
      )}
      <button onClick={anchorRegistry} className="px-4 py-2 rounded bg-indigo-600">Ancorar hash do registry.json na mainnet</button>
      {msg && <p className="text-sm text-indigo-300 break-all">{msg}</p>}
      <h2 className="text-lg font-bold">Âncoras ({rows.length})</h2>
      <div className="space-y-2">
        {rows.map((a, i) => (
          <div key={i} className="p-3 bg-gray-900 rounded border border-gray-800 text-xs break-all">
            <p className="font-semibold">{a.title} <span className={a.status === 'on-mainnet' ? 'text-green-400' : 'text-yellow-400'}>[{a.status}]</span></p>
            <p className="text-gray-500">hash: {a.contentHash}</p>
            <p className="text-gray-500">bloco: {a.blockHash}</p>
            <a className="text-indigo-300" href={'https://www.nanolooker.com/block/' + a.blockHash} target="_blank" rel="noopener">ver no NanoLooker ↗</a>
          </div>
        ))}
      </div>
    </main>
  )
}
