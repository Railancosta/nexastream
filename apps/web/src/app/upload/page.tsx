'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import { API } from '../../lib/api'

export default function Upload() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'video' | 'short'>('video')
  const [file, setFile] = useState<File | null>(null)
  const [duration, setDuration] = useState(0)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const probeRef = useRef<HTMLVideoElement>(null)
  const [preview, setPreview] = useState('')

  function pick(f: File | null) {
    setFile(f)
    setDuration(0)
    setPreview('')
    if (!f) return
    const url = URL.createObjectURL(f)
    setPreview(url)
    // medir duração real no cliente para classificação de Short
    const el = document.createElement('video')
    el.preload = 'metadata'
    el.src = url
    el.onloadedmetadata = () => {
      const d = Math.round(el.duration || 0)
      setDuration(d)
      if (d > 0 && d <= 60) setType('short')
      if (el.videoHeight > el.videoWidth) setType('short')
    }
  }

  async function go(e: React.FormEvent) {
    e.preventDefault()
    const token = localStorage.getItem('nst_token')
    if (!token) { setMsg('Faça login primeiro em /login'); return }
    if (!file) { setMsg('Escolha um arquivo de vídeo'); return }
    setBusy(true); setProgress(0)
    setMsg('Enviando... não feche esta tela')
    try {
      const qs = new URLSearchParams({
        title: title || file.name,
        description,
        type,
        duration: String(duration)
      })
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', API() + '/api/videos/upload?' + qs.toString())
      xhr.setRequestHeader('Authorization', 'Bearer ' + token)
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100))
      }
      const done = await new Promise<any>((resolve) => {
        xhr.onload = () => resolve({ ok: xhr.status < 400, body: safeJson(xhr.responseText) })
        xhr.onerror = () => resolve({ ok: false, body: null })
        xhr.send(file)
      })
      setMsg(done.ok
        ? 'Upload concluído! ID: ' + done.body.videoId + ' — transcodificando em segundo plano.'
        : (done.body?.error || 'Erro no upload'))
    } catch {
      setMsg('Erro de conexão com a API')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="max-w-lg mx-auto p-4 pb-24 md:pb-8">
      <h1 className="text-xl font-bold mb-1">Enviar vídeo</h1>
      <p className="text-xs text-gray-400 mb-4">Shorts: até 60s ou vertical (9:16). Vídeos: qualquer duração até 100 MB.</p>

      {/* seletor Short / Vídeo */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button type="button" onClick={() => setType('short')}
          className={'p-3 rounded-xl border text-sm font-semibold flex flex-col items-center gap-1 ' +
            (type === 'short' ? 'border-indigo-500 bg-indigo-950/50 text-indigo-200' : 'border-gray-700 bg-gray-900 text-gray-400')}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" /></svg>
          Short
        </button>
        <button type="button" onClick={() => setType('video')}
          className={'p-3 rounded-xl border text-sm font-semibold flex flex-col items-center gap-1 ' +
            (type === 'video' ? 'border-indigo-500 bg-indigo-950/50 text-indigo-200' : 'border-gray-700 bg-gray-900 text-gray-400')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
            <rect x="2" y="5" width="15" height="14" rx="2" /><path d="m17 10 5-3v10l-5-3" />
          </svg>
          Vídeo longo
        </button>
      </div>

      <form onSubmit={go} className="space-y-3">
        <label className="block w-full p-8 rounded-xl border-2 border-dashed border-gray-700 bg-gray-900 text-center active:border-indigo-500 cursor-pointer">
          <input type="file" accept="video/*" capture="environment" className="hidden"
            onChange={(e) => pick(e.target.files?.[0] || null)} />
          {file ? (
            <span className="text-sm text-indigo-300 font-medium">🎞 {file.name} ({(file.size / 1048576).toFixed(1)} MB{duration ? ', ' + duration + 's' : ''})</span>
          ) : (
            <span className="text-sm text-gray-400">📱 Toque para escolher ou gravar um vídeo</span>
          )}
        </label>

        {preview && (
          <video ref={probeRef} src={preview} controls playsInline className="w-full max-h-64 rounded-xl bg-black" />
        )}

        <input className="w-full p-3 rounded-xl bg-gray-900 border border-gray-700" placeholder="Título do vídeo"
          value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="w-full p-3 rounded-xl bg-gray-900 border border-gray-700 min-h-24" placeholder="Descrição (opcional)"
          value={description} onChange={(e) => setDescription(e.target.value)} />

        {busy && (
          <div className="w-full h-2 rounded-full bg-gray-800 overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all" style={{ width: progress + '%' }} />
          </div>
        )}

        <button disabled={busy}
          className="w-full p-3.5 rounded-xl bg-indigo-600 font-semibold active:scale-[0.98] transition disabled:opacity-50">
          {busy ? 'Enviando ' + progress + '%' : 'Publicar ' + (type === 'short' ? 'Short' : 'vídeo')}
        </button>
      </form>

      {msg && (
        <p className="text-sm text-indigo-300 mt-4">
          {msg} {msg.startsWith('Upload concluído') && <Link href="/" className="underline">Ver no feed →</Link>}
        </p>
      )}
    </main>
  )
}

function safeJson(s: string): any {
  try { return JSON.parse(s) } catch { return null }
}
