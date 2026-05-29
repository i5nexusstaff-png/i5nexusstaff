import { useEffect, useState } from 'react';
import { Plus, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { leavesApi } from '../../services/api';
import { useConfirm } from '../../components/ConfirmDialog';

const TYPE_META = {
  casual:  { color: 'from-blue-500 to-indigo-600',    badge: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800' },
  sick:    { color: 'from-red-500 to-rose-600',        badge: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800' },
  earned:  { color: 'from-emerald-500 to-teal-600',   badge: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' },
  unpaid:  { color: 'from-gray-500 to-gray-600',       badge: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700' },
};

const STATUS_META = {
  pending:  { icon: Clock,         badge: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800' },
  approved: { icon: CheckCircle,   badge: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' },
  rejected: { icon: XCircle,       badge: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800' },
};

const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const dayCount = (s, e) => {
  if (!s || !e) return 0;
  return Math.max(0, (new Date(e) - new Date(s)) / (1000 * 60 * 60 * 24) + 1);
};

export default function StaffLeaves() {
  const confirm = useConfirm();
  const [leaves, setLeaves]   = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => leavesApi.myList().then(r => setLeaves(r.data.results || r.data || []));
  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!form.start_date || !form.end_date) return alert('Start and end dates are required');
    if (form.end_date < form.start_date) return alert('End date must be after start date');
    const days = dayCount(form.start_date, form.end_date);
    const ok = await confirm({
      title: 'Submit leave request?',
      message: `${days} day${days !== 1 ? 's' : ''} of ${form.leave_type} leave from ${form.start_date} to ${form.end_date}.`,
      variant: 'confirm',
      confirmText: 'Submit Request',
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      await leavesApi.create(form);
      setForm({ leave_type: 'casual', start_date: '', end_date: '', reason: '' });
      setShowForm(false);
      load();
    } catch (e) {
      alert('Failed: ' + (e.response?.data?.detail || JSON.stringify(e.response?.data) || e.message));
    } finally { setSubmitting(false); }
  };

  const days = dayCount(form.start_date, form.end_date);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white">Leave Requests</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Apply for leave and track status</p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 bg-gradient-to-r from-accent to-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md hover:opacity-90 transition-all">
          <Plus size={16} /> Apply Leave
        </button>
      </div>

      {/* Application form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 mb-5">
          <h3 className="font-bold text-gray-800 dark:text-white mb-4">New Leave Application</h3>

          {/* Leave type cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {Object.entries(TYPE_META).map(([key, m]) => (
              <button key={key} onClick={() => setForm(f => ({ ...f, leave_type: key }))}
                className={`py-2.5 px-3 rounded-xl border-2 text-xs font-semibold capitalize transition-all ${
                  form.leave_type === key
                    ? `border-transparent bg-gradient-to-br ${m.color} text-white shadow-md`
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                }`}>
                {key} Leave
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Start Date *</label>
                <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">End Date *</label>
                <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                  min={form.start_date}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
              </div>
            </div>

            {form.start_date && form.end_date && (
              <div className="flex items-center gap-2 bg-accent/10 px-4 py-2.5 rounded-xl">
                <Calendar size={14} className="text-accent" />
                <span className="text-sm font-semibold text-accent">{days} day{days !== 1 ? 's' : ''} requested</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Reason</label>
              <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                rows={3} placeholder="Explain the reason for your leave..."
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none" />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="px-5 py-2 text-sm font-semibold bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl hover:opacity-90 disabled:opacity-60 transition">
                {submitting ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave list */}
      {leaves.length === 0 && !showForm ? (
        <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <Calendar size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No leave applications yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Click "Apply Leave" to submit a new request</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leaves.map(l => {
            const tm = TYPE_META[l.leave_type] || TYPE_META.unpaid;
            const sm = STATUS_META[l.status] || STATUS_META.pending;
            const StatusIcon = sm.icon;
            return (
              <div key={l.id}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className={`h-1 w-full bg-gradient-to-r ${tm.color}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full capitalize ${tm.badge}`}>
                          {l.leave_type} Leave
                        </span>
                        <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full capitalize ${sm.badge}`}>
                          <StatusIcon size={10} /> {l.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Calendar size={13} className="text-gray-400 shrink-0" />
                        <span className="font-medium">{fmtDate(l.start_date)}</span>
                        <span className="text-gray-400">—</span>
                        <span className="font-medium">{fmtDate(l.end_date)}</span>
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full font-semibold">
                          {l.days_count} day{l.days_count !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {l.reason && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">{l.reason}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                      {new Date(l.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
