import './globals.css'
import Link from 'next/link'
import InstallPrompt from '../components/InstallPrompt'
export const metadata = { title: 'NexaStream', description: 'Rede de video descentralizada' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="manifest" href="./manifest.webmanifest" />
        <link rel="icon" href="./icon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#6366f1" />
        <script src="./register-sw.js" defer />
      </head>
      <body className="bg-gray-950 text-gray-100">
        <nav className="flex items-center justify-between p-4 border-b border-gray-800 flex-wrap gap-2">
          <Link href="/" className="text-xl font-bold text-indigo-400">NexaStream</Link>
          <div className="flex gap-3 text-sm flex-wrap items-center">
            <Link href="/search" className="hover:text-indigo-300">Buscar</Link>
            <Link href="/upload" className="hover:text-indigo-300">Enviar</Link>
            <Link href="/studio" className="hover:text-indigo-300">Estúdio</Link>
            <Link href="/wallet" className="hover:text-indigo-300">Carteira</Link>
            <Link href="/explorer" className="hover:text-indigo-300">Explorer</Link>
            <Link href="/notifications" className="hover:text-indigo-300">Notificações</Link>
            <Link href="/metrics" className="hover:text-indigo-300">Métricas</Link>
            <InstallPrompt />
            <Link href="/login" className="px-3 py-1 bg-indigo-600 rounded">Entrar</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
