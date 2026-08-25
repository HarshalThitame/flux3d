'use client'

import { useState } from 'react'
import type { ProfileDetailsData, ProfileSavedAddress } from './types'
import { SectionLabel, formatAddress } from './ui'

export default function AddressesSection({
  profile,
  onAdd,
  onEdit,
}: {
  profile: ProfileDetailsData
  onAdd: () => void
  onEdit: (address: ProfileSavedAddress) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const addresses = profile.addresses
  const visible = expanded ? addresses : addresses.slice(0, 2)
  const hiddenCount = addresses.length - visible.length

  return (
    <div className="px-6 py-8 sm:px-10">
      <div className="flex items-center justify-between gap-4">
        <SectionLabel>Saved Addresses</SectionLabel>
        <button
          type="button"
          onClick={onAdd}
          className="text-[13px] font-semibold text-[var(--accent-primary)] transition hover:text-[var(--accent-primary-deep)]"
        >
          + Add address
        </button>
      </div>

      {addresses.length === 0 ? (
        <p className="mt-5 text-sm leading-7 text-[var(--text-faint)]">
          No addresses saved yet. Add one to speed up checkout.
        </p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {visible.map((address) => (
            <button
              key={address.id}
              type="button"
              onClick={() => onEdit(address)}
              className="group rounded-2xl border border-[var(--line-subtle)] bg-white p-4 text-left transition hover:border-[var(--accent-gold)] hover:shadow-[var(--shadow-card)]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                  {address.city}, {address.state}
                </span>
                {address.isDefault && (
                  <span className="shrink-0 rounded-full bg-[var(--fill-gold-soft)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-gold-deep)]">
                    Default
                  </span>
                )}
              </div>
              <p className="mt-1.5 line-clamp-2 break-words text-[13px] leading-6 text-[var(--text-muted)]">
                {formatAddress(address)}
              </p>
              <span className="mt-2 inline-block text-[12px] font-semibold text-[var(--accent-primary)] opacity-0 transition group-hover:opacity-100 max-sm:opacity-100">
                Edit
              </span>
            </button>
          ))}
        </div>
      )}

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-4 text-[13px] font-semibold text-[var(--accent-primary)] transition hover:text-[var(--accent-primary-deep)]"
        >
          Show {hiddenCount} more {hiddenCount === 1 ? 'address' : 'addresses'}
        </button>
      )}
    </div>
  )
}
