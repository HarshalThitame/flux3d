'use client';

import { useState } from 'react';
import { Printer, Plus, X, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface PrintAttempt {
  id: string;
  attempt_number: number;
  status: string;
  failure_reason?: string;
  operator_notes?: string;
  material_used_grams?: number;
  filament_type?: string;
  filament_color?: string;
  started_at: string;
  completed_at?: string;
}

interface ProductionJob {
  id: string;
  printer_name?: string;
  status: string;
  priority: string;
  estimated_time_mins?: number;
  actual_time_mins?: number;
  production_started_at?: string;
  production_completed_at?: string;
  oms_print_attempts?: PrintAttempt[];
}

interface ProductionPanelProps {
  orderId: string;
  jobs: ProductionJob[];
  onUpdate: () => void;
}

const JOB_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  QUEUED:     { label: 'Queued',     color: 'bg-gray-100 text-gray-600' },
  PRINTING:   { label: 'Printing',   color: 'bg-violet-100 text-violet-700' },
  COMPLETED:  { label: 'Completed',  color: 'bg-green-100 text-green-700' },
  FAILED:     { label: 'Failed',     color: 'bg-red-100 text-red-700' },
  QC_FAILED:  { label: 'QC Failed',  color: 'bg-orange-100 text-orange-700' },
  QC_PASSED:  { label: 'QC Passed',  color: 'bg-emerald-100 text-emerald-700' },
};

const FAILURE_REASONS = [
  'Bed Adhesion', 'Spaghetti', 'Layer Shift', 'Warping',
  'Nozzle Issue', 'Filament Issue', 'Model Error',
  'Power Failure', 'Printer Error', 'Other',
];

const PRINTERS = ['Bambu Lab X1C', 'Bambu Lab H2D', 'Bambu Lab P1S', 'Creality Ender 3', 'Prusa i3 MK4', 'Other'];

export default function ProductionPanel({ orderId, jobs, onUpdate }: ProductionPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ printerName: '', estimatedTimeMins: '', priority: 'NORMAL' });

  const create = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/oms/orders/${orderId}/production`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { setShowForm(false); setForm({ printerName: '', estimatedTimeMins: '', priority: 'NORMAL' }); onUpdate(); }
      else { const d = await res.json(); alert(d.error); }
    } finally { setLoading(false); }
  };

  const updateJob = async (jobId: string, status: string) => {
    await fetch(`/api/admin/oms/orders/${orderId}/production`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, status }),
    });
    onUpdate();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2">
          <Printer className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Production</h3>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? 'Cancel' : 'Add Job'}
        </button>
      </div>

      {showForm && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Printer</label>
              <select
                value={form.printerName}
                onChange={e => setForm(p => ({ ...p, printerName: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select printer...</option>
                {PRINTERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Est. Time (mins)</label>
              <input
                type="number" min={0}
                value={form.estimatedTimeMins}
                onChange={e => setForm(p => ({ ...p, estimatedTimeMins: e.target.value }))}
                placeholder="320"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
            <div className="flex gap-2">
              {['LOW', 'NORMAL', 'HIGH', 'URGENT'].map(p => (
                <button
                  key={p}
                  onClick={() => setForm(prev => ({ ...prev, priority: p }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${form.priority === p ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >{p}</button>
              ))}
            </div>
          </div>
          <button
            onClick={create} disabled={loading}
            className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creating...' : 'Create Production Job'}
          </button>
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-gray-400">No production jobs yet.</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {jobs.map(job => {
            const cfg = JOB_STATUS_CONFIG[job.status] ?? { label: job.status, color: 'bg-gray-100 text-gray-600' };
            const attempts = job.oms_print_attempts || [];
            return (
              <div key={job.id} className="px-4 py-3 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <Printer className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="text-sm font-medium text-gray-900">{job.printer_name || 'Printer TBD'}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                  {job.priority !== 'NORMAL' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">{job.priority}</span>
                  )}
                  {job.estimated_time_mins && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.floor(job.estimated_time_mins / 60)}h {job.estimated_time_mins % 60}m est.
                    </span>
                  )}
                </div>

                {/* Quick status actions */}
                {job.status === 'QUEUED' && (
                  <div className="flex gap-2">
                    <button onClick={() => updateJob(job.id, 'PRINTING')}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">▶ Start Printing</button>
                  </div>
                )}
                {job.status === 'PRINTING' && (
                  <div className="flex gap-2">
                    <button onClick={() => updateJob(job.id, 'COMPLETED')}
                      className="text-xs text-green-600 hover:text-green-800 font-medium">✓ Mark Complete</button>
                    <button onClick={() => updateJob(job.id, 'FAILED')}
                      className="text-xs text-red-500 hover:text-red-700 font-medium">✕ Mark Failed</button>
                  </div>
                )}
                {job.status === 'COMPLETED' && (
                  <div className="flex gap-2">
                    <button onClick={() => updateJob(job.id, 'QC_PASSED')}
                      className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">✓ QC Passed</button>
                    <button onClick={() => updateJob(job.id, 'QC_FAILED')}
                      className="text-xs text-orange-500 hover:text-orange-700 font-medium">✕ QC Failed</button>
                  </div>
                )}

                {/* Print attempts */}
                {attempts.length > 0 && (
                  <div className="pl-7 space-y-1">
                    {attempts.map(a => (
                      <div key={a.id} className="flex items-center gap-2 text-xs text-gray-500">
                        {a.status === 'COMPLETED'
                          ? <CheckCircle className="w-3 h-3 text-green-500" />
                          : <AlertTriangle className="w-3 h-3 text-red-400" />
                        }
                        <span>Attempt #{a.attempt_number}</span>
                        {a.failure_reason && <span className="text-red-500">· {a.failure_reason}</span>}
                        {a.material_used_grams && <span>· {a.material_used_grams}g</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
