'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
export default function VideoPage() {
  const { id } = useParams()
  const [v, setV] = useState<any>(null)
  const [reward, setReward] = useState('')
  useEffect(() => {
    fetch('http://localhost:3002/api/videos/' + id).then(r => r.json()).then(d => setV(d.video)).catch(() => {})
  }, [id])
  useEffect(() => {
    if (!v) return
    let viewer = localStorage.getItem('nst_viewer')
    if (!viewer) { viewer = 'viewer-' + Math.random().toString(36).slice(2, 10); localStorage.setItem('nst_viewer', viewer) }
    fetch('http://localhost:3009/api/explorer/reward', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: String(id), viewerId: viewer }) })
      .then(r => r.json())
      .then(d => setReward(d.txId ? '✅ +1 NST enviado ao criador (tx ' + d.txId.slice(0, 12) + '...)' : 'ℹ️ ' + d.error))
      .catch(() => {})
  }, [v])
  if (!v) return <p className="p-6">Carregando...</p>
  return (
    <main className="p-6 max-w-4xl mx-auto">
      <video controls className="w-full rounded-lg bg-black" src={'http://localhost:3002' + v.video_path} />
      <h1 className="text-xl font-bold mt-4">{v.title}</h1>
      <p className="text-sm text-gray-400 mt-1">{v.views} visualizações</p>
      {reward && <p className="text-sm text-indigo-300 mt-2">{reward}</p>}
      <p className="mt-4 whitespace-pre-wrap text-gray-300">{v.description}</p>
    </main>
  )
}
