import { useEffect, useState } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, CalendarCheck, Filter } from 'lucide-react';
import { leavesApi } from '../../services/api';

const STATUS_STYLE = {
  pending:  'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
  approved: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
  rejected: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800',
};
const TYPE_STYLE = {
  casual:  'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  sick:    'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400',
  earned:  'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
  unpaid:  'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
};
const AVATAR_COLORS = [
  'from-blue-500 to-indigo-600', 'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600', 'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
];

export default function AdminLeaves() {
  const [leaves, setLeaves] = useState([]);
  const [filter, setFilter] = useState('pending');

  const load = () => leavesApi.list({ status: filter || undefined }).then(r => setLeaves(r.data.results || r.data));
  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id, status) => {
    await leavesApi.review(id, { status });
    load();
  };

  const fmtDate = d => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const counts = {
    '': leaves.length,
    pending:  leaves.filter(l => l.status === 'pending').length,
    approved: leaves.filter(l => l.status === 'approved').length,
    rejected: leaves.filter(l => l.status === 'rejected').length,
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white">Leave Requests</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">Review and approve staff leave applications</p>
        </div>
        {counts.pending > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-2 rounded-xl">
            <Clock size={14} className="text-amber-600 dark:text-amber-400" />
            <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">{counts.pending} pending</span>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: '', label: 'All', icon: Filter },
          { key: 'pending',  label: 'Pending',  icon: Clock },
          { key: 'approved', label: 'Approved', icon: CheckCircle },
          { key: 'rejected', label: 'Rejected', icon: XCircle },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              filter === key
                ? 'bg-gradient-to-r from-primary to-accent text-white shadow-md'
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary/40 dark:hover:border-primary/40'
            }`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* Leave cards */}
      <div className="space-y-4">
        {leaves.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700">
            <CalendarCheck size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No {filter || ''} leave requests</p>
          </div>
        )}
        {leaves.map((l, idx) => (
          <div key={l.id}
            className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all p-5">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className={`w-11 h-11 bg-gradient-to-br ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} rounded-xl flex items-center justify-center text-white font-black text-base shrink-0 shadow-md`}>
                {(l.user_detail?.full_name || 'U')[0].toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-bold text-gray-800 dark:text-white">{l.user_detail?.full_name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {l.user_detail?.position}
                      {l.user_detail?.site_location && <> · {l.user_detail.site_location}</>}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wide ${STATUS_STYLE[l.status]}`}>
                    {l.status}
                  </span>
                </div>

                {/* Chips row */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold capitalize ${TYPE_STYLE[l.leave_type] || TYPE_STYLE.unpaid}`}>
                    {l.leave_type} leave
                  </span>
                  <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2.5 py-0.5 rounded-lg text-xs font-medium">
                    <Calendar size={11} />
                    {fmtDate(l.start_date)} — {fmtDate(l.end_date)}
                  </div>
                  <span className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2.5 py-0.5 rounded-lg text-xs font-semibold">
                    {l.days_count} day{l.days_count !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Reason */}
                {l.reason && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 italic">
                    "{l.reason}"
                  </p>
                )}

                {/* Action buttons */}
                {l.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => updateStatus(l.id, 'approved')}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl shadow-sm hover:opacity-90 transition">
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button onClick={() => updateStatus(l.id, 'rejected')}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-red-500 to-rose-600 rounded-xl shadow-sm hover:opacity-90 transition">
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
