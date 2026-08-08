import Link from 'next/link';
import { TrendingUp, Wallet, Users, Zap, Shield, ArrowRight, Play, Server, Globe, Lock } from 'lucide-react';
import { getNetworkStatus, getNetworkStats } from '@/lib/db/mockData';

export default function HomePage() {
  const networkStatus = getNetworkStatus();
  const networkStats = getNetworkStats();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-dark-200 to-dark-100 py-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mb-6">
              <Globe className="w-4 h-4 text-primary" />
              <span className="text-primary font-medium">Decentralized P2P Video Network</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              NexaStream
              <br />
              <span className="gradient-text">The Decentralized Video Network</span>
            </h1>

            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Your videos. Your network. Your ownership.
              <br />
              Built on P2P technology with no single point of failure.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="btn-primary flex items-center gap-2">
                Join the Network
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/discover" className="btn-outline flex items-center gap-2">
                <Play className="w-5 h-5" />
                Explore Videos
              </Link>
            </div>

            {/* Honest Network Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
              <div className="text-center">
                <p className="text-4xl font-bold text-white">{networkStats.peers || '-'}</p>
                <p className="text-gray-400">Network Peers</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-white">{networkStats.blockHeight || '-'}</p>
                <p className="text-gray-400">Block Height</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-white">{networkStats.validators || '-'}</p>
                <p className="text-gray-400">Validators</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-white">{networkStats.storageNodes || '-'}</p>
                <p className="text-gray-400">Storage Nodes</p>
              </div>
            </div>

            {/* Network Status Banner */}
            <div className="mt-8 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg max-w-2xl mx-auto">
              <p className="text-yellow-200 text-sm">
                ⚠️ Network Status: {networkStats.networkStatus}
                <br />
                <span className="text-xs opacity-75">
                  Connect to the P2P network to see real-time statistics.
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-dark-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Why NexaStream?</h2>
            <p className="text-xl text-gray-400">Built for creators, by creators — powered by P2P</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 bg-dark-200 rounded-2xl border border-white/10 hover:border-primary/50 transition-colors">
              <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center mb-6">
                <Server className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Truly Decentralized</h3>
              <p className="text-gray-400">
                No single server controls your content. Data is distributed across 
                independent nodes worldwide using IPFS and libp2p.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 bg-dark-200 rounded-2xl border border-white/10 hover:border-accent/50 transition-colors">
              <div className="w-14 h-14 bg-accent/20 rounded-xl flex items-center justify-center mb-6">
                <Wallet className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">50/50 Revenue Split</h3>
              <p className="text-gray-400">
                When the platform generates real revenue, 50% goes to creators 
                and 50% to platform operations. Transparent and verifiable.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 bg-dark-200 rounded-2xl border border-white/10 hover:border-green-500/50 transition-colors">
              <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Community Governed</h3>
              <p className="text-gray-400">
                NexaChain blockchain ensures transparent governance. 
                Token holders vote on platform decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="py-20 bg-gradient-to-b from-dark-100 to-dark-200">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-white text-center mb-16">
            Decentralized Architecture
          </h2>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* P2P Infrastructure */}
            <div className="p-8 bg-dark-200 rounded-2xl border border-white/10">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-4xl">🔗</span>
                <div>
                  <h3 className="text-xl font-bold text-white">P2P Infrastructure</h3>
                  <p className="text-gray-400">Zero paid cloud dependency</p>
                </div>
              </div>
              <ul className="text-gray-300 space-y-2">
                <li>• libp2p for peer-to-peer networking</li>
                <li>• IPFS for content addressing</li>
                <li>• DHT for peer and content discovery</li>
                <li>• WebRTC for real-time communication</li>
                <li>• Self-hostable nodes on any machine</li>
              </ul>
            </div>

            {/* Blockchain */}
            <div className="p-8 bg-dark-200 rounded-2xl border border-white/10">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-4xl">⛓️</span>
                <div>
                  <h3 className="text-xl font-bold text-white">NexaChain</h3>
                  <p className="text-gray-400">Own blockchain with NST token</p>
                </div>
              </div>
              <ul className="text-gray-300 space-y-2">
                <li>• Hybrid PoW + PoS consensus</li>
                <li>• 55,000,000 NST maximum supply</li>
                <li>• Native wallet with full control</li>
                <li>• Smart contracts for governance</li>
                <li>• NFT marketplace built-in</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Network Status Section */}
      <section className="py-20 bg-dark-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white">Network Status</h2>
              <p className="text-gray-400">Real-time P2P network statistics</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-dark-100 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-3 h-3 rounded-full ${networkStatus.isConnected ? 'bg-green-500' : 'bg-gray-500'}`} />
                <span className="text-gray-400">Network Status</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {networkStatus.isConnected ? 'Connected' : 'Disconnected'}
              </p>
            </div>

            <div className="p-6 bg-dark-100 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <Server className="w-5 h-5 text-gray-400" />
                <span className="text-gray-400">Storage Nodes</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {networkStatus.activeNodes}/{networkStatus.totalStorageNodes}
              </p>
            </div>

            <div className="p-6 bg-dark-100 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <Lock className="w-5 h-5 text-gray-400" />
                <span className="text-gray-400">NST Supply</span>
              </div>
              <p className="text-2xl font-bold text-white">
                {networkStats.circulatingSupply} / 55M
              </p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-dark-100 rounded-xl border border-white/10">
            <h3 className="text-lg font-bold text-white mb-4">How to Connect</h3>
            <p className="text-gray-400 mb-4">
              Run a node to join the NexaStream P2P network and contribute to decentralization.
            </p>
            <code className="block bg-dark-200 p-4 rounded-lg text-green-400 text-sm overflow-x-auto">
              # Coming soon: Node installation guide<br />
              # For now, the network is being built
            </code>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-accent">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Build the Future of Video
          </h2>
          <p className="text-xl text-white/80 mb-8">
            NexaStream is open source. Join us in creating a truly decentralized video platform.
          </p>
          <Link 
            href="/register" 
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary rounded-lg font-bold text-lg hover:bg-white/90 transition-colors"
          >
            Get Involved
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
