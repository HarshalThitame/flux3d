'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, Clock, Inbox, UserX } from 'lucide-react'

interface TicketStatsData {
  open: number
  pending: number
  urgent: number
  unassigned: number
  today: number
  resolvedToday: number
  avgFirstResponseMinutes: number | null
}

export default function TicketStats() {
  const [stats, setStats] = useState<TicketStatsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/support/stats')
        if (!res.ok) throw new Error('Failed to load stats')
        const json = (await res.json()) as TicketStatsData
        setStats(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats')
      }
    }
    void load()
  }, [])

  if (error) return null
  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    )
  }

  const cards = [
    { label: 'Open', value: stats.open, icon: Inbox, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'In Progress', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Urgent', value: stats.urgent, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Unassigned', value: stats.unassigned, icon: UserX, color: 'text-blue-600', bg: 'bg-blue-50' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="rounded-2xl border border-gray-200 bg-white p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-[#6F7192]">{card.label}</div>
              <div className="mt-1 text-2xl font-bold text-[#0F1B3D]">{card.value}</div>
            </div>
            <div className={`rounded-xl ${card.bg} p-2`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
