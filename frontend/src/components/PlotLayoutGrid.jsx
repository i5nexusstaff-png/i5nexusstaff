/**
 * PlotLayoutGrid — interactive visual plot tile grid
 *
 * Staff  (canEdit=false) :
 *   • Click tile → detail modal with "Request Status Change" form
 *   • If plot already has a pending request → shows request-pending notice
 *
 * Admin  (canEdit=true)  :
 *   • Click tile → detail modal
 *   • If plot has pending request → shows request card + Approve / Hold / Reject
 *   • Also shows direct status-change buttons (bypass request flow)
 *
 * Props:
 *   plots          – array of plot objects (each may have pending_booking)
 *   canEdit        – true for admin/super_admin
 *   onStatusChange – (plotId, newStatus) admin direct change
 *   onRequest      – (plotId, payload)   staff submits request  → returns Promise
 *   onApprove      – (reqId, notes)      admin approves         → returns Promise
 *   onReject       – (reqId, notes)      admin rejects          → returns Promise
 *   onHold         – (reqId, notes)      admin holds            → returns Promise
 */
import { useState } from 'react';
import { X, CheckCircle, XCircle, Clock, Send, User, Phone, FileText, ChevronDown } from 'lucide-react';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUSES = ['available', 'booked', 'in_process', 'blocked', 'sold'];

const S = {
  available:  { grad: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/30', label: 'Available',  dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  booked:     { grad: 'from-blue-500    to-blue-600',    shadow: 'shadow-blue-500/30',    label: 'Booked',     dot: 'bg-blue-500',    badge: 'bg-blue-100    text-blue-700    dark:bg-blue-900/30    dark:text-blue-400'    },
  in_process: { grad: 'from-amber-400   to-amber-500',   shadow: 'shadow-amber-500/30',   label: 'In Process', dot: 'bg-amber-500',   badge: 'bg-amber-100   text-amber-700   dark:bg-amber-900/30   dark:text-amber-400'   },
  blocked:    { grad: 'from-gray-400    to-gray-500',    shadow: 'shadow-gray-500/30',    label: 'Blocked',    dot: 'bg-gray-400',    badge: 'bg-gray-100    text-gray-600    dark:bg-gray-700       dark:text-gray-400'    },
  sold:       { grad: 'from-red-500     to-red-600',     shadow: 'shadow-red-500/30',     label: 'Sold',       dot: 'bg-red-500',     badge: 'bg-red-100     text-red-700     dark:bg-red-900/30     dark:text-red-400'     },
};

const REQ_STATUS_LABEL = { blocked: 'Block', booked: 'Book', sold: 'Mark Sold' };

function naturalSort(a, b) {
  return a.plot_no.localeCompare(b.plot_no, undefined, { numeric: true, sensitivity: 'base' });
}
function fmtINR(n) {
  if (n == null || n === '') return '—';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}
function timeAgo(iso) {
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60)  return 'just now';
  if (secs < 3600) return `${Math.floor(secs/60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs/3600)}h ago`;
  return `${Math.floor(secs/86400)}d ago`;
}

const EMPTY_REQ = { requested_status: 'blocked', customer_name: '', customer_phone: '', notes: '' };

