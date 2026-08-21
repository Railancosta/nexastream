'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { API } from '../../../lib/api'

interface Balance {
  usd_balance: number; nst_balance: number; total_earned: number; total_paid: number
}

interface Network {
  id: string; name: string; symbol: string; needsMemo: boolean
}

interface Payout {
  id: string; amount_nst: number; amount_usd: number; dest_address: string
  dest_network: string; status: string; tx_hash?: string; timelock_until?: string
  created_at: number
}

const STEPS = ['amount', 'network', 'address', 'review', 'confirm']

export default function FinancePage() {
  const { user, token } = useAuth()
  const [balance, setBalance] = useState<Balance>({ usd_balance: 0, nst_balance: 0, total_earned: 0, total_paid: 0 })
  const [networks, setNetworks] = useState<Network[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [loading, setLoading] = useState(true)

  // Withdrawal wizard state
  const [step, setStep] = useState(0)
  const [amount, setAmount] = useState('')
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null)
  const [destAddress, setDestAddress] = useState('')
  const [destMemo, setDestMemo] = useState('')
  const [addressValid, setAddressValid] = useState<boolean | null>(null)
  const [addressError, setAddressError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  async function loadData() {
    try {
      const [balRes, netRes, payRes] = await Promise.all([
        fetch(API() + '/api/ledger/balance/' + user?.username),
        fetch(API() + '/api/ledger/networks'),
        fetch(API() + '/api/ledger/payouts?creator=' + user?.username),
      ])
      const bal = await balRes.json()
      const nets = await netRes.json()
      const pays = await payRes.json()
      setBalance(bal.balance || { usd_balance: 0, nst_balance: 0, total_earned: 0, total_paid: 0 })
      setNetworks(nets.networks || [])
      setPayouts(pays.payouts || [])
    } catch (e) {
      console.error('Failed to load finance data:', e)
    } finally {
      setLoading(false)
    }
  }

  async function validateAddress(addr: string, network: string) {
    if (!addr) { setAddressValid(null); setAddressError(''); return }
    try {
      const r = await fetch(API() + `/api/ledger/validate-address?address=${encodeURIComponent(addr)}&network=${network}`)
      const d = await r.json()
      setAddressValid(d.valid)
      setAddressError(d.valid ? '' : d.reason)
      if (d.valid && d.needsMemo) {
        // Memo field will be shown
      }
    } catch {
      setAddressValid(null)
      setAddressError('Erro ao validar')
    }
  }

  async function submitPayout() {
    if (!user || !selectedNetwork || !amount || !destAddress) return
    setSubmitting(true)
    try {
      const r = await fetch(API() + '/api/ledger/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator: user.username,
          amountNst: parseFloat(amount),
          destAddress,
          destNetwork: selectedNetwork.id,
          destAsset: selectedNetwork.symbol,
        })
      })
      const d = await r.json()
      setResult(d)
      if (!d.error) {
        setStep(4)
        loadData() // Refresh balance
      }
    } catch (e) {
      setResult({ error: 'Erro ao processar saque' })
    } finally {
      setSubmitting(false)
    }
  }

  function resetWizard() {
    setStep(0); setAmount(''); setSelectedNetwork(null); setDestAddress(''); setDestMemo('')
    setAddressValid(null); setAddressError(''); setResult(null)
  }

  if (!user) return (
    <main className="p-6 max-w-3xl mx-auto text-center py-20">
      <p className="text-gray-400 mb-4">Faça login para acessar suas finanças.</p>
      <a href="/login" className="px-6 py-3 rounded-full bg-indigo-600 font-semibold">Entrar</a>
    </main>
  )

  if (loading) return <main className="p-6 max-w-3xl mx-auto"><div className="h-40 bg-gray-800 rounded animate-pulse" /></main>

  return (
    <main className="pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">💰 Finanças do Criador</h1>
          <a href="/studio" className="text-sm text-indigo-400">← Voltar ao Studio</a>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
            <p className="text-xs text-gray-400">Saldo Disponível</p>
            <p className="text-xl font-bold text-green-400">${balance.usd_balance.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
            <p className="text-xs text-gray-400">Total Ganho</p>
            <p className="text-xl font-bold">${balance.total_earned.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
            <p className="text-xs text-gray-400">Total Sacado</p>
            <p className="text-xl font-bold text-gray-500">${balance.total_paid.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
            <p className="text-xs text-gray-400">Split</p>
            <p className="text-xl font-bold text-indigo-400">50/50</p>
            <p className="text-[10px] text-gray-500">Criador / NexaStream</p>
          </div>
        </div>

        {/* Withdrawal Wizard */}
        <div className="p-6 bg-gray-900 rounded-2xl border border-gray-800">
          <h2 className="font-bold mb-4">Sacar Ganhos</h2>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mb-6">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < step ? 'bg-green-600' : i === step ? 'bg-indigo-600' : 'bg-gray-800 text-gray-500'
                }`}>{i < step ? '✓' : i + 1}</div>
                {i < STEPS.length - 1 && <div className={`w-8 h-0.5 ${i < step ? 'bg-green-600' : 'bg-gray-800'}`} />}
              </div>
            ))}
          </div>

          {/* Step 0: Amount */}
          {step === 0 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">Quanto deseja sacar? (mínimo $1, máximo ${balance.usd_balance.toFixed(2)})</p>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-400">$</span>
                <input type="number" min="1" max={balance.usd_balance} step="0.01"
                  value={amount} onChange={e => setAmount(e.target.value)}
                  className="w-full pl-8 p-3 rounded-xl bg-gray-950 border border-gray-700 text-lg font-bold"
                  placeholder="0.00" />
              </div>
              <div className="flex gap-2">
                {[10, 50, 100, 'MAX'].map(v => (
                  <button key={String(v)} onClick={() => setAmount(v === 'MAX' ? String(balance.usd_balance) : String(v))}
                    className="px-3 py-1 rounded-lg bg-gray-800 text-sm hover:bg-gray-700">
                    {v === 'MAX' ? 'Tudo' : `$${v}`}
                  </button>
                ))}
              </div>
              {amount && parseFloat(amount) > 0 && parseFloat(amount) <= balance.usd_balance && (
                <button onClick={() => setStep(1)} className="w-full p-3 rounded-xl bg-indigo-600 font-semibold">Continuar →</button>
              )}
            </div>
          )}

          {/* Step 1: Network */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">Escolha a rede e criptomoeda:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {networks.map(n => (
                  <button key={n.id} onClick={() => { setSelectedNetwork(n); setStep(2) }}
                    className={`p-3 rounded-xl border text-left transition ${
                      selectedNetwork?.id === n.id ? 'border-indigo-500 bg-indigo-950' : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}>
                    <p className="font-semibold">{n.symbol}</p>
                    <p className="text-xs text-gray-400">{n.name}</p>
                    {n.needsMemo && <p className="text-[10px] text-yellow-400 mt-1">⚠️ Exige Memo/Tag</p>}
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(0)} className="text-sm text-gray-400">← Voltar</button>
            </div>
          )}

          {/* Step 2: Address */}
          {step === 2 && selectedNetwork && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Endereço de destino ({selectedNetwork.name}):
                {selectedNetwork.needsMemo && <span className="text-yellow-400 ml-1">⚠️ Esta rede exige Memo/Destination Tag</span>}
              </p>
              <input type="text" value={destAddress} onChange={e => { setDestAddress(e.target.value); validateAddress(e.target.value, selectedNetwork.id) }}
                className="w-full p-3 rounded-xl bg-gray-950 border border-gray-700 font-mono text-sm"
                placeholder={`Endereço ${selectedNetwork.symbol}...`}
              />
              {addressError && <p className="text-xs text-red-400">{addressError}</p>}
              {addressValid === true && <p className="text-xs text-green-400">✓ Endereço válido</p>}

              {selectedNetwork.needsMemo && (
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Memo / Destination Tag (obrigatório para exchanges)</label>
                  <input type="text" value={destMemo} onChange={e => setDestMemo(e.target.value)}
                    className="w-full p-3 rounded-xl bg-gray-950 border border-gray-700 text-sm"
                    placeholder="Ex: 12345678 (verifique na exchange)" />
                  <p className="text-[10px] text-yellow-400 mt-1">Sem o Memo, fundos podem ser perdidos na exchange.</p>
                </div>
              )}

              {addressValid && (
                <button onClick={() => setStep(3)} className="w-full p-3 rounded-xl bg-indigo-600 font-semibold">Revisar Saque →</button>
              )}
              <button onClick={() => setStep(1)} className="text-sm text-gray-400">← Voltar</button>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && selectedNetwork && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-950 rounded-xl border border-gray-700 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Valor</span><span className="font-bold">${parseFloat(amount).toFixed(2)} USD</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Rede</span><span>{selectedNetwork.name} ({selectedNetwork.symbol})</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Endereço</span><span className="font-mono text-xs break-all">{destAddress}</span></div>
                {destMemo && <div className="flex justify-between"><span className="text-gray-400">Memo</span><span>{destMemo}</span></div>}
                <div className="flex justify-between border-t border-gray-700 pt-2">
                  <span className="text-gray-400">Taxa de rede (estimada)</span><span className="text-yellow-400">Variável por rede</span>
                </div>
              </div>

              <div className="p-3 bg-yellow-950/50 border border-yellow-900 rounded-xl text-xs text-yellow-300">
                <p className="font-semibold mb-1">⚠️ Aviso Importante</p>
                <p>A NexaStream utiliza agregadores de liquidez de terceiros para converter seus ganhos. As taxas de rede (gas) e slippage são determinados pelas blockchains de destino.</p>
                {parseFloat(amount) >= 10000 && (
                  <p className="mt-2 text-yellow-200">🔒 Saque acima de $10.000 terá timelock de 24h por segurança.</p>
                )}
              </div>

              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="flex-1 p-3 rounded-xl bg-gray-800">← Voltar</button>
                <button onClick={submitPayout} disabled={submitting}
                  className="flex-1 p-3 rounded-xl bg-indigo-600 font-semibold disabled:opacity-50">
                  {submitting ? 'Processando...' : 'Confirmar Saque'}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Result */}
          {step === 4 && result && (
            <div className="space-y-4 text-center">
              {result.error ? (
                <>
                  <div className="text-4xl">❌</div>
                  <p className="text-red-400 font-semibold">{result.error}</p>
                </>
              ) : (
                <>
                  <div className="text-4xl">✅</div>
                  <p className="font-semibold text-green-400">Saque solicitado com sucesso!</p>
                  <p className="text-sm text-gray-400">ID: {result.id}</p>
                  {result.timelock && (
                    <p className="text-sm text-yellow-400">🔒 Timelock: liberado em {new Date(result.timelock).toLocaleString('pt-BR')}</p>
                  )}
                </>
              )}
              <button onClick={resetWizard} className="px-6 py-3 rounded-xl bg-indigo-600 font-semibold">Novo Saque</button>
            </div>
          )}
        </div>

        {/* Payout History */}
        <div className="p-6 bg-gray-900 rounded-2xl border border-gray-800">
          <h2 className="font-bold mb-4">Histórico de Saques</h2>
          {payouts.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum saque realizado ainda.</p>
          ) : (
            <div className="space-y-2">
              {payouts.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-950 rounded-xl border border-gray-800 text-sm">
                  <div>
                    <p className="font-semibold">${p.amount_usd.toFixed(2)} → {p.dest_network}</p>
                    <p className="text-xs text-gray-400 font-mono">{p.dest_address.slice(0, 12)}...{p.dest_address.slice(-6)}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      p.status === 'completed' ? 'bg-green-900 text-green-300' :
                      p.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-red-900 text-red-300'
                    }`}>{p.status}</span>
                    <p className="text-[10px] text-gray-500 mt-1">{new Date(p.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="p-4 bg-yellow-950/30 border border-yellow-900/50 rounded-xl text-[11px] text-yellow-400/70">
          <p className="font-semibold mb-1">Disclaimer</p>
          <p>A NexaStream é uma plataforma de vídeo e infraestrutura P2P. O saque em criptomoedas é uma facilidade de liquidez (Swap Gateway) oferecida via parceiros. A NexaStream não é uma exchange.</p>
        </div>
      </div>
    </main>
  )
}
