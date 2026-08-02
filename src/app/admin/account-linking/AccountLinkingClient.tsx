'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'

type LinkRequest = {
  id: string
  token: string
  initiated_from: string
  method: string
  target_user_id: string | null
  target_phone: string
  target_email: string | null
  otp_code_hash: string | null
  expires_at: string
  confirmed_at: string | null
  ip_address: string | null
  created_at: string
}

type ConsentLog = {
  id: string
  user_id: string | null
  phone_number: string | null
  consent_type: string
  granted: boolean
  method: string
  ip_address: string | null
  details: Record<string, unknown> | null
  timestamp: string
  withdrawn_at: string | null
}

type MergeResult = {
  orders_attributed: number
}

export default function AccountLinkingPage() {
  const [linkRequests, setLinkRequests] = useState<LinkRequest[]>([])
  const [consentLogs, setConsentLogs] = useState<ConsentLog[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'requests' | 'consent'>('requests')
  const [toast, setToast] = useState<AdminToastState>(null)
  const [mergingId, setMergingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const [requestsRes, consentRes] = await Promise.all([
        fetch('/api/admin/account-linking/requests'),
        fetch('/api/admin/account-linking/consent'),
      ])
      if (requestsRes.ok) {
        const data = await requestsRes.json()
        setLinkRequests(data.requests ?? [])
      }
      if (consentRes.ok) {
        const data = await consentRes.json()
        setConsentLogs(data.logs ?? [])
      }
    } catch (error) {
      console.error('[admin] Failed to fetch account linking data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    window.setTimeout(() => void fetchData(), 0)
  }, [fetchData])

  async function handleMerge(requestId: string) {
    setMergingId(requestId)
    setToast(null)
    try {
      const res = await fetch('/api/admin/account-linking/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setToast({ type: 'error', message: data.error ?? 'Merge failed' })
      } else {
        setToast({ type: 'success', message: `Merged ${data.orders_attributed} order(s) successfully` })
        fetchData()
      }
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Merge failed' })
    } finally {
      setMergingId(null)
    }
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const statusBadge = (request: LinkRequest) => {
    if (request.confirmed_at) {
      return <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700"><CheckCircle className="h-3 w-3" />Confirmed</span>
    }
    if (new Date(request.expires_at) < new Date()) {
      return <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700"><XCircle className="h-3 w-3" />Expired</span>
    }
    return <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700"><Clock className="h-3 w-3" />Pending</span>
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
        <div className="text-center text-sm text-[#6b7280]">Loading account linking data…</div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#1a1a1a]">Account Linking</h1>
          <p className="mt-1 text-sm text-[#6b7280]">Manage link requests, consent logs, and manual merges.</p>
        </div>
        <button
          type="button"
          onClick={fetchData}
          className="inline-flex items-center gap-2 rounded-xl border border-[#e8e4df] bg-white px-4 py-2 text-sm font-semibold text-[#4b4b4b] transition hover:bg-[#f3f0ff]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="flex gap-2 rounded-xl border border-[#e8e4df] bg-[#faf9f7] p-1">
        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === 'requests' ? 'bg-[#6d28d9] text-white' : 'text-[#4b4b4b] hover:bg-white'}`}
        >
          Link Requests ({linkRequests.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('consent')}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === 'consent' ? 'bg-[#6d28d9] text-white' : 'text-[#4b4b4b] hover:bg-white'}`}
        >
          Consent Logs ({consentLogs.length})
        </button>
      </div>

      {toast && (
        <div className={`rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.message}
        </div>
      )}

      {activeTab === 'requests' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          {linkRequests.length === 0 ? (
            <div className="rounded-2xl border border-[#e8e4df] bg-[#faf9f7] p-8 text-center text-sm text-[#6b7280]">
              No link requests found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#e8e4df] bg-[#faf9f7]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e8e4df] bg-[#f0ede8]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[#4b4b4b]">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[#4b4b4b]">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[#4b4b4b]">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[#4b4b4b]">From</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[#4b4b4b]">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[#4b4b4b]">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-[#4b4b4b]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {linkRequests.map((request) => (
                    <tr key={request.id} className="border-b border-[#e8e4df] last:border-0">
                      <td className="px-4 py-3 font-mono text-[#1a1a1a]">+91 {request.target_phone}</td>
                      <td className="px-4 py-3 text-[#4b4b4b]">{request.target_email ?? '—'}</td>
                      <td className="px-4 py-3 text-[#4b4b4b]">{request.method === 'whatsapp_otp' ? 'WhatsApp OTP' : 'Email Link'}</td>
                      <td className="px-4 py-3 text-[#4b4b4b] capitalize">{request.initiated_from}</td>
                      <td className="px-4 py-3">{statusBadge(request)}</td>
                      <td className="px-4 py-3 text-[#6b7280]">{formatDate(request.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        {!request.confirmed_at && new Date(request.expires_at) > new Date() && (
                          <button
                            type="button"
                            onClick={() => handleMerge(request.id)}
                            disabled={mergingId === request.id}
                            className="rounded-lg bg-[#6d28d9] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4c1d95] disabled:opacity-50"
                          >
                            {mergingId === request.id ? 'Merging…' : 'Merge'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'consent' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          {consentLogs.length === 0 ? (
            <div className="rounded-2xl border border-[#e8e4df] bg-[#faf9f7] p-8 text-center text-sm text-[#6b7280]">
              No consent logs found.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#e8e4df] bg-[#faf9f7]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e8e4df] bg-[#f0ede8]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[#4b4b4b]">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[#4b4b4b]">Granted</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[#4b4b4b]">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[#4b4b4b]">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[#4b4b4b]">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[#4b4b4b]">Withdrawn</th>
                  </tr>
                </thead>
                <tbody>
                  {consentLogs.map((log) => (
                    <tr key={log.id} className="border-b border-[#e8e4df] last:border-0">
                      <td className="px-4 py-3 text-[#1a1a1a] capitalize">{log.consent_type.replace('_', ' ')}</td>
                      <td className="px-4 py-3">
                        {log.granted
                          ? <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700"><CheckCircle className="h-3 w-3" />Yes</span>
                          : <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700"><XCircle className="h-3 w-3" />No</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-[#4b4b4b] capitalize">{log.method.replace('_', ' ')}</td>
                      <td className="px-4 py-3 font-mono text-[#1a1a1a]">{log.phone_number ? `+91 ${log.phone_number}` : '—'}</td>
                      <td className="px-4 py-3 text-[#6b7280]">{formatDate(log.timestamp)}</td>
                      <td className="px-4 py-3 text-[#6b7280]">{log.withdrawn_at ? formatDate(log.withdrawn_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}