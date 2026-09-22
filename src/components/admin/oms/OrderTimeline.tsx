'use client';

import { Circle } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  old_value?: string;
  new_value?: string;
  reason?: string;
  actor_name?: string;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { label: string; color: string }> = {
  ORDER_CREATED:          { label: 'Order Created',           color: 'bg-blue-500' },
  STATUS_CHANGE:          { label: 'Status Changed',          color: 'bg-violet-500' },
  PAYMENT_RECORDED:       { label: 'Payment Recorded',        color: 'bg-green-500' },
  SHIPMENT_CREATED:       { label: 'Shipment Added',          color: 'bg-cyan-500' },
  PRODUCTION_JOB_CREATED: { label: 'Production Job Created',  color: 'bg-purple-500' },
  NOTES_UPDATED:          { label: 'Notes Updated',           color: 'bg-gray-400' },
};

function fmtAction(log: AuditLog): string {
  if (log.action === 'STATUS_CHANGE') {
    return `${log.old_value} → ${log.new_value}`;
  }
  return log.new_value || log.action;
}

interface OrderTimelineProps {
  logs: AuditLog[];
}

export default function OrderTimeline({ logs }: OrderTimelineProps) {
  const sorted = [...logs].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700">Order Timeline</h3>
      </div>

      {sorted.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-gray-400">No history yet.</div>
      ) : (
        <div className="relative px-4 py-3">
          {/* Vertical connector */}
          <div className="absolute left-[27px] top-6 bottom-3 w-px bg-gray-100" />
          <div className="space-y-4">
            {sorted.map((log, i) => {
              const cfg = ACTION_CONFIG[log.action] ?? { label: log.action, color: 'bg-gray-400' };
              return (
                <div key={log.id} className="flex gap-3">
                  <div className={`w-4 h-4 rounded-full mt-0.5 shrink-0 z-10 ring-2 ring-white ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{cfg.label}</p>
                        {fmtAction(log) && (
                          <p className="text-xs text-gray-500 mt-0.5">{fmtAction(log)}</p>
                        )}
                        {log.reason && (
                          <p className="text-xs text-gray-400 mt-0.5 italic">"{log.reason}"</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-gray-400">
                          {new Date(log.created_at).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                        {log.actor_name && (
                          <p className="text-[10px] text-gray-400">{log.actor_name}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
