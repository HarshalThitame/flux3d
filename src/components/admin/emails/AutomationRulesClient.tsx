'use client'

import { useState, useCallback } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import AutomationRulesList from './AutomationRulesList'
import AutomationRuleBuilder from './AutomationRuleBuilder'
import type { EmailAutomationRuleRow, EmailTemplateRow } from 'types/database'

export default function AutomationRulesClient({
  initialRules,
  initialTemplates,
}: {
  initialRules: Array<EmailAutomationRuleRow & { email_templates?: { name: string; email_type: string } }>
  initialTemplates: EmailTemplateRow[]
}) {
  const [rules, setRules] = useState(initialRules)
  const [templates] = useState(initialTemplates)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<EmailAutomationRuleRow | null>(null)
  const [loading, setLoading] = useState(false)

  const refreshRules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/email-automation-rules?limit=100')
      if (res.ok) {
        const json = await res.json()
        setRules(json.data ?? [])
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }, [])

  const handleCreate = useCallback(
    async (data: Omit<EmailAutomationRuleRow, 'id' | 'created_at' | 'updated_at'>) => {
      const res = await fetch('/api/admin/email-automation-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to create rule')
      }
      await refreshRules()
    },
    [refreshRules]
  )

  const handleUpdate = useCallback(
    async (data: Omit<EmailAutomationRuleRow, 'id' | 'created_at' | 'updated_at'>) => {
      if (!editingRule) return
      const res = await fetch(`/api/admin/email-automation-rules/${editingRule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? 'Failed to update rule')
      }
      setEditingRule(null)
      await refreshRules()
    },
    [editingRule, refreshRules]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/admin/email-automation-rules/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        alert(json.error ?? 'Failed to delete rule')
        return
      }
      await refreshRules()
    },
    [refreshRules]
  )

  const handleToggle = useCallback(
    async (id: string, enabled: boolean) => {
      const res = await fetch(`/api/admin/email-automation-rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: enabled }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        alert(json.error ?? 'Failed to toggle rule')
        return
      }
      await refreshRules()
    },
    [refreshRules]
  )

  const openCreate = () => {
    setEditingRule(null)
    setBuilderOpen(true)
  }

  const openEdit = (rule: EmailAutomationRuleRow) => {
    setEditingRule(rule)
    setBuilderOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B3D]">Email Automation</h1>
          <p className="text-sm text-[#6F7192] mt-1">
            Configure rules that trigger emails based on business events.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#4c1d95] min-h-[44px]"
        >
          <Plus className="h-4 w-4" />
          Add Rule
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-[#6F7192]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Refreshing rules…
        </div>
      )}

      <AutomationRulesList
        rules={rules}
        templates={templates}
        onEdit={openEdit}
        onDelete={handleDelete}
        onToggle={handleToggle}
      />

      {builderOpen && (
        <AutomationRuleBuilder
          templates={templates}
          editingRule={editingRule}
          onClose={() => {
            setBuilderOpen(false)
            setEditingRule(null)
          }}
          onSave={editingRule ? handleUpdate : handleCreate}
        />
      )}
    </div>
  )
}
