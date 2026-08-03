import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NexaStream - Decentralized Video Platform',
  description: 'Watch, create, and earn cryptocurrency on the decentralized video platform powered by NexaChain blockchain.',
  keywords: 'video, streaming, blockchain, crypto, web3, decentralized, nexachain, NEXA',
  authors: [{ name: 'NexaStream' }],
  openGraph: {
    title: 'NexaStream',
    description: 'Decentralized Video Platform - Watch, Create, Earn',
    type: 'website',
    locale: 'en_US',
    siteName: 'NexaStream',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-dark text-white min-h-screen">
        {children}
      </body>
    </html>
  )
}
