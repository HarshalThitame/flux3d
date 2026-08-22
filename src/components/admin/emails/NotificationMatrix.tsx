'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export type MatrixRow = {
  event_name: string
  label: string
  customer: { enabled: boolean; ruleId: string } | null
  admin: { enabled: boolean; ruleId: string } | null
}

export default function NotificationMatrix({
  initialMatrix,
}: {
  initialMatrix: MatrixRow[]
}) {
  const [matrix, setMatrix] = useState<MatrixRow[]>(initialMatrix)
  const [loadingCell, setLoadingCell] = useState<string | null>(null)

  const refreshMatrix = async () => {
    try {
      const res = await fetch('/api/admin/email-automation-rules/matrix')
      if (res.ok) {
        const json = await res.json()
        setMatrix(json.data ?? [])
      }
    } catch {
      // silent fail on refresh
    }
  }

  const toggle = async (
    eventName: string,
    targetAudience: 'customer' | 'admin',
    currentEnabled: boolean
  ) => {
    const cellKey = `${eventName}-${targetAudience}`
    setLoadingCell(cellKey)
    try {
      const res = await fetch('/api/admin/email-automation-rules/matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name: eventName,
          target_audience: targetAudience,
          enabled: !currentEnabled,
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        alert(json.error ?? 'Toggle failed')
        return
      }

      // Refresh matrix to pick up newly created ruleIds or updated states
      await refreshMatrix()
    } catch {
      alert('Network error')
    } finally {
      setLoadingCell(null)
    }
  }

  const ToggleSwitch = ({
    checked,
    onChange,
    disabled,
    label,
  }: {
    checked: boolean
    onChange: () => void
    disabled?: boolean
    label?: string
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#6d28d9] focus:ring-offset-2 ${
        checked ? 'bg-[#6d28d9]' : 'bg-gray-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1B3D]">Notification Matrix</h1>
        <p className="text-sm text-[#6F7192] mt-1">
          Toggle which emails are sent to customers and admins for each business event.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wider text-[#6F7192]">
            <tr>
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium text-center">Customer</th>
              <th className="px-4 py-3 font-medium text-center">Admin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {matrix.map((row) => (
              <tr key={row.event_name} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-[#0F1B3D]">{row.label}</td>
                <td className="px-4 py-3 text-center">
                  {row.customer !== null ? (
                    <div className="flex items-center justify-center">
                      {loadingCell === `${row.event_name}-customer` ? (
                        <Loader2 className="h-5 w-5 animate-spin text-[#6d28d9]" />
                      ) : (
                        <ToggleSwitch
                          checked={row.customer.enabled}
                          onChange={() =>
                            toggle(row.event_name, 'customer', row.customer!.enabled)
                          }
                          label={`${row.label} - customer notification`}
                        />
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {row.admin !== null ? (
                    <div className="flex items-center justify-center">
                      {loadingCell === `${row.event_name}-admin` ? (
                        <Loader2 className="h-5 w-5 animate-spin text-[#6d28d9]" />
                      ) : (
                        <ToggleSwitch
                          checked={row.admin.enabled}
                          onChange={() =>
                            toggle(row.event_name, 'admin', row.admin!.enabled)
                          }
                          label={`${row.label} - admin notification`}
                        />
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
