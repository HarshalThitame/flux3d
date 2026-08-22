'use client'

import Image from 'next/image'
import { Archive, CalendarClock, Globe, Trash2 } from 'lucide-react'
import { useProductEditor } from '../editor-context'
import { AiAssistButton } from '../AiAssist'
import { FieldError, Section, Toggle, inputClass } from '../ui'

function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function SeoVisibilitySection() {
  const { product, errors, updateProduct, markTouched, archiveProduct, publishBlockers } = useProductEditor()

  const title = product.meta_title.trim() || product.name || 'Product title'
  const description = product.meta_description.trim() || product.description.trim() || 'Product description goes here…'
  const productUrl = product.slug ? `/3d-shop/product/${product.slug}` : '/3d-shop/product/{slug}'
  const previewImage = product.landscape_image_url || product.thumbnail_url || undefined
  const scheduledLocal = isoToLocalInput(product.published_at)

  function onScheduleChange(value: string) {
    updateProduct('published_at', value ? new Date(value).toISOString() : null)
  }

  function clearSchedule() {
    updateProduct('published_at', null)
  }

  const isScheduled = Boolean(product.published_at)
  const scheduleLabel = isScheduled
    ? `Scheduled for ${new Date(product.published_at as string).toLocaleString()}${product.is_active ? ' · live now' : ''}`
    : ''

  return (
    <Section title="SEO & Visibility" description="Live search preview, scheduled publishing, metadata, and archival state.">
      {/* Live preview card */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6F7192]">
            <Globe className="h-3 w-3" />
            Google preview
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="text-xs text-emerald-700">flux3d.com › {productUrl}</div>
            <div className="mt-1 cursor-pointer text-lg leading-snug text-[#1a0dab] hover:underline">
              {title.length > 60 ? `${title.slice(0, 60)}…` : title}
            </div>
            <div className="mt-1 text-sm leading-snug text-[#4d5156]">
              {description.length > 160 ? `${description.slice(0, 160)}…` : description}
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6F7192]">Social share preview</div>
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            {previewImage ? (
              <div className="relative aspect-[1.91/1] bg-gray-100">
                <Image src={previewImage} alt="" fill sizes="600px" className="object-cover" />
              </div>
            ) : (
              <div className="flex aspect-[1.91/1] items-center justify-center bg-gradient-to-br from-[#6d28d9]/10 to-[#7c3aed]/10 text-xs text-[#6F7192]">
                Add a thumbnail to see the social card
              </div>
            )}
            <div className="space-y-1 p-4">
              <div className="text-[11px] uppercase tracking-wider text-[#6F7192]">flux3d.com</div>
              <div className="line-clamp-2 text-sm font-semibold text-[#0F1B3D]">{title}</div>
              <div className="line-clamp-2 text-xs text-[#6F7192]">{description}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled publishing */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-[#0F1B3D]">
              <CalendarClock className="h-4 w-4 text-[#6d28d9]" />
              Schedule auto-publish
            </div>
            <div className="mt-0.5 text-xs text-[#6F7192]">
              Sets a future date to go live automatically. The product stays a draft until then.
            </div>
          </div>
          {isScheduled && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-[#6d28d9]/10 text-[#6d28d9]'
              }`}
            >
              {scheduleLabel}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="datetime-local"
            value={scheduledLocal}
            onChange={(event) => onScheduleChange(event.target.value)}
            aria-label="Schedule publish date and time"
            className={inputClass}
          />
          {scheduledLocal && (
            <button
              type="button"
              onClick={clearSchedule}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear schedule
            </button>
          )}
        </div>
      </div>

      <Toggle checked={product.is_featured} onChange={(checked) => updateProduct('is_featured', checked)} label="Is Featured" description="Appears in the Shop featured row." />

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="block text-xs font-medium text-[#6F7192]" htmlFor="meta-title">
            Meta Title
          </label>
          <AiAssistButton kind="meta_title" compact label="AI" title="Generate SEO meta title with AI" />
        </div>
        <input
          id="meta-title"
          value={product.meta_title}
          onChange={(event) => updateProduct('meta_title', event.target.value)}
          onBlur={() => markTouched('meta_title')}
          placeholder="Optional. Defaults to product name."
          className={`${inputClass} ${errors.meta_title ? 'border-rose-300 bg-rose-50/30' : ''}`}
        />
        <div className="mt-1 flex items-center justify-between gap-2">
          <FieldError message={errors.meta_title} />
          <span className={`ml-auto text-xs ${product.meta_title.length > 60 ? 'font-semibold text-rose-600' : 'text-[#6F7192]'}`}>
            {product.meta_title.length}/60
          </span>
        </div>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="block text-xs font-medium text-[#6F7192]" htmlFor="meta-description">
            Meta Description
          </label>
          <AiAssistButton kind="meta_description" compact label="AI" title="Generate SEO meta description with AI" />
        </div>
        <textarea
          id="meta-description"
          maxLength={160}
          rows={3}
          value={product.meta_description}
          onChange={(event) => updateProduct('meta_description', event.target.value)}
          onBlur={() => markTouched('meta_description')}
          placeholder="Optional. A concise summary shown in search results."
          className={`${inputClass} resize-none ${errors.meta_description ? 'border-rose-300 bg-rose-50/30' : ''}`}
        />
        <div className="mt-1 flex items-center justify-between gap-2">
          <FieldError message={errors.meta_description} />
          <span className={`ml-auto text-xs ${product.meta_description.length > 160 ? 'font-semibold text-rose-600' : 'text-[#6F7192]'}`}>
            {product.meta_description.length}/160
          </span>
        </div>
      </div>

      {publishBlockers.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm font-semibold text-amber-800">Ready to publish checklist</div>
          <ul className="mt-2 space-y-1">
            {publishBlockers.map((blocker) => (
              <li key={blocker} className="flex items-center gap-2 text-sm text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {blocker}
              </li>
            ))}
          </ul>
        </div>
      )}

      {product.id && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="text-sm font-semibold text-rose-700">Danger Zone</div>
          <p className="mt-1 text-sm text-rose-600">Archive hides this product without hard deleting it.</p>
          <button
            type="button"
            onClick={() => void archiveProduct()}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Archive className="h-4 w-4" />
            Archive Product
          </button>
        </div>
      )}
    </Section>
  )
}
