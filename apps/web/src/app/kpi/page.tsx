'use client'
import { useEffect, useState } from 'react'
export default function KpiPage() {
  const [k, setK] = useState<any>(null)
  useEffect(() => { fetch('/api/kpi').then(r => r.json()).then(setK).catch(() => {}) }, [])
  if (!k) return <p className="p-6">Carregando KPIs...</p>
  const Card = ({ t, rows }: { t: string; rows: [string, any][] }) => (
    <div className="p-4 bg-gray-900 rounded border border-gray-800">
      <h2 className="font-bold mb-2">{t}</h2>
      {rows.map(([label, v]) => (
        <p key={label} className="text-sm flex justify-between"><span className="text-gray-400">{label}</span><span>{v === null ? 'não medido' : String(v)}</span></p>
      ))}
    </div>
  )
  return (
    <main className="p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">KPIs & Unit Economics (Itens 33/44)</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card t="Plataforma" rows={[['usuários', k.platform.users], ['criadores', k.platform.creators], ['uploads', k.platform.uploads], ['views totais', k.platform.total_views], ['inscrições', k.platform.subscriptions], ['watch hours', k.platform.watch_hours]]} />
        <Card t="Economia" rows={[['payout criadores (NST)', k.economy.creator_payout_nst], ['receita (USD)', k.economy.revenue_usd], ['storage (GB)', k.economy.storage_gb], ['custo storage ref. (USD/mês)', k.economy.storage_cost_ref_usd_month], ['margem plataforma (USD)', k.economy.platform_margin_usd], ['volume NFT (NST)', k.economy.nft_volume_nst], ['tesouraria DAO (NST)', k.economy.dao_treasury_nst]]} />
        <Card t="Blockchain" rows={[['blocos', k.blockchain.blocks], ['transações', k.blockchain.txs], ['supply máximo', k.blockchain.supply_max_nst]]} />
        <Card t="Segurança" rows={[['denúncias', k.safety.reports], ['vídeos removidos', k.safety.videos_removed], ['fraud loss medido (NST)', k.safety.fraud_loss_nst_measured]]} />
      </div>
      <div className="p-4 bg-yellow-950 border border-yellow-800 rounded text-sm text-yellow-300 space-y-1">
        {k.notes.map((n: string, i: number) => <p key={i}>⚠️ {n}</p>)}
      </div>
    </main>
  )
}
