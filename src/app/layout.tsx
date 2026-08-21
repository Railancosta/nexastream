import './globals.css'
import BottomNav from '../components/BottomNav'
import ClerkProvider from '../components/ClerkProvider'
import NavBar from '../components/NavBar'
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
        <ClerkProvider>
          <NavBar />
          {children}
          <BottomNav />
        </ClerkProvider>
      </body>
    </html>
  )
}
