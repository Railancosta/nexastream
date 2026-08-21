'use client'
import { useEffect, useState } from 'react'
const S = ''
export default function SwapPage() {
  const [proof, setProof] = useState<any>(null)
  const [nst, setNst] = useState('100')
  const [dest, setDest] = useState('')
  const [quote, setQuote] = useState<any>(null)
  const [msg, setMsg] = useState('')
  const [swaps, setSwaps] = useState<any[]>([])
  const load = () => { fetch(S + '/api/swap/proof').then(r => r.json()).then(setProof).catch(() => {}); fetch(S + '/api/swap/list').then(r => r.json()).then(d => setSwaps(d.swaps || [])).catch(() => {}) }
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t) }, [])
  useEffect(() => { fetch(S + '/api/swap/quote?nst=' + (Number(nst) || 0)).then(r => r.json()).then(setQuote).catch(() => {}) }, [nst])
  async function request() { const d = await fetch(S + '/api/swap/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: 'user-demo', nstAmount: Number(nst), destNano: dest }) }).then(r => r.json()); setMsg(d.id ? 'Swap criado: ' + d.id + ' — precisa de ' + d.attestations_needed + ' auditores' : d.error); load() }
  async function attest(id: string) { await fetch(S + '/api/swap/attest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ swapId: id, auditor: 'auditor-' + Math.random().toString(36).slice(2, 7) }) }).then(r => r.json()).then(d => setMsg('Attestações: ' + d.attestations + '/' + d.quorum)); load() }
  async function release(id: string) { const d = await fetch(S + '/api/swap/release', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ swapId: id }) }).then(r => r.json()); setMsg(d.status === 'released' ? '✅ Liberado em tempo real: ' + d.nano_tx : d.error); load() }
  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Swap NST ↔ Nano + Retirada Externa</h1>
      <div className="p-3 bg-yellow-950 border border-yellow-800 rounded text-sm text-yellow-300">
        ⚠️ Ponte <b>custodial</b> operada pela comunidade, <b>sem auditoria profissional externa</b>.
        Os usuários são os auditores (attestação + prova de reservas). Verifique você mesmo abaixo. Use por sua conta e risco.
      </div>
      {proof && (
        <div className="p-4 bg-gray-900 rounded border border-gray-800 text-sm space-y-1">
          <p className="font-semibold">Prova de Reservas (verifique em tempo real)</p>
          <p>Reserva Nano: <b>{proof.nano_reserve}</b> · NST bloqueado: <b>{proof.nst_locked}</b> · Necessário: <b>{proof.required_nano}</b></p>
          <p className={proof.solvent ? 'text-green-400' : 'text-red-400'}>{proof.solvent ? '✅ SOLVENTE' : '❌ INSOLVENTE'} · Quórum: {proof.quorum} · Timelock: {proof.timelock_s}s</p>
        </div>
      )}
      <div className="p-4 bg-gray-900 rounded border border-gray-800 space-y-2">
        <input className="w-full p-2 rounded bg-gray-950 border border-gray-700" type="number" value={nst} onChange={e => setNst(e.target.value)} />
        <p className="text-sm text-gray-400">≈ {quote?.nano} NANO (taxa {quote?.rate})</p>
        <input className="w-full p-2 rounded bg-gray-950 border border-gray-700" placeholder="nano_... (carteira externa / exchange)" value={dest} onChange={e => setDest(e.target.value)} />
        <button className="w-full p-2 rounded bg-indigo-600" onClick={request}>Solicitar swap + retirada</button>
        {msg && <p className="text-sm text-indigo-300">{msg}</p>}
      </div>
      <div className="space-y-2">
        {swaps.map(s => (
          <div key={s.id} className="p-3 bg-gray-900 rounded border border-gray-800 text-sm flex justify-between items-center">
            <div><p className="font-semibold">{s.nst_amount} NST → {s.nano_amount} NANO</p><p className="text-xs text-gray-500">{s.status} · att: {s.attestations}/{proof?.quorum || 3}</p></div>
            <div className="flex gap-2">
              <button className="px-2 py-1 rounded bg-gray-700 text-xs" onClick={() => attest(s.id)}>Auditar</button>
              <button className="px-2 py-1 rounded bg-green-700 text-xs" onClick={() => release(s.id)}>Liberar</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
