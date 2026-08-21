'use client'
import Link from 'next/link'
import { useAuthCtx } from './ClerkProvider'
import InstallPrompt from './InstallPrompt'

export default function NavBar() {
  const { user, isSignedIn, signOut } = useAuthCtx()
  const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

  return (
    <nav className="sticky top-0 z-40 flex items-center justify-between gap-3 px-4 h-14 bg-gray-950/95 backdrop-blur border-b border-gray-800">
      <Link href="/" className="text-xl font-bold text-indigo-400 shrink-0">NexaStream</Link>
      <div className="flex gap-1 text-sm items-center">
        <Link href="/search" aria-label="Buscar" className="p-2.5 rounded-full hover:bg-gray-800 active:bg-gray-700">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="m20 20-3.5-3.5" />
          </svg>
        </Link>
        {isSignedIn && (
          <Link href="/upload" className="hidden md:flex px-4 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 font-medium items-center gap-1.5">
            <span className="text-lg leading-none">+</span> Enviar
          </Link>
        )}
        <div className="hidden md:block"><InstallPrompt /></div>
        {!isSignedIn ? (
          <Link href={hasClerk ? '/sign-in' : '/login'} className="ml-1 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-full font-medium">Entrar</Link>
        ) : (
          <div className="ml-1 flex items-center gap-2">
            <span className="text-xs text-gray-400">{user?.username || user?.email}</span>
            <button onClick={signOut} className="text-xs text-red-400 hover:text-red-300">Sair</button>
          </div>
        )}
      </div>
    </nav>
  )
}
