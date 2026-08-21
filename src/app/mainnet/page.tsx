'use client'
import { useEffect, useState } from 'react'
import { API } from '../../lib/api'

export default function MainnetPage() {
  const [chain, setChain] = useState<any>(null)
  const [explorer, setExplorer] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(API() + '/api/chain').then(r => r.json()).catch(() => null),
      fetch(API() + '/api/explorer/stats').then(r => r.json()).catch(() => null),
    ]).then(([c, e]) => {
      setChain(c)
      setExplorer(e)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <main className="p-6 max-w-3xl mx-auto">
      <div className="h-8 bg-gray-800 rounded animate-pulse mb-4" />
      <div className="h-40 bg-gray-800 rounded animate-pulse" />
    </main>
  )

  return (
    <main className="pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Status Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-green-950 to-emerald-950 border border-green-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            <h1 className="text-xl font-bold">NST MAINNET — ATIVA</h1>
          </div>
          <p className="text-sm text-green-300">
            Lançamento com auditoria comunitária. Usuários são auditores independentes da plataforma de vídeo.
          </p>
        </div>

        {/* Chain Info */}
        {chain && (
          <div className="p-5 bg-gray-900 rounded-2xl border border-gray-800">
            <h2 className="font-bold mb-3">Blockchain NST</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Altura</p>
                <p className="text-xl font-bold">{chain.height ?? '—'}</p>
              </div>
              <div>
                <p className="text-gray-400">Dificuldade</p>
                <p className="text-xl font-bold">{chain.difficulty ?? '—'}</p>
              </div>
              <div>
                <p className="text-gray-400">Recompensa</p>
                <p className="text-xl font-bold">{chain.reward ?? '—'} NST</p>
              </div>
              <div>
                <p className="text-gray-400">Supply Total</p>
                <p className="text-xl font-bold">{chain.totalSupply?.toLocaleString() ?? '—'}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-[10px] px-2 py-1 rounded-full bg-green-900 text-green-300">MAINNET</span>
              <span className="text-[10px] px-2 py-1 rounded-full bg-indigo-900 text-indigo-300">PoW-secp256k1</span>
              <span className="text-[10px] px-2 py-1 rounded-full bg-purple-900 text-purple-300">55M MAX</span>
            </div>
          </div>
        )}

        {/* Explorer Stats */}
        {explorer && (
          <div className="p-5 bg-gray-900 rounded-2xl border border-gray-800">
            <h2 className="font-bold mb-3">Estatísticas</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Carteiras</p>
                <p className="text-lg font-bold">{explorer.totalWallets ?? 0}</p>
              </div>
              <div>
                <p className="text-gray-400">Endereços Ativos</p>
                <p className="text-lg font-bold">{explorer.activeAddresses ?? 0}</p>
              </div>
              <div>
                <p className="text-gray-400">Mempool</p>
                <p className="text-lg font-bold">{explorer.mempoolSize ?? 0}</p>
              </div>
              <div>
                <p className="text-gray-400">Tempo Médio/Bloco</p>
                <p className="text-lg font-bold">{explorer.avgBlockTimeMs ? (explorer.avgBlockTimeMs / 1000).toFixed(1) + 's' : '—'}</p>
              </div>
              <div>
                <p className="text-gray-400">Recompensas Dadas</p>
                <p className="text-lg font-bold">{explorer.rewards?.count ?? 0}</p>
              </div>
              <div>
                <p className="text-gray-400">Bindings Criador</p>
                <p className="text-lg font-bold">{explorer.bindings ?? 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* Security Model */}
        <div className="p-5 bg-gray-900 rounded-2xl border border-gray-800">
          <h2 className="font-bold mb-3">Modelo de Segurança</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <div>
                <p className="font-semibold">Criptografia padrão (Item 15)</p>
                <p className="text-gray-400">secp256k1 ECDSA + SHA-256 — nada proprietário</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <div>
                <p className="font-semibold">Supply máximo fixo</p>
                <p className="text-gray-400">55.000.000 NST —硬编码 no genesis, verificável</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <div>
                <p className="font-semibold">Verificação de cadeia</p>
                <p className="text-gray-400">GET /api/chain/verify — qualquer pessoa pode validar</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <div>
                <p className="font-semibold">Auditoria comunitária (Item 62)</p>
                <p className="text-gray-400">Usuários são auditores independentes. Código aberto. Revisão por参加者.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-3">
          <a href="/nano" className="p-4 bg-gray-900 rounded-xl border border-gray-800 text-center hover:bg-gray-800 transition">
            <p className="text-2xl mb-1">🪙</p>
            <p className="text-sm font-semibold">Nano Treasury</p>
            <p className="text-[10px] text-gray-500">Pagamentos feeless</p>
          </a>
          <a href="/swap" className="p-4 bg-gray-900 rounded-xl border border-gray-800 text-center hover:bg-gray-800 transition">
            <p className="text-2xl mb-1">🔄</p>
            <p className="text-sm font-semibold">Swap NST</p>
            <p className="text-[10px] text-gray-500">NST ↔ NANO</p>
          </a>
          <a href="/dao" className="p-4 bg-gray-900 rounded-xl border border-gray-800 text-center hover:bg-gray-800 transition">
            <p className="text-2xl mb-1">🏛️</p>
            <p className="text-sm font-semibold">DAO</p>
            <p className="text-[10px] text-gray-500">Governança</p>
          </a>
          <a href="/nft" className="p-4 bg-gray-900 rounded-xl border border-gray-800 text-center hover:bg-gray-800 transition">
            <p className="text-2xl mb-1">🖼️</p>
            <p className="text-sm font-semibold">NFTs</p>
            <p className="text-[10px] text-gray-500">Marketplace</p>
          </a>
        </div>

        {/* Honest Disclaimer */}
        <div className="p-4 bg-yellow-950/50 border border-yellow-900 rounded-xl text-xs text-yellow-300">
          <p className="font-semibold mb-1">⚠️ Transparência (Item 61)</p>
          <ul className="space-y-1 text-yellow-400/80">
            <li>• NST não é investimento. Não há promessa de ganhos.</li>
            <li>• Possuir NFT ≠ propriedade de direitos autorais (Item 19).</li>
            <li>• Rede em evolução. Use por sua conta e risco.</li>
            <li>• Auditoria comunitária: qualquer pessoa pode verificar o código e a cadeia.</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
