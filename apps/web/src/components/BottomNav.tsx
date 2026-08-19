'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useI18n } from '../lib/i18n'

const items = [
  { href: '/', key: 'home', icon: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1V10.5Z" />
    </svg>) },
  { href: '/shorts', key: 'shorts', icon: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" fill={a ? 'currentColor' : 'none'} />
    </svg>) },
  { href: '/live', key: 'live', icon: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <circle cx="12" cy="12" r="3" fill={a ? 'currentColor' : 'none'} />
      <path strokeLinecap="round" d="M7.5 7.5a6.5 6.5 0 0 0 0 9m9-9a6.5 6.5 0 0 1 0 9M5 5a10 10 0 0 0 0 14m14-14a10 10 0 0 1 0 14" />
    </svg>) },
  { href: '/notifications', key: 'alerts', icon: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
    </svg>) },
  { href: '/login', key: 'profile', icon: (a: boolean) => (
    <svg viewBox="0 0 24 24" fill={a ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0" />
    </svg>) },
]

export default function BottomNav() {
  const pathname = usePathname()
  const { t } = useI18n()
  const [logged, setLogged] = useState(false)
  useEffect(() => { setLogged(!!localStorage.getItem('nst_token')) }, [pathname])
  if (pathname.startsWith('/shorts')) return null
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-gray-950/95 backdrop-blur border-t border-gray-800 pb-[env(safe-area-inset-bottom)]">
      <div className="relative flex items-end justify-around h-14">
        {items.slice(0, 2).map((it) => {
          const active = pathname === it.href
          return (
            <Link key={it.href} href={it.href} className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] ${active ? 'text-white' : 'text-gray-400'}`}>
              {it.icon(active)}{t(it.key)}
            </Link>
          )
        })}
        <Link href="/upload" aria-label={t('sendVideo')}
          className="relative -top-3 flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 border-4 border-gray-950 active:scale-95 transition">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-7 h-7">
            <path strokeLinecap="round" d="M12 5v14m-7-7h14" />
          </svg>
        </Link>
        {items.slice(2).map((it) => {
          const active = pathname === it.href
          const href = it.href === '/login' && logged ? '/notifications' : it.href
          const label = it.href === '/login' && logged ? t('profile') : t(it.key)
          return (
            <Link key={it.href} href={href} className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] ${active ? 'text-white' : 'text-gray-400'}`}>
              {it.icon(active)}{label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
