'use client'

import { useState, useCallback } from 'react'
import { Edit2, Trash2, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import type { EmailAutomationRuleRow, EmailTemplateRow } from 'types/database'

const AUDIENCE_LABELS: Record<string, string> = {
  customer: 'Customer',
  admin: 'Admin',
  both: 'Both',
}

const AUDIENCE_BADGE: Record<string, string> = {
  customer: 'bg-blue-50 text-blue-700 border-blue-200',
  admin: 'bg-purple-50 text-purple-700 border-purple-200',
  both: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

function formatDelay(minutes: number): string {
  if (minutes === 0) return 'Immediate'
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`
  if (minutes < 1440) {
    const h = Math.round(minutes / 60)
    return `${h} hour${h > 1 ? 's' : ''}`
  }
  const d = Math.round(minutes / 1440)
  return `${d} day${d > 1 ? 's' : ''}`
}

export default function AutomationRulesList({
  rules,
  templates,
  onEdit,
  onDelete,
  onToggle,
}: {
  rules: Array<EmailAutomationRuleRow & { email_templates?: { name: string; email_type: string } }>
  templates: EmailTemplateRow[]
  onEdit: (rule: EmailAutomationRuleRow) => void
  onDelete: (id: string) => void
  onToggle: (id: string, enabled: boolean) => void
}) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())

  const grouped = rules.reduce<Record<string, typeof rules>>((acc, rule) => {
    const key = rule.event_name
    if (!acc[key]) acc[key] = []
    acc[key].push(rule)
    return acc
  }, {})

  const toggleExpand = useCallback((event: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev)
      if (next.has(event)) next.delete(event)
      else next.add(event)
      return next
    })
  }, [])

  const eventNames = Object.keys(grouped).sort()

  return (
    <div className="space-y-4">
      {eventNames.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-16">
          <p className="text-sm text-[#6F7192]">No automation rules configured yet.</p>
          <p className="mt-1 text-xs text-[#6F7192]">Click "Add Rule" to create your first automation.</p>
        </div>
      )}

      {eventNames.map((eventName) => {
        const eventRules = grouped[eventName]
        const isExpanded = expandedEvents.has(eventName) || eventRules.length <= 2

        return (
          <div key={eventName} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50/50 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#0F1B3D] capitalize">
                  {eventName.replace(/_/g, ' ')}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-[#6F7192]">
                  {eventRules.length} rule{eventRules.length > 1 ? 's' : ''}
                </span>
              </div>
              {eventRules.length > 2 && (
                <button
                  type="button"
                  onClick={() => toggleExpand(eventName)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#6d28d9] hover:text-[#4c1d95] transition"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" /> Collapse
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" /> Expand
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="divide-y divide-gray-100">
              {eventRules.slice(0, isExpanded ? undefined : 2).map((rule) => {
                const template = templates.find((t) => t.id === rule.template_id)
                const audience = rule.target_audience ?? 'customer'

                return (
                  <div
                    key={rule.id}
                    className={`flex items-center justify-between px-5 py-4 transition ${
                      rule.is_enabled ? '' : 'opacity-60'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[#0F1B3D]">
                          → {template?.name ?? 'Unknown Template'}
                        </span>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${AUDIENCE_BADGE[audience]}`}
                        >
                          {AUDIENCE_LABELS[audience]}
                        </span>
                        {rule.priority !== 0 && (
                          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-[#6F7192]">
                            Priority {rule.priority > 0 ? '+' : ''}{rule.priority}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-[#6F7192]">
                        Delay: {formatDelay(rule.delay_minutes ?? 0)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <button
                        type="button"
                        onClick={() => onToggle(rule.id, !rule.is_enabled)}
                        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                          rule.is_enabled ? 'bg-[#6d28d9]' : 'bg-gray-200'
                        }`}
                        aria-pressed={rule.is_enabled}
                        title={rule.is_enabled ? 'Disable rule' : 'Enable rule'}
                      >
                        <span
                          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                            rule.is_enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => onEdit(rule)}
                        className="rounded-lg p-1.5 text-[#6F7192] transition hover:bg-gray-100 hover:text-[#0F1B3D]"
                        title="Edit rule"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Delete this automation rule?')) onDelete(rule.id)
                        }}
                        className="rounded-lg p-1.5 text-[#6F7192] transition hover:bg-red-50 hover:text-red-600"
                        title="Delete rule"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
