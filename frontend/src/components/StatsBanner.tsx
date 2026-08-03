'use client'

import { Coins, TrendingUp, Zap, Shield } from 'lucide-react'

export function StatsBanner() {
  const stats = [
    {
      icon: Coins,
      label: '$NEXA Price',
      value: '$0.0234',
      change: '+12.5%',
      positive: true,
      gradient: 'from-primary to-blue-600',
    },
    {
      icon: TrendingUp,
      label: 'Total Value Locked',
      value: '$12.5M',
      change: '+8.2%',
      positive: true,
      gradient: 'from-green-500 to-emerald-600',
    },
    {
      icon: Zap,
      label: 'Daily Rewards',
      value: '45,230',
      change: '+15.8%',
      positive: true,
      gradient: 'from-yellow-500 to-orange-600',
    },
    {
      icon: Shield,
      label: 'Network Security',
      value: '99.9%',
      change: 'Active',
      positive: true,
      gradient: 'from-purple-500 to-fuchsia-600',
    },
  ]

  return (
    <div className="px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-950 mt-16">
      <div className="flex items-center gap-6 overflow-x-auto pb-2">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors flex-shrink-0"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-xs text-slate-400">{stat.label}</div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">{stat.value}</span>
                <span className={`text-xs font-medium ${stat.positive ? 'text-green-400' : 'text-red-400'}`}>
                  {stat.change}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* NexaChain Status */}
        <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl flex-shrink-0">
          <div className="relative">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping" />
          </div>
          <div>
            <div className="text-xs text-slate-400">NexaChain Network</div>
            <div className="text-sm font-bold text-green-400">All Systems Operational</div>
          </div>
        </div>
      </div>
    </div>
  )
}
