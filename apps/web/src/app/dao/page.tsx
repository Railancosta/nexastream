'use client'
import { useEffect, useState } from 'react'
const DAO = 'http://localhost:3015'
export default function DaoPage() {
  const [rows, setRows] = useState<any[]>([])
  const [treasury, setTreasury] = useState(0)
  const [title, setTitle] = useState(''); const [amount, setAmount] = useState('')
  const [voter, setVoter] = useState('')
  useEffect(() => {
    const w = JSON.parse(localStorage.getItem('nst_wallet') || 'null')
    if (w) setVoter(w.address)
    load()
  }, [])
  function load() {
    fetch(DAO + '/api/dao/proposals').then(r => r.json()).then(d => setRows(d.proposals || []))
    fetch(DAO + '/api/dao/treasury').then(r => r.json()).then(d => setTreasury(d.balance))
  }
  async function propose(e: React.FormEvent) {
    e.preventDefault()
    await fetch(DAO + '/api/dao/proposal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, proposer: voter, type: amount ? 'spend' : 'general', amount: Number(amount || 0), to_addr: 'dev-fund', durationH: 24, timelockH: 24 }) })
    setTitle(''); setAmount(''); load()
  }
  async function vote(id: string, choice: string) {
    await fetch(DAO + '/api/dao/vote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proposalId: id, voter, choice }) })
    load()
  }
  async function tally(id: string) { await fetch(DAO + '/api/dao/tally', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proposalId: id }) }); load() }
  async function execute(id: string) { await fetch(DAO + '/api/dao/execute', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ proposalId: id }) }); load() }
  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">DAO Governance (Item 18)</h1>
        <p className="text-sm text-indigo-300">Tesouraria: {treasury} NST</p>
      </div>
      <form onSubmit={propose} className="p-4 bg-gray-900 rounded border border-gray-800 space-y-2">
        <input className="w-full p-2 rounded bg-gray-950 border border-gray-700" placeholder="titulo da proposta" value={title} onChange={e => setTitle(e.target.value)} required />
        <input className="w-full p-2 rounded bg-gray-950 border border-gray-700" type="number" placeholder="valor NST (opcional, vira spend)" value={amount} onChange={e => setAmount(e.target.value)} />
        <button className="w-full p-2 rounded bg-indigo-600 font-semibold">Criar proposta</button>
      </form>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="p-3 bg-gray-900 rounded border border-gray-800 text-sm">
            <p className="font-semibold">{r.title} <span className="text-xs text-gray-500">[{r.status}]</span></p>
            <p className="text-xs text-gray-400 mt-1">👍 {r.yes} NST • 👎 {r.no} NST {r.result ? '• ' + r.result : ''}</p>
            <div className="flex gap-2 mt-2">
              <button onClick={() => vote(r.id, 'yes')} className="px-3 py-1 rounded bg-green-700 text-xs">Votar SIM</button>
              <button onClick={() => vote(r.id, 'no')} className="px-3 py-1 rounded bg-red-700 text-xs">Votar NÃO</button>
              <button onClick={() => tally(r.id)} className="px-3 py-1 rounded bg-gray-700 text-xs">Apurar</button>
              <button onClick={() => execute(r.id)} className="px-3 py-1 rounded bg-gray-700 text-xs">Executar (pós-timelock)</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
