'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Loader2,
  AlertCircle,
  Image,
  Megaphone,
} from 'lucide-react'

type Ad = {
  id: string
  name: string
  status: string
  creative?: { id: string; name?: string }
  preview_shareable_link?: string
}

export default function AdsList({ adSetId }: { adSetId: string }) {
  const [ads, setAds] = useState<Ad[]>([])
  const [loading, setLoading] = useState(() => true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch(`/api/admin/ads/campaigns/${adSetId}/ads`)
      .then((res) => res.json())
      .then((data: { ads?: Ad[]; error?: string }) => {
        if (cancelled) return
        if (data.error) throw new Error(data.error)
        setAds(data.ads ?? [])
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load ads')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [adSetId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 text-[#6d28d9] animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-400/20 bg-rose-50 p-3 text-xs text-rose-600 flex items-start gap-2">
        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>{error}</span>
      </div>
    )
  }

  if (ads.length === 0) {
    return (
      <div className="text-center py-4">
        <Megaphone className="mx-auto w-6 h-6 text-[#6F7192] mb-1" />
        <p className="text-xs text-[#6F7192]">No ads in this ad set</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {ads.map((ad, index) => (
        <motion.div
          key={ad.id}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.04 }}
          className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
        >
          <div className="flex items-center gap-2.5">
            <Image className="w-3.5 h-3.5 text-[#6d28d9]" aria-label="Ad creative" />
            <div>
              <div className="text-xs font-medium text-[#0F1B3D]">{ad.name}</div>
              {ad.creative?.name && (
                <div className="text-[10px] text-[#6F7192]">{ad.creative.name}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
              ad.status === 'ACTIVE'
                ? 'text-emerald-600 bg-emerald-50'
                : ad.status === 'PAUSED'
                  ? 'text-amber-600 bg-amber-50'
                  : 'text-[#6F7192] bg-gray-100'
            }`}>
              {ad.status}
            </span>
            {ad.preview_shareable_link && (
              <a
                href={ad.preview_shareable_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-[#6d28d9] hover:underline"
              >
                Preview
              </a>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