// ════════════════════════════════════════════════════════════════════
export default function PlotLayoutGrid({
  plots = [],
  canEdit       = false,
  onStatusChange,
  onRequest,
  onApprove,
  onReject,
  onHold,
}) {
  const [active,       setActive]       = useState(null);
  const [savingStatus, setSavingStatus] = useState(false);

  // Staff request form
  const [showReqForm, setShowReqForm] = useState(false);
  const [reqForm,     setReqForm]     = useState(EMPTY_REQ);
  const [reqSaving,   setReqSaving]   = useState(false);
  const [reqSuccess,  setReqSuccess]  = useState(false);
  const [reqError,    setReqError]    = useState('');

  // Admin action notes
  const [adminNotes,  setAdminNotes]  = useState('');
  const [actioning,   setActioning]   = useState(''); // 'approve'|'reject'|'hold'

  const sorted = [...plots].sort(naturalSort);
  const cfg = (s) => S[s] ?? S.available;

  /* ── open modal ── */
  const openModal = (plot) => {
    setActive(plot);
    setShowReqForm(false);
    setReqForm(EMPTY_REQ);
    setReqSuccess(false);
    setReqError('');
    setAdminNotes('');
    setActioning('');
    setSavingStatus(false);
  };

  /* ── close modal ── */
  const closeModal = () => {
    if (reqSaving || actioning) return;
    setActive(null);
  };

  /* ── admin: direct status change ── */
  const changeStatus = async (newStatus) => {
    if (!active || newStatus === active.status || savingStatus) return;
    setSavingStatus(true);
    try {
      await onStatusChange(active.id, newStatus);
      setActive(prev => ({ ...prev, status: newStatus, pending_booking: null }));
    } catch { /* error handled by parent */ }
    finally { setSavingStatus(false); }
  };

  /* ── staff: submit request ── */
  const submitRequest = async () => {
    if (!reqForm.customer_name.trim()) { setReqError('Customer name is required.'); return; }
    setReqSaving(true); setReqError('');
    try {
      await onRequest(active.id, reqForm);
      setReqSuccess(true);
      setActive(prev => ({ ...prev, status: 'in_process', pending_booking: {
        requested_status: reqForm.requested_status,
        customer_name: reqForm.customer_name,
        customer_phone: reqForm.customer_phone,
        notes: reqForm.notes,
        request_status: 'pending',
        created_at: new Date().toISOString(),
      }}));
    } catch (e) {
      setReqError(e?.response?.data?.error || 'Failed to send request. Please try again.');
    } finally { setReqSaving(false); }
  };

  /* ── admin: action a request ── */
  const doAction = async (type) => {
    if (!active?.pending_booking || actioning) return;
    setActioning(type);
    try {
      const fn = type === 'approve' ? onApprove : type === 'reject' ? onReject : onHold;
      await fn(active.pending_booking.id, adminNotes);
      // Optimistic update
      const newStatus = type === 'approve' ? active.pending_booking.requested_status
                      : type === 'reject'  ? 'available'
                      : active.status;
      setActive(prev => ({
        ...prev,
        status: newStatus,
        pending_booking: type === 'hold' ? prev.pending_booking : null,
      }));
      setAdminNotes('');
    } catch (e) {
      alert(e?.response?.data?.error || 'Action failed. Please try again.');
    } finally { setActioning(''); }
  };

  /* ════════════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── Colour legend ── */}
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-4 px-2">
        {STATUSES.map(s => (
          <div key={s} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <span className={`w-3 h-3 rounded-sm bg-gradient-to-br ${S[s].grad} shadow-sm`} />
            <span>{S[s].label}</span>
            <span className="text-gray-400 dark:text-gray-500">({plots.filter(p => p.status === s).length})</span>
          </div>
        ))}
      </div>

      {/* ── Plot tile grid (centred) ── */}
      <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 sm:p-6 min-h-[120px]">
        {sorted.length === 0 ? (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-6">No plots to display</p>
        ) : (
          <div className="flex flex-wrap justify-center gap-2">
            {sorted.map(plot => {
              const c = cfg(plot.status);
              const hasPending = !!plot.pending_booking;
              return (
                <button
                  key={plot.id}
                  onClick={() => openModal(plot)}
                  title={`Plot ${plot.plot_no} · ${c.label}${hasPending ? ' · Pending request' : ''}`}
                  className={[
                    'relative w-[68px] h-[68px] rounded-xl',
                    'bg-gradient-to-br', c.grad,
                    'flex flex-col items-center justify-center gap-0.5 px-1',
                    'shadow-md', c.shadow,
                    'hover:shadow-xl hover:scale-110 active:scale-95',
                    'transition-all duration-150 cursor-pointer focus:outline-none',
                  ].join(' ')}
                >
                  <span className="text-white font-black text-[11px] leading-tight text-center break-all line-clamp-3 w-full px-0.5">
                    {plot.plot_no}
                  </span>
                  {plot.area_sqft != null && plot.area_sqft !== '' && (
                    <span className="text-white/70 text-[8px] leading-none mt-0.5">
                      {Number(plot.area_sqft).toLocaleString('en-IN')}ft²
                    </span>
                  )}
                  {/* Pending-request badge */}
                  {hasPending && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 border-2 border-white dark:border-gray-900 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-white text-[8px] font-black leading-none">!</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {sorted.length > 0 && (
        <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-2">
          {sorted.length} plot{sorted.length !== 1 ? 's' : ''} · tap a tile to view details
          {!canEdit && ' or send a request'}
        </p>
      )}

      {/* ════ Detail / Request modal ════ */}
      {active && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden max-h-[92vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>

            {/* Coloured header */}
            <div className={`bg-gradient-to-r ${cfg(active.status).grad} px-5 py-4 shrink-0`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mb-0.5">Plot Number</p>
                  <p className="text-white font-black text-3xl leading-none tracking-tight">{active.plot_no}</p>
                  <span className="inline-block mt-2 px-2.5 py-0.5 bg-white/25 rounded-full text-white text-xs font-bold">
                    {cfg(active.status).label}
                  </span>
                  {active.pending_booking && (
                    <span className="ml-2 inline-block px-2 py-0.5 bg-orange-400/80 rounded-full text-white text-[10px] font-bold">
                      ● Pending Request
                    </span>
                  )}
                </div>
                <button onClick={closeModal}
                  className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/35 flex items-center justify-center transition-colors mt-0.5 shrink-0">
                  <X size={15} className="text-white" />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1">

              {/* Plot details */}
              <div className="px-5 pt-3 pb-1">
                {[
                  ['Area',       active.area_sqft     ? `${Number(active.area_sqft).toLocaleString('en-IN')} sq.ft` : '—'],
                  ['Facing',     active.facing        || '—'],
                  ['Road Width', active.road_width    || '—'],
                  ['Rate/sq.ft', active.rate_per_sqft ? `₹${Number(active.rate_per_sqft).toLocaleString('en-IN')}` : '—'],
                  ['Total Cost', fmtINR(active.total_cost)],
                  ['Survey No',  active.survey_no     || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">{label}</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-white">{value}</span>
                  </div>
                ))}
              </div>

              {/* ════ ADMIN: pending request card ════ */}
              {canEdit && active.pending_booking && (
                <div className="mx-5 mt-3 rounded-2xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 overflow-hidden">
                  <div className="px-4 py-3 bg-orange-100 dark:bg-orange-900/30 border-b border-orange-200 dark:border-orange-800">
                    <p className="text-xs font-black text-orange-700 dark:text-orange-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Clock size={12} /> Pending Request
                    </p>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400 uppercase tracking-wide font-bold">Requested By</span>
                      <span className="text-sm font-bold text-gray-800 dark:text-white">{active.pending_booking.requested_by}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400 uppercase tracking-wide font-bold">Wants To</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${cfg(active.pending_booking.requested_status).badge}`}>
                        {S[active.pending_booking.requested_status]?.label || active.pending_booking.requested_status}
                      </span>
                    </div>
                    {active.pending_booking.customer_name && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-400 uppercase tracking-wide font-bold">Customer</span>
                        <span className="text-sm font-bold text-gray-800 dark:text-white">{active.pending_booking.customer_name}</span>
                      </div>
                    )}
                    {active.pending_booking.customer_phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-400 uppercase tracking-wide font-bold">Phone</span>
                        <span className="text-sm font-bold text-gray-800 dark:text-white">{active.pending_booking.customer_phone}</span>
                      </div>
                    )}
                    {active.pending_booking.notes && (
                      <div className="pt-1 mt-1 border-t border-orange-200 dark:border-orange-800">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold mb-0.5">Notes</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{active.pending_booking.notes}</p>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-400">{timeAgo(active.pending_booking.created_at)}</p>
                  </div>

                  {/* Admin notes input */}
                  <div className="px-4 pb-3">
                    <textarea
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      placeholder="Optional admin note…"
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-orange-200 dark:border-orange-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-400/40 resize-none"
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-3 gap-2 px-4 pb-4">
                    <button onClick={() => doAction('approve')} disabled={!!actioning}
                      className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-sm">
                      {actioning === 'approve'
                        ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <CheckCircle size={15} />}
                      Approve
                    </button>
                    <button onClick={() => doAction('hold')} disabled={!!actioning}
                      className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-sm">
                      {actioning === 'hold'
                        ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <Clock size={15} />}
                      Hold
                    </button>
                    <button onClick={() => doAction('reject')} disabled={!!actioning}
                      className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors disabled:opacity-50 shadow-sm">
                      {actioning === 'reject'
                        ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <XCircle size={15} />}
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* ════ ADMIN: direct status changer ════ */}
              {canEdit && onStatusChange && (
                <div className="px-5 pt-4 pb-2">
                  <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                    {active.pending_booking ? 'Override Status' : 'Change Status'}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {STATUSES.map(s => (
                      <button key={s} disabled={savingStatus} onClick={() => changeStatus(s)}
                        className={[
                          'flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50',
                          active.status === s
                            ? `${S[s].badge} ring-2 ring-inset ring-current`
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700',
                        ].join(' ')}>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${S[s].dot}`} />
                        {S[s].label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ════ STAFF: pending notice ════ */}
              {!canEdit && active.pending_booking && (
                <div className="mx-5 mt-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={14} className="text-amber-600 dark:text-amber-400" />
                    <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Request Pending</p>
                  </div>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/70">
                    A request to <strong>{S[active.pending_booking.requested_status]?.label || active.pending_booking.requested_status}</strong> this plot
                    was sent {timeAgo(active.pending_booking.created_at)}. Waiting for admin approval.
                  </p>
                </div>
              )}

              {/* ════ STAFF: request form ════ */}
              {!canEdit && !active.pending_booking && active.status !== 'sold' && (
                <div className="mx-5 mt-3 mb-1">
                  {!showReqForm && !reqSuccess && (
                    <button onClick={() => setShowReqForm(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl
                                 bg-gradient-to-r from-accent to-amber-500 text-white
                                 text-sm font-bold shadow-md shadow-accent/20 hover:opacity-90 transition-all active:scale-[.98]">
                      <Send size={14} /> Request Status Change
                    </button>
                  )}

                  {reqSuccess && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Request Sent!</p>
                        <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70 mt-0.5">
                          Admin has been notified. You'll see updates once reviewed.
                        </p>
                      </div>
                    </div>
                  )}

                  {showReqForm && !reqSuccess && (
                    <div className="rounded-2xl border border-accent/30 dark:border-accent/20 bg-accent/5 dark:bg-accent/10 overflow-hidden">
                      <div className="px-4 py-3 bg-accent/10 dark:bg-accent/20 border-b border-accent/20">
                        <p className="text-xs font-black text-accent uppercase tracking-wide flex items-center gap-1.5">
                          <Send size={11} /> Send Request to Admin
                        </p>
                      </div>
                      <div className="p-4 space-y-3">

                        {/* Requested status */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                            Request to *
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {[['blocked','Block this plot'],['booked','Book this plot']].map(([val, lbl]) => (
                              <button key={val} type="button"
                                onClick={() => setReqForm(f => ({ ...f, requested_status: val }))}
                                className={[
                                  'flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border-2 transition-all',
                                  reqForm.requested_status === val
                                    ? `${S[val].badge} border-current`
                                    : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600',
                                ].join(' ')}>
                                <span className={`w-2 h-2 rounded-full ${S[val].dot} shrink-0`} />
                                {lbl}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Customer name */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                            Customer Name *
                          </label>
                          <div className="relative">
                            <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                              value={reqForm.customer_name}
                              onChange={e => setReqForm(f => ({ ...f, customer_name: e.target.value }))}
                              placeholder="Enter customer's full name"
                              className="w-full pl-8 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                            />
                          </div>
                        </div>

                        {/* Customer phone */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                            Phone Number
                          </label>
                          <div className="relative">
                            <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input
                              value={reqForm.customer_phone}
                              onChange={e => setReqForm(f => ({ ...f, customer_phone: e.target.value }))}
                              placeholder="+91 00000 00000"
                              type="tel"
                              className="w-full pl-8 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/30"
                            />
                          </div>
                        </div>

                        {/* Notes */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                            Notes
                          </label>
                          <div className="relative">
                            <FileText size={13} className="absolute left-3 top-3 text-gray-400 pointer-events-none" />
                            <textarea
                              value={reqForm.notes}
                              onChange={e => setReqForm(f => ({ ...f, notes: e.target.value }))}
                              placeholder="Any additional details…"
                              rows={2}
                              className="w-full pl-8 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                            />
                          </div>
                        </div>

                        {reqError && (
                          <p className="text-xs text-red-500 font-medium">{reqError}</p>
                        )}

                        <div className="flex gap-2 pt-1">
                          <button onClick={() => { setShowReqForm(false); setReqError(''); }}
                            disabled={reqSaving}
                            className="flex-1 py-2.5 text-sm border border-gray-200 dark:border-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium disabled:opacity-50">
                            Cancel
                          </button>
                          <button onClick={submitRequest} disabled={reqSaving || !reqForm.customer_name.trim()}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold bg-gradient-to-r from-accent to-amber-500 text-white rounded-xl hover:opacity-90 disabled:opacity-40 transition-all shadow-md shadow-accent/20">
                            {reqSaving
                              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending…</>
                              : <><Send size={13} />Send Request</>}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sold — no actions for staff */}
              {!canEdit && active.status === 'sold' && (
                <div className="mx-5 mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                  <p className="text-xs text-red-500 font-semibold text-center">This plot is already sold</p>
                </div>
              )}

              {/* Close button (admin, no pending request) */}
              {canEdit && !active.pending_booking && (
                <div className="px-5 pb-5 pt-2" />
              )}
              {canEdit && active.pending_booking && (
                <div className="px-5 pb-4 pt-1" />
              )}
              {!canEdit && (
                <div className="px-5 pb-5 pt-2">
                  <button onClick={closeModal}
                    className="w-full py-2.5 text-sm font-semibold border border-gray-200 dark:border-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
