import Link from 'next/link';
import { Video, TrendingUp, Wallet, Users, Zap, Shield, ArrowRight, Play, Star } from 'lucide-react';
import { getDemoVideos } from '@/lib/db/mockData';
import { VideoCard } from '@/components/video/VideoCard';

export default function HomePage() {
  const demoVideos = getDemoVideos();

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
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-primary font-medium">Instant USDC Payouts</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Democratize Video.
              <br />
              <span className="gradient-text">Earn from Day 1.</span>
            </h1>

            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              80% ad revenue from your first view. No subscriber requirements. No gatekeeping. 
              Just creators empowered by blockchain.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="btn-primary flex items-center gap-2">
                Start Earning Now
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/discover" className="btn-outline flex items-center gap-2">
                <Play className="w-5 h-5" />
                Explore Videos
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
              <div className="text-center">
                <p className="text-4xl font-bold text-white">5</p>
                <p className="text-gray-400">Creators Earning</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-white">$0</p>
                <p className="text-gray-400">Total Paid Out</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-white">5</p>
                <p className="text-gray-400">Total Videos</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-white">2.1M</p>
                <p className="text-gray-400">Total Views</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-dark-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Why NexaStream?</h2>
            <p className="text-xl text-gray-400">Built for creators, by creators</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 bg-dark-200 rounded-2xl border border-white/10 hover:border-primary/50 transition-colors">
              <div className="w-14 h-14 bg-primary/20 rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Algorithmic Sovereignty</h3>
              <p className="text-gray-400">
                Every algorithm weight is open-source. No shadowbanning. No black boxes. 
                Your content, your rules.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 bg-dark-200 rounded-2xl border border-white/10 hover:border-accent/50 transition-colors">
              <div className="w-14 h-14 bg-accent/20 rounded-xl flex items-center justify-center mb-6">
                <Wallet className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Instant USDC Payouts</h3>
              <p className="text-gray-400">
                Earn USDC directly to your wallet. No thresholds. No monthly waits. 
                Instant global payments.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 bg-dark-200 rounded-2xl border border-white/10 hover:border-green-500/50 transition-colors">
              <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-7 h-7 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Community Governance</h3>
              <p className="text-gray-400">
                Vote on platform decisions with $NEXA tokens. Shape the future 
                of video sharing together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="py-20 bg-gradient-to-b from-dark-100 to-dark-200">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-white text-center mb-16">
            How We Compare
          </h2>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* YouTube Comparison */}
            <div className="p-8 bg-dark-200 rounded-2xl border border-white/10">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-4xl">📺</span>
                <div>
                  <h3 className="text-xl font-bold text-white">YouTube vs NexaStream</h3>
                  <p className="text-gray-400">45% cut vs 20% cut</p>
                </div>
              </div>
              <p className="text-gray-300">
                We keep only 20% of ad revenue. YouTube takes 45%. 
                <span className="text-green-500 font-semibold"> The math is simple — creators win here.</span>
              </p>
            </div>

            {/* TikTok Comparison */}
            <div className="p-8 bg-dark-200 rounded-2xl border border-white/10">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-4xl">🎵</span>
                <div>
                  <h3 className="text-xl font-bold text-white">TikTok vs NexaStream</h3>
                  <p className="text-gray-400">$0.03/1K vs $12/1K</p>
                </div>
              </div>
              <p className="text-gray-300">
                TikTok pays creators a fraction of a penny. NexaStream pays 
                <span className="text-green-500 font-semibold"> up to 400x more per thousand views.</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Videos Section */}
      <section className="py-20 bg-dark-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-white">Trending</h2>
              <p className="text-gray-400">What's viral right now</p>
            </div>
            <Link href="/trending" className="text-primary hover:text-primary/80 font-medium flex items-center gap-2">
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {demoVideos.slice(0, 8).map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-accent">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Start Earning?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Join thousands of creators already earning on NexaStream
          </p>
          <Link 
            href="/register" 
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary rounded-lg font-bold text-lg hover:bg-white/90 transition-colors"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
