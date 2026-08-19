import './globals.css'
import Link from 'next/link'
import InstallPrompt from '../components/InstallPrompt'
import BottomNav from '../components/BottomNav'
import type { Viewport } from 'next'

export const metadata = { title: 'NexaStream', description: 'Rede de vídeo descentralizada' }

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#030712'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="./manifest.webmanifest" />
        <link rel="icon" href="./icon.svg" type="image/svg+xml" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script src="./register-sw.js" defer />
      </head>
      <body className="bg-gray-950 text-gray-100 antialiased">
        <nav className="sticky top-0 z-40 flex items-center justify-between gap-3 px-4 h-14 bg-gray-950/95 backdrop-blur border-b border-gray-800">
          <Link href="/" className="text-xl font-bold text-indigo-400 shrink-0">NexaStream</Link>
          <div className="flex gap-1 text-sm items-center">
            <Link href="/search" aria-label="Buscar" className="p-2.5 rounded-full hover:bg-gray-800 active:bg-gray-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="m20 20-3.5-3.5" />
              </svg>
            </Link>
            <Link href="/upload" className="hidden md:flex px-4 py-1.5 rounded-full bg-gray-800 hover:bg-gray-700 font-medium items-center gap-1.5">
              <span className="text-lg leading-none">+</span> Enviar
            </Link>
            <div className="hidden md:block"><InstallPrompt /></div>
            <Link href="/login" className="ml-1 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-full font-medium">Entrar</Link>
          </div>
        </nav>
        {children}
        <BottomNav />
      </body>
    </html>
  )
}
