'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
const API = 'http://localhost:3002'
const SOC = 'http://localhost:3011'
const MOD = 'http://localhost:3014'
export default function VideoPage() {
  const { id } = useParams()
  const [v, setV] = useState<any>(null)
  const [st, setSt] = useState('ok')
  const [channel, setChannel] = useState('')
  const [sub, setSub] = useState(false)
  const [comments, setComments] = useState<any[]>([])
  const [text, setText] = useState('')
  const [user, setUser] = useState<any>(null)
  const [reward, setReward] = useState('')
  useEffect(() => { setUser(JSON.parse(localStorage.getItem('nst_user') || 'null')) }, [])
  useEffect(() => {
    fetch(API + '/api/videos/' + id).then(r => r.json()).then(d => setV(d.video)).catch(() => {})
    fetch(MOD + '/api/mod/status/' + id).then(r => r.json()).then(d => setSt(d.status)).catch(() => {})
    fetch(SOC + '/api/social/channel?videoId=' + id).then(r => r.json()).then(d => setChannel(d.channel || '')).catch(() => {})
    fetch(SOC + '/api/social/comments?videoId=' + id).then(r => r.json()).then(setComments).catch(() => {})
  }, [id])
  useEffect(() => {
    if (!user || !channel) return
    fetch(SOC + '/api/social/subscribed?subscriber=' + user.username + '&channel=' + channel).then(r => r.json()).then(d => setSub(d.subscribed)).catch(() => {})
  }, [user, channel])
  useEffect(() => {
    if (!v || st !== 'ok') return
    let viewer = localStorage.getItem('nst_viewer')
    if (!viewer) { viewer = 'viewer-' + Math.random().toString(36).slice(2, 10); localStorage.setItem('nst_viewer', viewer) }
    fetch('http://localhost:3009/api/explorer/reward', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: String(id), viewerId: viewer }) })
      .then(r => r.json()).then(d => setReward(d.txId ? '✅ +1 NST ao criador' : 'ℹ️ ' + d.error)).catch(() => {})
  }, [v, st])
  async function toggleSub() {
    if (!user) { alert('Faça login primeiro'); return }
    const r = await fetch(SOC + (sub ? '/api/social/unsubscribe' : '/api/social/subscribe'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subscriber: user.username, channel }) }).then(x => x.json())
    setSub(r.subscribed)
  }
  async function sendComment(e: React.FormEvent) {
    e.preventDefault()
    if (!user) { alert('Faça login primeiro'); return }
    await fetch(SOC + '/api/social/comment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ videoId: String(id), username: user.username, content: text }) })
    setText('')
    fetch(SOC + '/api/social/comments?videoId=' + id).then(r => r.json()).then(setComments)
  }
  async function report() {
    const reason = prompt('Motivo da denúncia:')
    if (!reason) return
    await fetch(MOD + '/api/mod/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetType: 'video', targetId: String(id), reason, reporter: user ? user.username : 'anon' }) })
    alert('Denúncia registrada (3 denúncias = auto-review)')
  }
  if (st === 'removed') return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="p-6 bg-gray-900 border border-red-800 rounded text-red-300">🚫 Este vídeo foi removido pela moderação (Item 31 — creator enforcement).</div>
    </main>
  )
  if (!v) return <p className="p-6">Carregando...</p>
  return (
    <main className="p-6 max-w-4xl mx-auto">
      <video controls className="w-full rounded-lg bg-black" src={API + v.video_path} />
      <div className="flex justify-between items-center mt-4 flex-wrap gap-2">
        <h1 className="text-xl font-bold">{v.title}</h1>
        <button onClick={report} className="px-3 py-1 rounded bg-gray-800 text-xs text-red-300">⚠️ Denunciar</button>
      </div>
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        <p className="text-sm text-gray-400">{v.views} visualizações {reward && <span className="text-indigo-300">• {reward}</span>}</p>
        {channel && (<>
          <span className="text-sm text-gray-300">• Canal: <b>{channel}</b></span>
          <button onClick={toggleSub} className={'px-3 py-1 rounded text-sm ' + (sub ? 'bg-gray-700' : 'bg-indigo-600')}>{sub ? 'Inscrito ✓' : 'Inscrever-se'}</button>
        </>)}
      </div>
      <h2 className="text-lg font-bold mt-6 mb-2">Comentários ({comments.length})</h2>
      <form onSubmit={sendComment} className="flex gap-2 mb-4">
        <input className="flex-1 p-2 rounded bg-gray-900 border border-gray-700" placeholder={user ? 'Comentar...' : 'Faça login para comentar'} value={text} onChange={e => setText(e.target.value)} required />
        <button className="px-4 py-2 rounded bg-indigo-600">Enviar</button>
      </form>
      <div className="space-y-2">
        {comments.map(c => (
          <div key={c.id} className="p-3 bg-gray-900 rounded border border-gray-800 text-sm">
            <p className="text-indigo-300 font-semibold">{c.username} <span className="text-gray-500 font-normal">• {c.created_at}</span></p>
            <p className="text-gray-200 mt-1">{c.content}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
