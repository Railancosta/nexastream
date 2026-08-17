'use client'
import { useState } from 'react'
export default function Upload() {
  const [title, setTitle] = useState(''); const [file, setFile] = useState<File | null>(null); const [msg, setMsg] = useState('')
  async function go(e: React.FormEvent) {
    e.preventDefault()
    const token = localStorage.getItem('nst_token')
    if (!token) { setMsg('Faça login primeiro em /login'); return }
    if (!file) { setMsg('Escolha um arquivo de vídeo'); return }
    setMsg('Enviando... aguarde')
    try {
      const r = await fetch('http://localhost:3002/api/videos/upload?title=' + encodeURIComponent(title || file.name), { method: 'PUT', headers: { Authorization: 'Bearer ' + token }, body: file })
      const d = await r.json()
      setMsg(r.ok ? 'Upload OK! ID: ' + d.videoId + ' — transcodando em segundo plano...' : (d.error || 'erro'))
    } catch { setMsg('Erro de conexão com a API') }
  }
  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Enviar vídeo</h1>
      <form onSubmit={go} className="space-y-3">
        <input className="w-full p-2 rounded bg-gray-900 border border-gray-700" placeholder="título" value={title} onChange={e => setTitle(e.target.value)} />
        <input className="w-full p-2 rounded bg-gray-900 border border-gray-700" type="file" accept="video/*" onChange={e => setFile(e.target.files?.[0] || null)} />
        <button className="w-full p-2 rounded bg-indigo-600 font-semibold">Enviar</button>
      </form>
      {msg && <p className="text-sm text-indigo-300 mt-3">{msg}</p>}
    </main>
  )
}
