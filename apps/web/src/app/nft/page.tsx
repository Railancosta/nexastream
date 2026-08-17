'use client'
import { useEffect, useState } from 'react'
const NFT = 'http://localhost:3016'
export default function NftPage() {
  const [nfts, setNfts] = useState<any[]>([])
  const [market, setMarket] = useState<any[]>([])
  const [videoId, setVideoId] = useState('')
  const [msg, setMsg] = useState('')
  const wallet = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('nst_wallet') || 'null') : null
  const load = () => {
    fetch(NFT + '/api/nft/market').then(r => r.json()).then(d => setMarket(d.listings || []))
    fetch(NFT + '/api/nft/audit').then(() => {})
  }
  useEffect(load, [])
  async function mint(e: React.FormEvent) {
    e.preventDefault()
    if (!wallet) { setMsg('Crie uma carteira em /wallet primeiro'); return }
    const d = await fetch(NFT + '/api/nft/mint', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId, creator: wallet.address }) }).then(r => r.json())
    setMsg(d.notice ? 'NFT #' + d.tokenId + ' mintado • ' + d.notice : d.error)
    load()
  }
  async function buy(tokenId: number) {
    if (!wallet) { setMsg('Crie uma carteira em /wallet primeiro'); return }
    const d = await fetch(NFT + '/api/nft/buy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tokenId, buyer: wallet.address }) }).then(r => r.json())
    setMsg(d.ok ? 'Compra concluida: NFT #' + tokenId : d.error)
    load()
  }
  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">NFTs + Marketplace (Item 19)</h1>
      <p className="text-xs text-yellow-400 bg-yellow-950 border border-yellow-800 p-2 rounded">⚠️ TOKEN OWNERSHIP ≠ COPYRIGHT OWNERSHIP: possuir um NFT não concede copyright do vídeo.</p>
      <form onSubmit={mint} className="p-4 bg-gray-900 rounded border border-gray-800 space-y-2">
        <input className="w-full p-2 rounded bg-gray-950 border border-gray-700" placeholder="ID do vídeo" value={videoId} onChange={e => setVideoId(e.target.value)} required />
        <button className="w-full p-2 rounded bg-indigo-600 font-semibold">Mintar NFT do vídeo</button>
      </form>
      {msg && <p className="text-sm text-indigo-300">{msg}</p>}
      <div>
        <h2 className="text-lg font-bold mb-2">Marketplace ({market.length})</h2>
        {market.length === 0 && <p className="text-gray-500 text-sm">Nenhuma listing ativa.</p>}
        <div className="space-y-2">
          {market.map(l => (
            <div key={l.token_id} className="p-3 bg-gray-900 rounded border border-gray-800 flex justify-between items-center text-sm">
              <div>
                <p className="font-semibold">NFT #{l.token_id} • {l.price} NST</p>
                <p className="text-xs text-gray-500">vendedor: {l.seller.slice(0, 10)}... • vídeo: {l.video_id.slice(0, 8)}...</p>
              </div>
              <button onClick={() => buy(l.token_id)} className="px-3 py-1 rounded bg-green-700 text-xs">Comprar</button>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
