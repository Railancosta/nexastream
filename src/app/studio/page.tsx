'use client'
import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { API, thumbUrl, formatViews, formatDuration } from '../../lib/api'

interface CreatorVideo {
  id: string; title: string; description?: string; views: number; likes: number
  duration: number; status: string; created_at: string; watch_seconds: number
  completions: number; is_short: number; thumbnail_path?: string
}

interface ChannelStats {
  totalVideos: number; totalViews: number; totalLikes: number
  totalWatchMinutes: number; avgCompletionRate: number
  estimatedRevenue: number; subscribers: number
}

export default function StudioPage() {
  const { user, token, loading: authLoading } = useAuth()
  const [videos, setVideos] = useState<CreatorVideo[]>([])
  const [stats, setStats] = useState<ChannelStats>({
    totalVideos: 0, totalViews: 0, totalLikes: 0,
    totalWatchMinutes: 0, avgCompletionRate: 0,
    estimatedRevenue: 0, subscribers: 0
  })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'videos' | 'analytics' | 'monetization'>('overview')

  useEffect(() => {
    if (authLoading || !user) return
    loadCreatorData()
  }, [user, authLoading])

  async function loadCreatorData() {
    try {
      const headers = { Authorization: `Bearer ${token}` }
      // Fetch all videos (creator sees their own)
      const res = await fetch(API() + '/api/videos', { headers })
      const data = await res.json()
      const allVideos: CreatorVideo[] = data.videos || []

      // Calculate stats
      const totalViews = allVideos.reduce((sum, v) => sum + (v.views || 0), 0)
      const totalLikes = allVideos.reduce((sum, v) => sum + (v.likes || 0), 0)
      const totalWatchMinutes = allVideos.reduce((sum, v) => sum + Math.floor((v.watch_seconds || 0) / 60), 0)
      const avgCompletion = allVideos.length > 0
        ? allVideos.reduce((sum, v) => sum + ((v.completions || 0) / Math.max(1, v.views || 1)), 0) / allVideos.length
        : 0

      // Revenue estimate: 1 NST per 1000 views (creator share 50%)
      const estimatedRevenue = (totalViews / 1000) * 0.5

      setVideos(allVideos)
      setStats({
        totalVideos: allVideos.length,
        totalViews,
        totalLikes,
        totalWatchMinutes,
        avgCompletionRate: Math.round(avgCompletion * 100),
        estimatedRevenue: Math.round(estimatedRevenue * 100) / 100,
        subscribers: 0
      })
    } catch (e) {
      console.error('Failed to load creator data:', e)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <main className="p-6 max-w-6xl mx-auto">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="p-6 max-w-6xl mx-auto text-center py-20">
        <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center text-3xl mx-auto mb-4">🎬</div>
        <h1 className="text-2xl font-bold mb-2">Creator Studio</h1>
        <p className="text-gray-400 mb-6">Faça login para acessar seu painel de criador.</p>
        <a href="/login" className="px-6 py-3 rounded-full bg-indigo-600 font-semibold">Entrar</a>
      </main>
    )
  }

  const TABS = [
    { key: 'overview', label: '📊 Visão Geral', icon: '📊' },
    { key: 'videos', label: '🎥 Vídeos', icon: '🎥' },
    { key: 'analytics', label: '📈 Analytics', icon: '📈' },
    { key: 'monetization', label: '💰 Monetização', icon: '💰' },
  ]

  return (
    <main className="pb-24 md:pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-gray-950/95 backdrop-blur border-b border-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-900 flex items-center justify-center text-lg font-bold text-indigo-200">
              {user.username?.[0]?.toUpperCase() || 'C'}
            </div>
            <div>
              <h1 className="text-lg font-bold">Creator Studio</h1>
              <p className="text-xs text-gray-400">@{user.username}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <a href="/studio/finance" className="px-4 py-2 rounded-full bg-green-600 text-sm font-semibold active:scale-95 transition">
              💰 Finanças
            </a>
            <a href="/upload" className="px-4 py-2 rounded-full bg-indigo-600 text-sm font-semibold active:scale-95 transition">
              ⬆ Upload
            </a>
          </div>
        </div>
        {/* Tab navigation */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto no-scrollbar pb-2">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.key ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Vídeos" value={String(stats.totalVideos)} icon="🎥" />
              <StatCard label="Visualizações" value={formatViews(stats.totalViews)} icon="👁️" />
              <StatCard label="Curtidas" value={formatViews(stats.totalLikes)} icon="❤️" />
              <StatCard label="Min. Assistidos" value={formatViews(stats.totalWatchMinutes)} icon="⏱️" />
            </div>

            {/* Revenue Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-950 to-purple-950 border border-indigo-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-300">Receita Estimada (NST)</p>
                  <p className="text-3xl font-bold mt-1">{stats.estimatedRevenue} NST</p>
                  <p className="text-xs text-gray-400 mt-2">50% da receita líquida vai para criadores (Item 19)</p>
                </div>
                <div className="text-4xl">💰</div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-gray-900 rounded-xl border border-gray-800">
                <h3 className="font-semibold text-sm mb-3">Taxa de Conclusão</h3>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">{stats.avgCompletionRate}%</span>
                </div>
                <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, stats.avgCompletionRate)}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-2">Média de conclusão de todos os vídeos</p>
              </div>
              <div className="p-5 bg-gray-900 rounded-xl border border-gray-800">
                <h3 className="font-semibold text-sm mb-3">Engajamento</h3>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-bold">
                    {stats.totalViews > 0 ? ((stats.totalLikes / stats.totalViews) * 100).toFixed(1) : '0'}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">Taxa de curtidas por visualização</p>
              </div>
            </div>

            {/* Recent Videos */}
            {videos.length > 0 && (
              <div>
                <h2 className="font-bold text-lg mb-3">Vídeos Recentes</h2>
                <div className="space-y-3">
                  {videos.slice(0, 5).map(v => (
                    <div key={v.id} className="flex gap-3 p-3 bg-gray-900 rounded-xl border border-gray-800">
                      <div className="w-24 h-14 rounded-lg overflow-hidden bg-gray-800 shrink-0">
                        <img src={thumbUrl(v)} alt="" className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm line-clamp-1">{v.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatViews(v.views)} views • {formatViews(v.likes)} likes • {formatDuration(v.duration)}
                        </p>
                        <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded ${
                          v.status === 'ready' ? 'bg-green-900 text-green-300' :
                          v.status === 'processing' ? 'bg-yellow-900 text-yellow-300' :
                          'bg-red-900 text-red-300'
                        }`}>{v.status}</span>
                      </div>
                      <a href={`/video?id=${v.id}`} className="self-center text-xs text-indigo-400 shrink-0">Ver →</a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">Todos os Vídeos ({videos.length})</h2>
              <a href="/upload" className="px-4 py-2 rounded-full bg-indigo-600 text-sm font-semibold">⬆ Novo Upload</a>
            </div>
            {videos.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-4">Você ainda não enviou nenhum vídeo.</p>
                <a href="/upload" className="px-6 py-3 rounded-full bg-indigo-600 font-semibold">Fazer Primeiro Upload</a>
              </div>
            )}
            {videos.map(v => (
              <div key={v.id} className="flex gap-3 p-3 bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition">
                <div className="w-32 h-18 rounded-lg overflow-hidden bg-gray-800 shrink-0">
                  <img src={thumbUrl(v)} alt="" className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold line-clamp-1">{v.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatViews(v.views)} views • {formatViews(v.likes)} likes • {formatDuration(v.duration)}
                    {v.is_short ? ' • 📱 Short' : ''}
                  </p>
                  <div className="flex gap-3 mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                      v.status === 'ready' ? 'bg-green-900 text-green-300' :
                      v.status === 'processing' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-red-900 text-red-300'
                    }`}>{v.status}</span>
                    <span className="text-[10px] text-gray-500">{new Date(v.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <a href={`/video?id=${v.id}`} className="px-3 py-1 rounded bg-gray-800 text-xs text-center hover:bg-gray-700">Ver</a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="font-bold text-lg">Analytics Detalhado</h2>
            <div className="p-6 bg-gray-900 rounded-2xl border border-gray-800">
              <h3 className="font-semibold mb-4">Desempenho por Vídeo</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-400 border-b border-gray-800">
                      <th className="pb-2">Vídeo</th>
                      <th className="pb-2 text-right">Views</th>
                      <th className="pb-2 text-right">Likes</th>
                      <th className="pb-2 text-right">Completos</th>
                      <th className="pb-2 text-right">Taxa Concl.</th>
                      <th className="pb-2 text-right">Watch Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {videos.map(v => {
                      const completionRate = v.views > 0 ? ((v.completions || 0) / v.views * 100).toFixed(1) : '0'
                      return (
                        <tr key={v.id} className="border-b border-gray-800/50">
                          <td className="py-2 max-w-[200px] truncate">{v.title}</td>
                          <td className="py-2 text-right">{formatViews(v.views)}</td>
                          <td className="py-2 text-right">{formatViews(v.likes)}</td>
                          <td className="py-2 text-right">{formatViews(v.completions || 0)}</td>
                          <td className="py-2 text-right">{completionRate}%</td>
                          <td className="py-2 text-right">{Math.floor((v.watch_seconds || 0) / 60)}min</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Engagement Score */}
            <div className="p-6 bg-gray-900 rounded-2xl border border-gray-800">
              <h3 className="font-semibold mb-2">Algoritmo de Ranking (Item 23)</h3>
              <p className="text-xs text-gray-400 mb-4">
                Seus vídeos são ranqueados por: engajamento (likes×3 + completions×2) + taxa de conclusão + log(views) + decaimento de recência + jitter de exploração
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-indigo-400">{stats.totalLikes * 3 + (stats.totalViews * 0.1)}</p>
                  <p className="text-xs text-gray-500">Engagement Score</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-400">{stats.avgCompletionRate}%</p>
                  <p className="text-xs text-gray-500">Completion Rate</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-400">{Math.log1p(stats.totalViews).toFixed(1)}</p>
                  <p className="text-xs text-gray-500">log(Views)</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-400">{stats.totalVideos}</p>
                  <p className="text-xs text-gray-500">Conteúdo Total</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Monetization Tab */}
        {activeTab === 'monetization' && (
          <div className="space-y-6">
            <h2 className="font-bold text-lg">Monetização (Item 19)</h2>

            {/* Revenue Breakdown */}
            <div className="p-6 bg-gradient-to-br from-indigo-950 to-purple-950 rounded-2xl border border-indigo-800">
              <h3 className="font-semibold mb-4">Divisão de Receita</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Criadores</span><span className="font-bold">50%</span>
                  </div>
                  <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '50%' }} />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span>NexaStream</span><span className="font-bold">50%</span>
                  </div>
                  <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: '50%' }} />
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400">Aplica-se à receita líquida distribuível elegível. Não toda receita bruta (Item 19).</p>
            </div>

            {/* Revenue Sources */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RevenueCard title="Publicidade" value="Em breve" icon="📺" description="Revenue share por impressão de anúncios" />
              <RevenueCard title="Assinaturas" value="Em breve" icon="⭐" description="Canais premium com conteúdo exclusivo" />
              <RevenueCard title="Doações" value="Em breve" icon="🎁" description="Apoio direto dos espectadores" />
              <RevenueCard title="NST Rewards" value={`${stats.estimatedRevenue} NST`} icon="🪙" description="Recompensas por métricas verificáveis" />
            </div>

            {/* NST Balance */}
            <div className="p-6 bg-gray-900 rounded-2xl border border-gray-800">
              <h3 className="font-semibold mb-3">Saldo NST</h3>
              <div className="flex items-center gap-4">
                <div className="text-4xl">🪙</div>
                <div>
                  <p className="text-2xl font-bold">{stats.estimatedRevenue} NST</p>
                  <p className="text-xs text-gray-400">Recompensa estimada por visualizações</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <a href="/nano" className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold">Ver Nano Treasury</a>
                <a href="/swap" className="px-4 py-2 rounded-lg bg-gray-800 text-sm">Swap NST</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="p-4 bg-gray-900 rounded-xl border border-gray-800">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}

function RevenueCard({ title, value, icon, description }: { title: string; value: string; icon: string; description: string }) {
  return (
    <div className="p-5 bg-gray-900 rounded-xl border border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-semibold">{title}</span>
        </div>
        <span className="text-sm font-bold text-indigo-300">{value}</span>
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  )
}
