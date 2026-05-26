import { useEffect, useState } from 'react';
import {
  Send, Inbox, AlertCircle, Lightbulb, ThumbsUp, MessageSquare,
  RefreshCw, ChevronLeft, Reply, CornerUpLeft,
  CheckCircle2, Circle, Clock,
} from 'lucide-react';
import { feedbackApi } from '../../services/api';

// ── Constants ──────────────────────────────────────────────────────────────────
const CAT_META = {
  general:      { label: 'General',      icon: Inbox,       color: '#64748b', bg: 'bg-slate-100 dark:bg-slate-800',      text: 'text-slate-600 dark:text-slate-300' },
  complaint:    { label: 'Complaint',    icon: AlertCircle, color: '#ef4444', bg: 'bg-red-50 dark:bg-red-900/20',         text: 'text-red-600 dark:text-red-400' },
  suggestion:   { label: 'Suggestion',   icon: Lightbulb,   color: '#3b82f6', bg: 'bg-blue-50 dark:bg-blue-900/20',       text: 'text-blue-600 dark:text-blue-400' },
  appreciation: { label: 'Appreciation', icon: ThumbsUp,    color: '#10b981', bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400' },
};

const TABS = [
  { key: 'all',     label: 'Inbox' },
  { key: 'unread',  label: 'Unread' },
  { key: 'replied', label: 'Replied' },
];

const AVATAR_COLORS = [
  '#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899',
];

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
function Avatar({ name = 'U', size = 40, idx = 0 }) {
  const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
  const initials = String(name).split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="shrink-0 rounded-full flex items-center justify-center font-black text-white select-none"
      style={{ width: size, height: size, fontSize: size * 0.38, background: color, boxShadow: `0 2px 8px ${color}40` }}>
      {initials}
    </div>
  );
}

