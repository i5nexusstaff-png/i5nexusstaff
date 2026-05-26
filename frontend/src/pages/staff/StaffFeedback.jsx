import { useEffect, useState } from 'react';
import {
  Send, Inbox, AlertCircle, Lightbulb, ThumbsUp, MessageSquare,
  RefreshCw, ChevronLeft, Plus, CornerUpLeft, CheckCircle2, Clock, Circle,
} from 'lucide-react';
import { feedbackApi } from '../../services/api';

// ── Constants ──────────────────────────────────────────────────────────────────
const CAT_META = {
  general:      { label: 'General',      icon: Inbox,       color: '#64748b', gradient: 'from-slate-500 to-slate-600',     bg: 'bg-slate-100 dark:bg-slate-800',       text: 'text-slate-600 dark:text-slate-300' },
  complaint:    { label: 'Complaint',    icon: AlertCircle, color: '#ef4444', gradient: 'from-red-500 to-rose-600',         bg: 'bg-red-50 dark:bg-red-900/20',          text: 'text-red-600 dark:text-red-400' },
  suggestion:   { label: 'Suggestion',   icon: Lightbulb,   color: '#3b82f6', gradient: 'from-blue-500 to-indigo-600',      bg: 'bg-blue-50 dark:bg-blue-900/20',        text: 'text-blue-600 dark:text-blue-400' },
  appreciation: { label: 'Appreciation', icon: ThumbsUp,    color: '#10b981', gradient: 'from-emerald-500 to-teal-600',    bg: 'bg-emerald-50 dark:bg-emerald-900/20',  text: 'text-emerald-600 dark:text-emerald-400' },
};

const AVATAR_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899'];

function timeLabel(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
function fullDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) +
    ' · ' + new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ name = 'Me', size = 40, idx = 0 }) {
  const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  const initials = String(name).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="shrink-0 rounded-full flex items-center justify-center font-black text-white select-none"
      style={{ width: size, height: size, fontSize: size * 0.38, background: color, boxShadow: `0 2px 8px ${color}40` }}>
      {initials}
    </div>
  );
}

