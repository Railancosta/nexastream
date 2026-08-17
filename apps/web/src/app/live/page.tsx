'use client'
import { useEffect, useState } from 'react'
const LIVE = 'http://localhost:3013'
export default function LivePage() {
  const [streams, setStreams] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [watch, setWatch] = useState<string | null>(null)
  const load = () => fetch(LIVE + '/api/live/streams').then(r => r.json()).then(d => setStreams(d.streams || [])).catch(() => {})
  useEffect(() => { load(); const t = setInterval(load, 3000); return () => clearInterval(t) }, [])
  async function start(e: React.FormEvent) {
    e.preventDefault()
    await fetch(LIVE + '/api/live/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: title || 'Minha live' }) })
    load()
  }
  async function stop(id: string) {
    await fetch(LIVE + '/api/live/stop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }
  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Live Streaming (HLS)</h1>
      {watch && (
        <div>
          <video controls autoPlay className="w-full rounded-lg bg-black" src={LIVE + watch} />
          <p className="text-xs text-gray-500 mt-1">Reproduzindo {watch} (HLS ao vivo; após o stop vira replay)</p>
        </div>
      )}
      <form onSubmit={start} className="flex gap-2">
        <input className="flex-1 p-2 rounded bg-gray-900 border border-gray-700" placeholder="título da live" value={title} onChange={e => setTitle(e.target.value)} />
        <button className="px-4 py-2 rounded bg-red-600 font-semibold">Iniciar live</button>
      </form>
      <div className="space-y-2">
        {streams.map(s => (
          <div key={s.id} className="p-3 bg-gray-900 rounded border border-gray-800 flex justify-between items-center text-sm">
            <div>
              <p className="font-semibold">{s.title} {s.status === 'live' ? <span className="text-red-400">● AO VIVO</span> : <span className="text-gray-500">■ encerrada (VOD)</span>}</p>
              <p className="text-xs text-gray-500">canal: {s.channel}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setWatch(s.url)} className="px-3 py-1 rounded bg-indigo-600">Assistir</button>
              {s.status === 'live' && <button onClick={() => stop(s.id)} className="px-3 py-1 rounded bg-gray-700">Encerrar</button>}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
