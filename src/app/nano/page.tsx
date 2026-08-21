'use client'
import { useEffect, useState } from 'react'
const N = ''
const raw = (n: number) => (BigInt(Math.round(n * 1e6)) * 10n ** 24n).toString()
export default function NanoPage() {
  const [treasury, setTreasury] = useState<any>(null)
  const [addr, setAddr] = useState('')
  const [myAddr, setMyAddr] = useState('')
  const [msg, setMsg] = useState('')
  const [user, setUser] = useState<any>(null)
  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem('nst_user') || 'null'))
    fetch(N + '/api/nano/treasury').then(r => r.json()).then(setTreasury).catch(() => {})
  }, [])
  useEffect(() => {
    if (user) fetch(N + '/api/nano/creator/' + user.username).then(r => r.json()).then(d => setMyAddr(d.address || '')).catch(() => {})
  }, [user])
  async function register(e: React.FormEvent) {
    e.preventDefault()
    if (!user) { setMsg('faça login primeiro'); return }
    const d = await fetch(N + '/api/nano/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: user.username, address: addr }) }).then(r => r.json())
    setMsg(d.ok ? '✅ endereço registrado (não-custodial: a chave é só sua)' : (d.error || 'erro'))
    if (d.ok) setMyAddr(addr)
  }
  const uri = (a: string, amt: number) => 'nano:' + a + '?amount=' + raw(amt)
  const target = myAddr || treasury?.address
  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Nano — Trilho Global de Pagamentos (feeless)</h1>
      <div className="p-3 bg-yellow-950 border border-yellow-800 rounded text-sm text-yellow-300">
        ⚠️ Não-custodial: a plataforma NUNCA guarda sua chave. NST mainnet segue GATEADA (Item 40). Sem promessa de ganhos (Item 61). Tesouraria inicia com saldo 0. Nota técnica: a rede nano não suporta tokens/smart contracts — o NST vive na chain NexaStream e esta ponte move valor em XNO com taxa zero (ver docs/NST_NANO_BRIDGE.md).
      </div>
      {treasury && (
        <div className="p-4 bg-gray-900 rounded border border-gray-800 text-sm break-all">
          <p className="font-semibold">Tesouraria da plataforma</p>
          <p className="text-gray-400">{treasury.address}</p>
          <p className="text-gray-500 mt-1">saldo: {treasury.balance_raw ? treasury.balance_raw + ' raw' : 'consulta RPC offline'} • <a className="text-indigo-300" href={'https://www.nanolooker.com/account/' + treasury.address} target="_blank" rel="noopener">ver no NanoLooker ↗</a></p>
        </div>
      )}
      <form onSubmit={register} className="p-4 bg-gray-900 rounded border border-gray-800 space-y-2">
        <p className="font-semibold text-sm">Registrar MEU endereço Nano (criador)</p>
        <input className="w-full p-2 rounded bg-gray-950 border border-gray-700 text-sm" placeholder="nano_..." value={addr} onChange={e => setAddr(e.target.value.trim())} required />
        <button className="w-full p-2 rounded bg-indigo-600 text-sm">Registrar (validação de checksum)</button>
        {myAddr && <p className="text-xs text-green-400 break-all">registrado: {myAddr}</p>}
        {msg && <p className="text-xs text-indigo-300">{msg}</p>}
      </form>
      {target && (
        <div className="p-4 bg-gray-900 rounded border border-gray-800 space-y-2">
          <p className="font-semibold text-sm">Apoiar este criador (gordura zero, taxa zero)</p>
          <div className="flex gap-2">
            <a className="px-3 py-2 rounded bg-green-700 text-sm" href={uri(target, 0.001)}>+0.001 NANO</a>
            <a className="px-3 py-2 rounded bg-green-700 text-sm" href={uri(target, 0.01)}>+0.01 NANO</a>
            <a className="px-3 py-2 rounded bg-green-700 text-sm" href={uri(target, 0.1)}>+0.1 NANO</a>
          </div>
          <p className="text-xs text-gray-500">Abre sua carteira Nano (Natrium etc.) via URI nano: — pagamento direto P2P, instantâneo, sem taxa.</p>
        </div>
      )}
    </main>
  )
}
