'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronDown,
  ChevronUp,
  Target,
  IndianRupee,
  Eye,
  Megaphone,
} from 'lucide-react'
import AdsList from './AdsList'

type AdSet = {
  id: string
  name: string
  status: string
  daily_budget?: string
  targeting?: Record<string, unknown>
  optimization_goal?: string
}

export default function AdsetsList({
  adsets,
}: {
  adsets: Array<Record<string, unknown>>
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (adsets.length === 0) {
    return (
      <div className="text-center py-8 rounded-xl border border-dashed border-[rgba(109,40,217,0.2)] bg-gray-50">
        <Megaphone className="mx-auto w-8 h-8 text-[#6F7192] mb-2" />
        <p className="text-sm text-[#6F7192]">No ad sets in this campaign</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {adsets.map((adset, index) => {
        const as = adset as AdSet
        const isExpanded = expandedId === as.id

        return (
          <motion.div
            key={as.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="rounded-xl border border-[rgba(109,40,217,0.12)] bg-white overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : as.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 text-left">
                <Target className="w-4 h-4 text-[#6d28d9]" />
                <div>
                  <div className="text-sm font-medium text-[#0F1B3D]">{as.name}</div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-[#6F7192]">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      as.status === 'ACTIVE'
                        ? 'text-emerald-600 bg-emerald-50'
                        : as.status === 'PAUSED'
                          ? 'text-amber-600 bg-amber-50'
                          : 'text-[#6F7192] bg-gray-100'
                    }`}>
                      {as.status}
                    </span>
                    {as.daily_budget && (
                      <span className="inline-flex items-center gap-0.5">
                        <IndianRupee className="w-3 h-3" />
                        ₹{(Number(as.daily_budget) / 100).toLocaleString('en-IN')}/day
                      </span>
                    )}
                    {as.optimization_goal && (
                      <span>{as.optimization_goal.replace(/_/g, ' ')}</span>
                    )}
                  </div>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-[#6F7192]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#6F7192]" />
              )}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-100">
                <div className="mt-3">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-[#6F7192] mb-2">
                    <Eye className="w-3.5 h-3.5" />
                    Ads in this ad set
                  </div>
                  <AdsList adSetId={as.id} />
                </div>
              </div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