// ── Compose Panel ──────────────────────────────────────────────────────────────
function ComposePanel({ onDone, onCancel }) {
  const [form,    setForm]    = useState({ category: 'general', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);

  const handleSend = async () => {
    if (!form.subject.trim() || !form.message.trim()) return;
    setSending(true);
    try {
      await feedbackApi.create(form);
      setSent(true);
      setTimeout(() => { setSent(false); onDone(); }, 1000);
    } catch (e) {
      alert('Failed: ' + (e.response?.data?.detail || e.message));
    } finally { setSending(false); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Compose header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-gray-800 dark:text-white text-base">New Feedback</h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">To: Admin</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {/* Category selector */}
        <div>
          <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Category</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(CAT_META).map(([key, m]) => {
              const Icon = m.icon;
              const active = form.category === key;
              return (
                <button key={key} onClick={() => setForm(f => ({ ...f, category: key }))}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-bold capitalize transition-all ${
                    active
                      ? 'border-transparent text-white shadow-md'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  style={active ? { background: `linear-gradient(135deg, ${m.color}ee, ${m.color}bb)`, boxShadow: `0 4px 14px ${m.color}40` } : {}}>
                  <Icon size={17}/>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
            Subject <span className="text-red-400">*</span>
          </label>
          <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            placeholder="Brief subject…"
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-shadow placeholder-gray-300 dark:placeholder-gray-600"/>
        </div>

        {/* Message */}
        <div>
          <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
            Message <span className="text-red-400">*</span>
          </label>
          <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            rows={6} placeholder="Describe your feedback in detail…"
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none transition-shadow placeholder-gray-300 dark:placeholder-gray-600"/>
        </div>
      </div>

      {/* Compose footer */}
      <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 shrink-0 flex items-center gap-3">
        <button onClick={handleSend}
          disabled={sending || !form.subject.trim() || !form.message.trim()}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-40 shadow-sm"
          style={{ background: sent ? '#10b981' : 'linear-gradient(135deg,#1E3A5F,#2563eb)' }}>
          {sent
            ? <><CheckCircle2 size={14}/>Sent!</>
            : sending
            ? <><RefreshCw size={14} className="animate-spin"/>Sending…</>
            : <><Send size={14}/>Send Feedback</>}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 dark:text-gray-300 rounded-xl hover:bg-white dark:hover:bg-gray-800 transition font-medium">
          Discard
        </button>
      </div>
    </div>
  );
}

// ── Detail pane ────────────────────────────────────────────────────────────────
function DetailPane({ fb, idx, onCompose }) {
  const cat = CAT_META[fb.category] || CAT_META.general;
  const CatIcon = cat.icon;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-3 shrink-0">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ background: `linear-gradient(135deg, ${cat.color}cc, ${cat.color}77)` }}>
            <CatIcon size={20} className="text-white"/>
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white text-[15px] leading-tight">You</p>
            <p className="text-xs text-gray-400 mt-0.5">Sent to Admin</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-400">{timeLabel(fb.created_at)}</p>
          <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-0.5">{fullDate(fb.created_at)}</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Subject */}
        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1 leading-snug">{fb.subject}</h2>

        {/* Badges */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${cat.bg} ${cat.text}`}>
            <CatIcon size={10}/>{cat.label}
          </span>
          {fb.status === 'replied' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={10}/>Replied
            </span>
          )}
          {fb.status === 'read' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">
              <Circle size={10}/>Seen by admin
            </span>
          )}
          {fb.status === 'unread' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <Clock size={10}/>Awaiting review
            </span>
          )}
        </div>

        {/* Message */}
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{fb.message}</p>

        {/* Admin reply */}
        {fb.admin_reply ? (
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <CornerUpLeft size={13} className="text-emerald-500"/>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Admin Reply</span>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-100 dark:border-emerald-800/50 rounded-2xl px-5 py-4">
              <p className="text-sm text-emerald-800 dark:text-emerald-200 leading-relaxed">{fb.admin_reply}</p>
            </div>
          </div>
        ) : (
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2.5 text-gray-400 dark:text-gray-500">
              <Clock size={14}/>
              <p className="text-xs font-medium">No reply yet — admin will respond soon</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyDetail({ onCompose }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <MessageSquare size={26} className="text-gray-300 dark:text-gray-600"/>
      </div>
      <p className="font-bold text-gray-600 dark:text-gray-300 text-base">No message selected</p>
      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-5">Select a sent message or compose a new one</p>
      <button onClick={onCompose}
        className="flex items-center gap-2 text-sm font-bold text-white px-5 py-2.5 rounded-xl shadow-sm transition-all"
        style={{ background: 'linear-gradient(135deg,#1E3A5F,#2563eb)' }}>
        <Plus size={14}/> New Feedback
      </button>
    </div>
  );
}

// ── List item ──────────────────────────────────────────────────────────────────
function ListItem({ fb, isSelected, onClick, idx }) {
  const cat = CAT_META[fb.category] || CAT_META.general;
  const hasReply = fb.status === 'replied';
  return (
    <div onClick={onClick}
      className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer border-b border-gray-100 dark:border-gray-800 transition-colors relative ${
        isSelected ? 'bg-gray-50 dark:bg-gray-800' : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/40'
      }`}>
      {hasReply && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-emerald-500 rounded-r"/>
      )}

      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `linear-gradient(135deg, ${cat.color}cc, ${cat.color}77)` }}>
        <cat.icon size={15} className="text-white"/>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className="text-[13px] font-bold text-gray-800 dark:text-white truncate max-w-[140px]">{fb.subject}</p>
          <span className="text-[11px] text-gray-400 shrink-0 ml-1">{timeLabel(fb.created_at)}</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{fb.message}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${cat.bg} ${cat.text}`}>{cat.label}</span>
          {hasReply && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
              <CornerUpLeft size={8}/>Replied
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function StaffFeedback() {
  const [items,      setItems]      = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [composing,  setComposing]  = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [showDetail, setShowDetail] = useState(false); // mobile

  const load = () => {
    setLoading(true);
    feedbackApi.myList()
      .then(r => setItems(r.data.results || r.data || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openFeedback = (fb, idx) => {
    setSelected({ ...fb, _idx: idx });
    setComposing(false);
    setShowDetail(true);
  };

  const handleCompose = () => {
    setSelected(null);
    setComposing(true);
    setShowDetail(true);
  };

  const repliedCount = items.filter(i => i.status === 'replied').length;

  /* ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Feedback</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Send messages and feedback to admin</p>
        </div>
        <button onClick={handleCompose}
          className="flex items-center gap-2 text-sm font-bold text-white px-5 py-2.5 rounded-xl shadow-lg transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#16a34a,#22c55e)', boxShadow: '0 4px 14px rgba(34,197,94,0.35)' }}>
          <Plus size={15}/> New Feedback
        </button>
      </div>

      {/* ── Two-panel container ── */}
      <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex"
        style={{ minHeight: '72vh' }}>

        {/* ── LEFT: Sent list ── */}
        <div className={`flex flex-col border-r border-gray-100 dark:border-gray-800 shrink-0 ${showDetail ? 'hidden md:flex' : 'flex'} w-full md:w-72 lg:w-80`}>

          {/* Panel tab */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider">Sent</span>
              {items.length > 0 && (
                <span className="text-[9px] font-black bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded-full">{items.length}</span>
              )}
            </div>
            {repliedCount > 0 && (
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={10}/>{repliedCount} replied
              </span>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw size={18} className="animate-spin text-gray-400"/>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-3">
                  <Send size={18} className="text-gray-300 dark:text-gray-600"/>
                </div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Nothing sent yet</p>
                <button onClick={handleCompose}
                  className="mt-3 text-xs font-bold text-blue-500 hover:text-blue-600 transition-colors">
                  Send your first feedback →
                </button>
              </div>
            ) : (
              items.map((fb, idx) => (
                <ListItem
                  key={fb.id}
                  fb={fb}
                  isSelected={!composing && selected?.id === fb.id}
                  onClick={() => openFeedback(fb, idx)}
                  idx={idx}
                />
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT: Detail / Compose ── */}
        <div className={`flex-1 flex flex-col ${showDetail ? 'flex' : 'hidden md:flex'}`}>
          {/* Mobile back */}
          {showDetail && (
            <div className="md:hidden px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
              <button onClick={() => { setShowDetail(false); setSelected(null); setComposing(false); }}
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-200 transition">
                <ChevronLeft size={16}/> Back
              </button>
            </div>
          )}

          {composing ? (
            <ComposePanel
              onDone={() => { setComposing(false); setShowDetail(false); load(); }}
              onCancel={() => { setComposing(false); setShowDetail(false); }}
            />
          ) : selected ? (
            <DetailPane
              key={selected.id}
              fb={items.find(i => i.id === selected.id) || selected}
              idx={selected._idx || 0}
              onCompose={handleCompose}
            />
          ) : (
            <EmptyDetail onCompose={handleCompose}/>
          )}
        </div>
      </div>
    </div>
  );
}
