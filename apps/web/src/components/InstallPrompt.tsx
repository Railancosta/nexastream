'use client'
import { useEffect, useState } from 'react'
export default function InstallPrompt() {
  const [evt, setEvt] = useState<any>(null)
  const [installed, setInstalled] = useState(false)
  const [ua, setUa] = useState('')
  useEffect(() => {
    setUa(navigator.userAgent)
    const onBip = (e: any) => { e.preventDefault(); setEvt(e) }
    window.addEventListener('beforeinstallprompt', onBip)
    window.addEventListener('appinstalled', () => { setInstalled(true); setEvt(null) })
    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])
  if (installed) return null
  if (evt) return <button onClick={() => { evt.prompt(); setEvt(null) }} className="px-3 py-1 rounded bg-green-700 text-sm">📲 Instalar app</button>
  if (/iPhone|iPad/.test(ua)) return <p className="text-xs text-gray-500">iOS: Safari → Compartilhar → "Adicionar à Tela de Início"</p>
  if (/Android/.test(ua)) return <p className="text-xs text-gray-500">Android: menu → "Adicionar à tela inicial"</p>
  return null
}
