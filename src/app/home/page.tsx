'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Activity,
  Plus,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  MoreVertical,
  TrendingUp,
  Zap,
  Radio,
  ChevronRight,
} from 'lucide-react'
import { listRouteWatches, listPaymentEvents, createRouteWatch, updateRouteWatchStatus, deleteRouteWatch } from '@/lib/actions/telemetry'
import { getAccount } from '@/lib/appwrite/browser'

const STATUS_CONFIG = {
  active: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2, dot: 'bg-emerald-400' },
  paused: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', icon: Clock, dot: 'bg-amber-400' },
  expired: { color: 'text-neutral-500', bg: 'bg-neutral-500/10 border-neutral-500/20', icon: XCircle, dot: 'bg-neutral-600' },
}

const EVENT_STATUS_CONFIG = {
  pending: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  verified: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  expired: { color: 'text-neutral-500', bg: 'bg-neutral-500/10 border-neutral-500/20' },
  failed: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
}

function StatCard({ label, value, icon: Icon, accent = false }: { label: string; value: string | number; icon: any; accent?: boolean }) {
  return (
    <div className={`p-4 rounded-2xl border ${accent ? 'bg-[#ff8800]/5 border-[#ff8800]/20' : 'bg-[#141211] border-[#23211F]'} space-y-2`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-neutral-500 font-medium uppercase tracking-widest">{label}</p>
        <div className={`p-1.5 rounded-lg ${accent ? 'bg-[#ff8800]/10' : 'bg-[#1E1B19]'}`}>
          <Icon className={`h-3.5 w-3.5 ${accent ? 'text-[#ff8800]' : 'text-neutral-500'}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${accent ? 'text-[#ff8800]' : 'text-white'}`}>{value}</p>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [watches, setWatches] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newPath, setNewPath] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Get current user
  useEffect(() => {
    const init = async () => {
      try {
        const account = getAccount()
        const user = await account.get()
        setUserId(user.$id)
      } catch {
        router.push('/auth')
      }
    }
    init()
  }, [router])

  // Load data
  useEffect(() => {
    if (!userId) return

    const load = async () => {
      setLoading(true)
      const [watchResult, eventResult] = await Promise.all([
        listRouteWatches(userId),
        listPaymentEvents(userId),
      ])
      setWatches(watchResult.watches || [])
      setEvents(eventResult.events || [])
      setLoading(false)
    }

    load()
  }, [userId])

  const handleCreateWatch = () => {
    if (!newPath.trim() || !userId) return
    startTransition(async () => {
      const result = await createRouteWatch({
        userId,
        resourcePath: newPath.trim(),
        targetAmount: newAmount ? parseFloat(newAmount) : undefined,
        currency: 'USDC',
      })
      if (result.success && result.watch) {
        setWatches((prev) => [result.watch, ...prev])
        setNewPath('')
        setNewAmount('')
        setShowCreateForm(false)
      }
    })
  }

  const handleToggleStatus = (watch: any) => {
    const newStatus = watch.status === 'active' ? 'paused' : 'active'
    startTransition(async () => {
      await updateRouteWatchStatus(watch.$id, newStatus)
      setWatches((prev) =>
        prev.map((w) => (w.$id === watch.$id ? { ...w, status: newStatus } : w))
      )
    })
  }

  const handleDelete = (watch: any) => {
    startTransition(async () => {
      await deleteRouteWatch(watch.$id)
      setWatches((prev) => prev.filter((w) => w.$id !== watch.$id))
    })
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const activeCount = watches.filter((w) => w.status === 'active').length
  const verifiedCount = events.filter((e) => e.status === 'verified').length

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 space-y-6">
      {/* Page header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Your route watches and payment telemetry</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#ff8800] hover:brightness-110 text-black font-semibold text-sm rounded-xl transition-all active:scale-[0.97] shadow-md shadow-amber-500/20"
        >
          <Plus className="h-4 w-4" />
          New Watch
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Active Watches" value={activeCount} icon={Activity} accent />
        <StatCard label="Total Watches" value={watches.length} icon={Eye} />
        <StatCard label="Verified Events" value={verifiedCount} icon={CheckCircle2} />
        <StatCard label="Total Events" value={events.length} icon={TrendingUp} />
      </div>

      {/* Create watch form */}
      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#141211] border border-[#23211F] rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">Create Route Watch</h3>
            <button onClick={() => setShowCreateForm(false)} className="text-neutral-600 hover:text-white text-sm transition-colors">✕</button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500 mb-1.5 block">Resource Path</label>
              <input
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                placeholder="/api/v1/data"
                className="w-full bg-[#0A0908] border border-[#23211F] focus:border-amber-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-700 outline-none transition-colors font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1.5 block">Target Amount (optional)</label>
              <input
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                placeholder="0.00 USDC"
                type="number"
                className="w-full bg-[#0A0908] border border-[#23211F] focus:border-amber-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-700 outline-none transition-colors"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCreateWatch}
              disabled={!newPath.trim() || isPending}
              className="px-5 py-2 bg-[#ff8800] text-black font-semibold text-sm rounded-xl hover:brightness-110 disabled:opacity-50 transition-all active:scale-[0.97]"
            >
              {isPending ? 'Creating…' : 'Create Watch'}
            </button>
            <button onClick={() => setShowCreateForm(false)} className="px-5 py-2 border border-[#23211F] text-neutral-400 text-sm rounded-xl hover:text-white hover:bg-[#141211] transition-all">
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Route Watches table */}
      <div className="bg-[#141211] border border-[#23211F] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#23211F]">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#ff8800]" />
            <h2 className="font-semibold text-white text-sm">Route Watches</h2>
          </div>
          <span className="text-xs text-neutral-600 bg-[#1E1B19] px-2.5 py-1 rounded-lg">{watches.length} total</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-neutral-500">
              <div className="w-4 h-4 border-2 border-amber-500/40 border-t-amber-500 rounded-full animate-spin" />
              <span className="text-sm">Loading watches...</span>
            </div>
          </div>
        ) : watches.length === 0 ? (
          <div className="py-16 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-[#1E1B19] mb-4">
              <Activity className="h-6 w-6 text-neutral-600" />
            </div>
            <p className="text-neutral-500 text-sm">No route watches yet</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-3 text-[#ff8800] text-sm hover:underline"
            >
              Create your first watch
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#1E1B19]">
            {watches.map((watch) => {
              const cfg = STATUS_CONFIG[watch.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.active
              const StatusIcon = cfg.icon
              return (
                <div key={watch.$id} className="flex items-center gap-4 px-5 py-4 hover:bg-[#0F0E0D] transition-colors group">
                  <div className="flex-shrink-0">
                    <span className={`inline-block w-2 h-2 rounded-full ${cfg.dot}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm text-white truncate">{watch.resourcePath}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${cfg.bg} ${cfg.color} uppercase`}>
                        {watch.status}
                      </span>
                      {watch.targetAmount && (
                        <span className="text-xs text-neutral-500">{watch.targetAmount} {watch.currency || 'USDC'}</span>
                      )}
                    </div>
                  </div>
                  {watch.derivedCoordinates && (
                    <button
                      onClick={() => handleCopy(watch.derivedCoordinates, watch.$id)}
                      className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-300 font-mono transition-colors"
                    >
                      {copiedId === watch.$id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      {watch.derivedCoordinates.slice(0, 12)}…
                    </button>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleToggleStatus(watch)}
                      className="text-xs text-neutral-500 hover:text-neutral-200 px-3 py-1.5 rounded-lg hover:bg-[#1E1B19] transition-colors"
                    >
                      {watch.status === 'active' ? 'Pause' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(watch)}
                      className="text-xs text-red-500 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/5 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent Payment Events */}
      {events.length > 0 && (
        <div className="bg-[#141211] border border-[#23211F] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#23211F]">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#ff8800]" />
              <h2 className="font-semibold text-white text-sm">Payment Events</h2>
            </div>
            <span className="text-xs text-neutral-600 bg-[#1E1B19] px-2.5 py-1 rounded-lg">{events.length} total</span>
          </div>
          <div className="divide-y divide-[#1E1B19]">
            {events.slice(0, 8).map((event) => {
              const cfg = EVENT_STATUS_CONFIG[event.status as keyof typeof EVENT_STATUS_CONFIG] || EVENT_STATUS_CONFIG.pending
              return (
                <div key={event.$id} className="flex items-center gap-4 px-5 py-4 hover:bg-[#0F0E0D] transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm text-white">#{event.eventId?.slice(0, 8)}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${cfg.bg} ${cfg.color} uppercase`}>
                        {event.status}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {event.amount} {event.currency}
                      </span>
                    </div>
                  </div>
                  {event.createdAt && (
                    <span className="text-xs text-neutral-600">
                      {new Date(event.createdAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