// ── List item ──────────────────────────────────────────────────────────────────
function ListItem({ fb, isSelected, onClick, idx }) {
  const isUnread = fb.status === 'unread';
  const cat = CAT_META[fb.category] || CAT_META.general;
  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 px-4 py-3.5 cursor-pointer border-b border-gray-100 dark:border-gray-800 transition-colors relative ${
        isSelected
          ? 'bg-gray-50 dark:bg-gray-800'
          : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/40'
      }`}>
      {/* Unread indicator */}
      {isUnread && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 rounded-r"/>
      )}

      <Avatar name={fb.from_user_detail?.full_name} size={38} idx={idx}/>

      <div className="flex-1 min-w-0">
        {/* Row 1: name + time */}
        <div className="flex items-center justify-between mb-0.5">
          <p className={`text-[13px] truncate max-w-[140px] ${isUnread ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-700 dark:text-gray-200'}`}>
            {fb.from_user_detail?.full_name || 'Unknown'}
          </p>
          <span className="text-[11px] text-gray-400 shrink-0 ml-1">{timeLabel(fb.created_at)}</span>
        </div>
        {/* Row 2: subject */}
        <p className={`text-xs truncate mb-0.5 ${isUnread ? 'font-semibold text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
          {fb.subject}
        </p>
        {/* Row 3: preview */}
        <p className="text-[11px] text-gray-400 truncate">{fb.message}</p>
      </div>

      {isUnread && (
        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 shrink-0"/>
      )}
    </div>
  );
}

// ── Detail pane ────────────────────────────────────────────────────────────────
function DetailPane({ fb, idx, onReplyDone }) {
  const [reply,   setReply]   = useState(fb.admin_reply || '');
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const cat  = CAT_META[fb.category] || CAT_META.general;
  const CatIcon = cat.icon;

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await feedbackApi.reply(fb.id, { admin_reply: reply });
      setSent(true);
      setTimeout(() => { setSent(false); onReplyDone(); }, 1200);
    } finally { setSending(false); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Detail header */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-3 shrink-0">
        <div className="flex items-start gap-3">
          <Avatar name={fb.from_user_detail?.full_name} size={44} idx={idx}/>
          <div>
            <p className="font-bold text-gray-900 dark:text-white text-[15px] leading-tight">
              {fb.from_user_detail?.full_name || 'Unknown'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {fb.from_user_detail?.position || fb.from_user_detail?.role || 'Staff'}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-400">{timeLabel(fb.created_at)}</p>
          <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-0.5">{fullDate(fb.created_at)}</p>
        </div>
      </div>

      {/* Message body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Subject */}
        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1 leading-snug">{fb.subject}</h2>

        {/* Category badge */}
        <div className="flex items-center gap-2 mb-5">
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
              <Circle size={10}/>Read
            </span>
          )}
          {fb.status === 'unread' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <Clock size={10}/>Unread
            </span>
          )}
        </div>

        {/* Message */}
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{fb.message}</p>

        {/* Previous reply bubble */}
        {fb.admin_reply && (
          <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <CornerUpLeft size={13} className="text-gray-400"/>
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Your Reply</span>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/15 border border-blue-100 dark:border-blue-800/50 rounded-2xl px-5 py-4">
              <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">{fb.admin_reply}</p>
            </div>
          </div>
        )}
      </div>

      {/* Reply bar */}
      <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0 bg-gray-50/50 dark:bg-gray-800/30">
        <textarea
          value={reply}
          onChange={e => setReply(e.target.value)}
          rows={3}
          placeholder="Write a reply…"
          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none transition-shadow placeholder-gray-300 dark:placeholder-gray-600 mb-3"/>
        <div className="flex items-center gap-3">
          <button onClick={handleReply} disabled={!reply.trim() || sending}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-40 shadow-sm"
            style={{ background: sent ? '#10b981' : sending ? '#6b7280' : 'linear-gradient(135deg,#1E3A5F,#2563eb)' }}>
            {sent
              ? <><CheckCircle2 size={14}/>Sent!</>
              : sending
              ? <><RefreshCw size={14} className="animate-spin"/>Sending…</>
              : <><Reply size={14}/>Send Reply</>}
          </button>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {fb.admin_reply ? 'Update your previous reply' : 'Staff will see your reply'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyDetail() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <MessageSquare size={26} className="text-gray-300 dark:text-gray-600"/>
      </div>
      <p className="font-bold text-gray-600 dark:text-gray-300 text-base">Select a message</p>
      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Choose a feedback from the list to read it</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function AdminFeedback() {
  const [items,      setItems]      = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [activeTab,  setActiveTab]  = useState('all');
  const [loading,    setLoading]    = useState(true);
  const [showDetail, setShowDetail] = useState(false); // mobile detail view

  const load = () => {
    setLoading(true);
    feedbackApi.list()
      .then(r => setItems(r.data.results || r.data || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openFeedback = async (fb, idx) => {
    setSelected({ ...fb, _idx: idx });
    setShowDetail(true);
    if (fb.status === 'unread') {
      await feedbackApi.markRead(fb.id);
      setItems(prev => prev.map(i => i.id === fb.id ? { ...i, status: 'read' } : i));
    }
  };

  const filtered = items.filter(fb => {
    if (activeTab === 'all')     return true;
    if (activeTab === 'unread')  return fb.status === 'unread';
    if (activeTab === 'replied') return fb.status === 'replied';
    return true;
  });

  const unreadCount  = items.filter(i => i.status === 'unread').length;
  const repliedCount = items.filter(i => i.status === 'replied').length;

  const tabCount = { all: items.length, unread: unreadCount, replied: repliedCount };

  /* ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Feedback</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Messages and feedback from your staff</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-xl text-xs font-bold">
              <div className="w-2 h-2 bg-blue-500 rounded-full"/>
              {unreadCount} unread
            </span>
          )}
        </div>
      </div>

      {/* ── Two-panel container ── */}
      <div className="flex-1 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex"
        style={{ minHeight: '72vh' }}>

        {/* ── LEFT: List panel ── */}
        <div className={`flex flex-col border-r border-gray-100 dark:border-gray-800 shrink-0 ${showDetail ? 'hidden md:flex' : 'flex'} w-full md:w-72 lg:w-80`}>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 dark:border-gray-800 px-1 pt-1">
            {TABS.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-all relative ${
                  activeTab === tab.key
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}>
                {tab.label}
                {tabCount[tab.key] > 0 && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.key
                      ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>{tabCount[tab.key]}</span>
                )}
                {activeTab === tab.key && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-emerald-500 rounded-full"/>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw size={18} className="animate-spin text-gray-400"/>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-3">
                  <MessageSquare size={20} className="text-gray-300 dark:text-gray-600"/>
                </div>
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No messages</p>
              </div>
            ) : (
              filtered.map((fb, idx) => (
                <ListItem
                  key={fb.id}
                  fb={fb}
                  isSelected={selected?.id === fb.id}
                  onClick={() => openFeedback(fb, idx)}
                  idx={idx}
                />
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT: Detail panel ── */}
        <div className={`flex-1 flex flex-col ${showDetail ? 'flex' : 'hidden md:flex'}`}>
          {/* Mobile back button */}
          {showDetail && (
            <div className="md:hidden px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
              <button onClick={() => { setShowDetail(false); setSelected(null); }}
                className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 font-medium hover:text-gray-700 dark:hover:text-gray-200 transition">
                <ChevronLeft size={16}/> Back
              </button>
            </div>
          )}

          {selected ? (
            <DetailPane
              key={selected.id}
              fb={items.find(i => i.id === selected.id) || selected}
              idx={selected._idx || 0}
              onReplyDone={() => {
                load();
                setSelected(prev => prev ? { ...prev, status: 'replied' } : prev);
              }}
            />
          ) : (
            <EmptyDetail/>
          )}
        </div>
      </div>
    </div>
  );
}
