import './globals.css'
import Link from 'next/link'
export const metadata = {
  title: 'NexaStream — Global Decentralized Video Infrastructure',
  description: 'Open video platform + P2P network + distributed storage + blockchain. Testnet running. Under active engineering.'
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <div className="inner">
            <Link href="/" className="logo">NexaStream</Link>
            <ul>
              <li><Link href="/architecture/">Architecture</Link></li>
              <li><Link href="/testnet/">Testnet</Link></li>
              <li><Link href="/api/">API</Link></li>
              <li><Link href="/roadmap/">Roadmap</Link></li>
              <li><a href="https://github.com/Railancosta/nexastream" target="_blank" rel="noopener">GitHub ↗</a></li>
            </ul>
          </div>
        </nav>
        {children}
        <footer>
          <p>NexaStream é um projeto em construção. Testnet ativa. Não é mainnet. Não é produto final.</p>
          <p style={{marginTop:'1rem'}}>
            <a href="https://github.com/Railancosta/nexastream">GitHub</a> •
            <a href="/pitch.pdf">Developer Pitch Plan</a> •
            <a href="mailto:contact@nexastream.org">contato</a>
          </p>
          <p style={{marginTop:'1rem',fontSize:'0.75rem'}}>© 2026 NexaStream — Build first. Validate through engineering.</p>
        </footer>
      </body>
    </html>
  )
}
