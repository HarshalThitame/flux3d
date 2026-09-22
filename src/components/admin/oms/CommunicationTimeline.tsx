'use client';

import { useState } from 'react';
import { MessageCircle, Mail, Phone, FileText, Plus, X } from 'lucide-react';

interface Communication {
  id: string;
  channel: string;
  direction: string;
  subject?: string;
  body: string;
  communicated_at: string;
}

const CHANNEL_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  whatsapp: { icon: MessageCircle, label: 'WhatsApp', color: 'text-green-600 bg-green-50' },
  email:    { icon: Mail,          label: 'Email',    color: 'text-blue-600 bg-blue-50' },
  phone:    { icon: Phone,         label: 'Phone',    color: 'text-violet-600 bg-violet-50' },
  sms:      { icon: MessageCircle, label: 'SMS',      color: 'text-yellow-600 bg-yellow-50' },
  note:     { icon: FileText,      label: 'Note',     color: 'text-gray-600 bg-gray-100' },
  system:   { icon: FileText,      label: 'System',   color: 'text-gray-400 bg-gray-50' },
};

interface CommunicationTimelineProps {
  orderId: string;
  communications: Communication[];
  onAdded: () => void;
}

export default function CommunicationTimeline({ orderId, communications, onAdded }: CommunicationTimelineProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ channel: 'note', direction: 'internal', subject: '', body: '' });

  const add = async () => {
    if (!form.body.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/oms/orders/${orderId}/communications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ channel: 'note', direction: 'internal', subject: '', body: '' });
        onAdded();
      } else {
        const d = await res.json();
        alert(d.error);
      }
    } finally { setLoading(false); }
  };

  const sorted = [...communications].sort(
    (a, b) => new Date(a.communicated_at).getTime() - new Date(b.communicated_at).getTime()
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Communication</h3>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? 'Cancel' : 'Add Note'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="px-4 py-3 border-b border-gray-100 bg-blue-50/30 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Channel</label>
              <select
                value={form.channel}
                onChange={e => setForm(p => ({ ...p, channel: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {Object.entries(CHANNEL_CONFIG).filter(([k]) => k !== 'system').map(([k, c]) => (
                  <option key={k} value={k}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Direction</label>
              <select
                value={form.direction}
                onChange={e => setForm(p => ({ ...p, direction: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="inbound">Inbound (Customer → Us)</option>
                <option value="outbound">Outbound (Us → Customer)</option>
                <option value="internal">Internal Note</option>
              </select>
            </div>
          </div>
          {form.channel === 'email' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
              <input type="text" value={form.subject}
                onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Message / Note *</label>
            <textarea
              value={form.body}
              onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
              rows={3}
              placeholder="e.g. Customer confirmed white color via WhatsApp..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={add} disabled={loading || !form.body.trim()}
            className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Adding...' : 'Add to Timeline'}
          </button>
        </div>
      )}

      {/* Timeline */}
      {sorted.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-gray-400">No communications logged yet.</div>
      ) : (
        <div className="relative px-4 py-3">
          {/* Vertical line */}
          <div className="absolute left-[28px] top-6 bottom-3 w-px bg-gray-100" />
          <div className="space-y-4">
            {sorted.map((comm) => {
              const cfg = CHANNEL_CONFIG[comm.channel] ?? CHANNEL_CONFIG.note;
              const Icon = cfg.icon;
              return (
                <div key={comm.id} className="flex gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${cfg.color}`}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs font-semibold text-gray-700">{cfg.label}</span>
                      {comm.direction === 'inbound' && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 rounded">Inbound</span>
                      )}
                      {comm.direction === 'internal' && (
                        <span className="text-[10px] bg-yellow-50 text-yellow-700 px-1.5 rounded">Internal</span>
                      )}
                      <span className="text-[10px] text-gray-400">
                        {new Date(comm.communicated_at).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    {comm.subject && <p className="text-xs font-medium text-gray-700 mb-0.5">{comm.subject}</p>}
                    <p className="text-sm text-gray-600 leading-relaxed">{comm.body}</p>
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
