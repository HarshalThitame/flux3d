'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Clock3, RefreshCw, Settings2, XCircle } from 'lucide-react'

type Settings = { enabled: boolean; auto_publish: boolean; target_min_words: number; target_max_words: number; minimum_quality_score: number; minimum_uniqueness_score: number; cta_enabled: boolean; excluded_topics: string[] }
type Run = { id: string; status: string; selected_topic?: string | null; model?: string | null; error_message?: string | null; completed_at?: string | null; created_at: string }

export default function BlogAutomationPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [runs, setRuns] = useState<Run[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const load = async () => {
    try {
      const response = await fetch('/api/admin/blog/automation')
      const data = await response.json()
      if (!response.ok) setError(data.error || 'Unable to load automation.')
      else { setSettings(data.settings); setRuns(data.runs || []) }
    } catch { setError('Unable to load automation.') }
  }
  useEffect(() => { void load() }, [])
  const save = async () => {
    if (!settings) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/admin/blog/automation', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) })
      const data = await response.json()
      if (!response.ok) setError(data.error || 'Unable to save settings.')
      else setSettings(data.settings)
    } catch { setError('Unable to save settings.') } finally { setBusy(false) }
  }
  const retry = async (runId: string) => {
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/admin/blog/generate/retry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ runId }) })
      const data = await response.json()
      if (!response.ok) setError(data.error || 'Retry failed.')
      await load()
    } catch { setError('Retry failed.') } finally { setBusy(false) }
  }
  if (!settings) return <div className="p-8 text-[#0F1B3D]">Loading AI automation…</div>
  return <div className="min-h-screen bg-white px-4 py-8 text-[#0F1B3D] md:px-8"><div className="mx-auto max-w-5xl">
    <Link href="/admin/blog" className="inline-flex items-center gap-2 text-sm text-[#6F7192] hover:text-[#0F1B3D]"><ArrowLeft className="h-4 w-4" />Blog management</Link>
    <div className="mt-5 flex flex-wrap items-start justify-between gap-4"><div><h1 className="font-[var(--font-syne)] text-3xl font-bold"><Settings2 className="mr-2 inline h-7 w-7 text-[#6d28d9]" />AI Automation</h1><p className="mt-2 text-sm text-[#6F7192]">QStash runs at 9:00 AM IST every Monday, Wednesday, and Saturday.</p></div><button onClick={() => void save()} disabled={busy} className="rounded-lg bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{busy ? 'Working…' : 'Save settings'}</button></div>
    {error && <p className="mt-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <section className="mt-8 grid gap-5 rounded-2xl border border-gray-200 bg-[#fcfbfa] p-6 md:grid-cols-2">
      <Toggle label="Automation enabled" checked={settings.enabled} onChange={(enabled) => setSettings({ ...settings, enabled })} />
      <Toggle label="Auto-publish qualified posts" checked={settings.auto_publish} onChange={(auto_publish) => setSettings({ ...settings, auto_publish })} />
      <Toggle label="Include Flux3D CTA" checked={settings.cta_enabled} onChange={(cta_enabled) => setSettings({ ...settings, cta_enabled })} />
      <Field label="Minimum quality score" value={settings.minimum_quality_score} onChange={(minimum_quality_score) => setSettings({ ...settings, minimum_quality_score })} />
      <Field label="Minimum uniqueness score" value={settings.minimum_uniqueness_score} onChange={(minimum_uniqueness_score) => setSettings({ ...settings, minimum_uniqueness_score })} />
      <Field label="Target minimum words" value={settings.target_min_words} onChange={(target_min_words) => setSettings({ ...settings, target_min_words })} />
      <Field label="Target maximum words" value={settings.target_max_words} onChange={(target_max_words) => setSettings({ ...settings, target_max_words })} />
      <label className="md:col-span-2"><span className="text-sm font-semibold">Excluded topics</span><input value={settings.excluded_topics.join(', ')} onChange={(event) => setSettings({ ...settings, excluded_topics: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) })} placeholder="e.g. PLA vs PETG" className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></label>
    </section>
    <section className="mt-8"><div className="flex items-center justify-between"><div><h2 className="font-[var(--font-syne)] text-2xl font-bold">Generation history</h2><p className="mt-1 text-sm text-[#6F7192]">Latest research, validation, publishing, and failures.</p></div><button onClick={() => void load()} className="inline-flex items-center gap-2 text-sm font-semibold text-[#6d28d9]"><RefreshCw className="h-4 w-4" />Refresh</button></div>
      <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">{runs.length ? runs.map((run) => <div key={run.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4 last:border-0"><div><p className="font-semibold">{run.selected_topic || 'Topic selection pending'}</p><p className="mt-1 text-xs text-[#6F7192]">{new Date(run.completed_at || run.created_at).toLocaleString('en-IN')} · {run.model || 'Configured model'}</p>{run.error_message && <p className="mt-1 text-xs text-rose-600">{run.error_message}</p>}</div><div className="flex items-center gap-3">{run.status === 'failed' && <button disabled={busy} onClick={() => void retry(run.id)} className="text-xs font-bold text-[#6d28d9] disabled:opacity-50">Retry</button>}<Status status={run.status} /></div></div>) : <p className="p-6 text-sm text-[#6F7192]">No generation runs recorded yet.</p>}</div>
    </section>
  </div></div>
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4 text-sm font-semibold"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-violet-700" /></label> }
function Field({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label><span className="text-sm font-semibold">{label}</span><input type="number" min="0" value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" /></label> }
function Status({ status }: { status: string }) { const classes = status === 'published' ? 'bg-emerald-50 text-emerald-700' : status === 'failed' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'; return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${classes}`}>{status === 'published' ? <CheckCircle2 className="h-3.5 w-3.5" /> : status === 'failed' ? <XCircle className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}{status}</span> }
