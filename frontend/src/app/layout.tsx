import type { Metadata, Viewport } from 'next'
import './globals.css'
import WagmiProvider from '@/components/Providers/WagmiProvider'
import PWAProvider from '@/components/PWAProvider'

export const metadata: Metadata = {
  title: {
    default: 'NexaStream - Decentralized Video Platform',
    template: '%s | NexaStream'
  },
  description: 'Watch, create, and earn cryptocurrency on the decentralized video platform powered by NexaChain blockchain. The next generation democratic video platform.',
  keywords: ['video', 'streaming', 'blockchain', 'crypto', 'web3', 'decentralized', 'nexachain', 'NEXA', 'livestream', 'creator economy', 'DeFi'],
  authors: [{ name: 'NexaStream Team', url: 'https://nexastream.org' }],
  creator: 'NexaStream',
  publisher: 'NexaStream',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['pt_BR', 'es_ES', 'zh_CN', 'ja_JP'],
    url: 'https://nexastream.org',
    siteName: 'NexaStream',
    title: 'NexaStream - Decentralized Video Platform',
    description: 'Watch, create, and earn cryptocurrency on the decentralized video platform.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'NexaStream - Decentralized Video Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@nexastream',
    creator: '@nexastream',
    title: 'NexaStream - Decentralized Video Platform',
    description: 'Watch, create, and earn cryptocurrency on the decentralized video platform.',
    images: ['/og-image.png'],
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
  },
  alternates: {
    canonical: 'https://nexastream.org',
    languages: {
      'en-US': 'https://nexastream.org',
      'pt-BR': 'https://nexastream.org/pt',
      'es-ES': 'https://nexastream.org/es',
      'zh-CN': 'https://nexastream.org/zh',
    },
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NexaStream',
    startupImage: [
      {
        url: '/icons/apple-splash-1125-2436.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  minimumScale: 1,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#8b5cf6' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://picsum.photos" />
      </head>
      <body className="bg-dark text-white min-h-screen antialiased">
        <PWAProvider>
          <WagmiProvider>
            {children}
          </WagmiProvider>
        </PWAProvider>
      </body>
    </html>
  )
}
