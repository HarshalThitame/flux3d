'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Clock, User, Tag, ArrowRightCircle, MessageSquare, StickyNote } from 'lucide-react'

interface TicketEvent {
  id: string
  event_type: string
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  performedByName: string
  created_at: string
}

interface TicketEventLogProps {
  events: TicketEvent[]
}

export default function TicketEventLog({ events }: TicketEventLogProps) {
  const [expanded, setExpanded] = useState(false)

  if (!events || events.length === 0) return null

  const visibleEvents = expanded ? events : events.slice(-3)

  function formatEvent(event: TicketEvent): { icon: React.ReactNode; text: string } {
    switch (event.event_type) {
      case 'ticket.created':
        return { icon: <Tag className="h-3.5 w-3.5" />, text: 'Ticket created' }
      case 'status.changed':
        return {
          icon: <ArrowRightCircle className="h-3.5 w-3.5" />,
          text: `Status changed from ${String((event.old_value as Record<string, unknown>)?.status ?? '-')} to ${String((event.new_value as Record<string, unknown>)?.status ?? '-')}`,
        }
      case 'priority.changed':
        return {
          icon: <Tag className="h-3.5 w-3.5" />,
          text: `Priority changed from ${String((event.old_value as Record<string, unknown>)?.priority ?? '-')} to ${String((event.new_value as Record<string, unknown>)?.priority ?? '-')}`,
        }
      case 'category.changed':
        return {
          icon: <Tag className="h-3.5 w-3.5" />,
          text: `Category changed from ${String((event.old_value as Record<string, unknown>)?.category ?? '-')} to ${String((event.new_value as Record<string, unknown>)?.category ?? '-')}`,
        }
      case 'ticket.assigned':
        return { icon: <User className="h-3.5 w-3.5" />, text: 'Ticket assigned' }
      case 'admin.replied':
        return { icon: <MessageSquare className="h-3.5 w-3.5" />, text: 'Admin replied' }
      case 'customer.replied':
        return { icon: <MessageSquare className="h-3.5 w-3.5" />, text: 'Customer replied' }
      case 'internal_note.added':
        return { icon: <StickyNote className="h-3.5 w-3.5" />, text: 'Internal note added' }
      case 'ticket.resolved':
        return { icon: <ArrowRightCircle className="h-3.5 w-3.5" />, text: 'Ticket resolved' }
      case 'ticket.reopened':
        return { icon: <ArrowRightCircle className="h-3.5 w-3.5" />, text: 'Ticket reopened' }
      default:
        return { icon: <Clock className="h-3.5 w-3.5" />, text: event.event_type }
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-[#0F1B3D]">Activity Log</h2>
      </div>
      <div className="space-y-2 p-4">
        {visibleEvents.map((event) => {
          const { icon, text } = formatEvent(event)
          return (
            <div key={event.id} className="flex items-start gap-2 text-xs">
              <div className="mt-0.5 text-[#6F7192]">{icon}</div>
              <div className="flex-1">
                <span className="text-[#0F1B3D]">{text}</span>
                <span className="ml-1 text-[#6F7192]">by {event.performedByName}</span>
              </div>
              <span className="shrink-0 text-[11px] text-gray-400">{formatDate(event.created_at)}</span>
            </div>
          )
        })}

        {events.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-1 flex items-center gap-1 text-xs font-medium text-[#6d28d9] hover:underline"
          >
            {expanded ? (
              <>
                <ChevronDown className="h-3 w-3" /> Show less
              </>
            ) : (
              <>
                <ChevronRight className="h-3 w-3" /> Show all {events.length} events
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
