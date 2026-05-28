import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, CheckCheck, ChevronRight } from 'lucide-react';
import { notificationsApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { initPushNotifications } from '../utils/push';

const TYPE_META = {
  leave:    { icon: '📅', color: 'from-blue-500 to-blue-600',     bg: 'bg-blue-50 dark:bg-blue-900/30',     border: 'border-blue-100 dark:border-blue-800',     label: 'Leave' },
  feedback: { icon: '💬', color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/30', border: 'border-purple-100 dark:border-purple-800',  label: 'Feedback' },
  todo:     { icon: '✅', color: 'from-emerald-500 to-emerald-600',bg: 'bg-emerald-50 dark:bg-emerald-900/30',border: 'border-emerald-100 dark:border-emerald-800',label: 'Task' },
  offer:    { icon: '🎯', color: 'from-orange-500 to-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/30', border: 'border-orange-100 dark:border-orange-800',  label: 'Offer' },
  report:   { icon: '📄', color: 'from-gray-500 to-gray-600',     bg: 'bg-gray-50 dark:bg-gray-800',        border: 'border-gray-100 dark:border-gray-700',     label: 'Report' },
  booking:  { icon: '🏠', color: 'from-amber-500 to-amber-600',   bg: 'bg-amber-50 dark:bg-amber-900/30',   border: 'border-amber-100 dark:border-amber-800',   label: 'Booking' },
  tutorial: { icon: '🎬', color: 'from-red-500 to-red-600',       bg: 'bg-red-50 dark:bg-red-900/30',       border: 'border-red-100 dark:border-red-800',       label: 'Tutorial' },
  general:  { icon: '🔔', color: 'from-primary to-primary-light', bg: 'bg-gray-50 dark:bg-gray-800',        border: 'border-gray-100 dark:border-gray-700',     label: 'Notice' },
};

function getRoute(notif_type, role) {
  const map = {
    super_admin: {
      leave: '/superadmin/leaves', feedback: '/superadmin', todo: '/superadmin',
      report: '/superadmin/reports', offer: '/superadmin',
      booking: '/superadmin/projects', tutorial: '/superadmin/tutorials', general: '/superadmin',
    },
    admin: {
      leave: '/admin/leaves', feedback: '/admin/feedback', todo: '/admin/todos',
      report: '/admin/reports', offer: '/admin/offers',
      booking: '/admin/projects', tutorial: '/admin/tutorials', general: '/admin',
    },
    staff: {
      leave: '/staff/leaves', feedback: '/staff/feedback', todo: '/staff/todos',
      report: '/staff/reports', offer: '/staff',
      booking: '/staff/projects', tutorial: '/staff/tutorials', general: '/staff',
    },
  };
  const fallback = role === 'super_admin' ? '/superadmin' : role === 'admin' ? '/admin' : '/staff';
  return map[role]?.[notif_type] || fallback;
}

function fmt(dt) {
  const d = new Date(dt), now = new Date();
  const diff = Math.floor((now - d) / 60000);
  if (diff < 1) return 'just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return d.toLocaleDateString('en-IN');
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [open, setOpen] = useState(false);
  const [popup, setPopup] = useState(null);
  const ref = useRef(null);
  const prevIdsRef = useRef(new Set());
  const popupTimerRef = useRef(null);

  const load = async (isFirstLoad = false) => {
    try {
      const r = await notificationsApi.unread();
      const fresh = r.data || [];
      if (fresh.length > 0) {
        const newest = fresh[0];
        if (isFirstLoad || !prevIdsRef.current.has(newest.id)) {
          clearTimeout(popupTimerRef.current);
          setPopup(newest);
          popupTimerRef.current = setTimeout(() => setPopup(null), 7000);
        }
      }
      prevIdsRef.current = new Set(fresh.map(n => n.id));
      setNotifs(fresh);
    } catch {}
  };

  useEffect(() => {
    load(true);
    // Poll every 60 s — 30 s was unnecessarily aggressive and doubled server load.
    const t = setInterval(() => load(false), 60000);

    // Request push permission and subscribe (non-blocking, runs after 3s)
    const pushTimer = setTimeout(() => {
      initPushNotifications(sub => notificationsApi.pushSubscribe({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys?.p256dh, auth: sub.keys?.auth },
      })).catch(() => {});
    }, 3000);

    return () => { clearInterval(t); clearTimeout(popupTimerRef.current); clearTimeout(pushTimer); };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markOne = async (id, e) => {
    e?.stopPropagation();
    await notificationsApi.markRead(id);
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  const markAll = async () => {
    await notificationsApi.markAllRead();
    setNotifs([]);
  };

  const handleClick = async (n) => {
    await markOne(n.id);
    setOpen(false);
    navigate(getRoute(n.notif_type, user?.role));
  };

  const handlePopupClick = async () => {
    if (!popup) return;
    await markOne(popup.id);
    setPopup(null);
    navigate(getRoute(popup.notif_type, user?.role));
  };

  const meta = (type) => TYPE_META[type] || TYPE_META.general;

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl text-blue-200 hover:text-white hover:bg-white/10 transition-all">
        <Bell size={20} className={notifs.length > 0 ? 'animate-pulse' : ''} />
        {notifs.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow-lg">
            {notifs.length > 9 ? '9+' : notifs.length}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-12 w-96 max-w-[calc(100vw-1rem)] bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-primary to-primary-light">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-white/80" />
              <p className="font-bold text-white text-sm">Notifications</p>
              {notifs.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{notifs.length}</span>
              )}
            </div>
            {notifs.length > 0 && (
              <button onClick={markAll} className="flex items-center gap-1 text-xs text-blue-200 hover:text-white font-medium transition">
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">All caught up!</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">No unread notifications</p>
              </div>
            ) : notifs.map(n => {
              const m = meta(n.notif_type);
              return (
                <div key={n.id} onClick={() => handleClick(n)}
                  className={`flex gap-3 px-4 py-3.5 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors group`}>
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center text-base shrink-0 shadow-sm`}>
                    {m.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-gradient-to-r ${m.color} text-white`}>{m.label}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">{fmt(n.created_at)}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{n.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                  <div className="flex flex-col items-center justify-between shrink-0">
                    <button onClick={(e) => markOne(n.id, e)} className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 p-0.5 rounded transition">
                      <X size={13} />
                    </button>
                    <ChevronRight size={13} className="text-gray-300 group-hover:text-primary dark:group-hover:text-blue-400 transition" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pop-up toast — professional, visible */}
      {popup && (() => {
        const m = meta(popup.notif_type);
        return (
          <div className="fixed bottom-6 right-6 z-[9999] w-96 max-w-[calc(100vw-2rem)] cursor-pointer"
            onClick={handlePopupClick}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.25)] border border-gray-100 dark:border-gray-700 overflow-hidden">
              {/* Gradient top bar */}
              <div className={`h-1 w-full bg-gradient-to-r ${m.color}`} />
              <div className="p-4 flex gap-3 items-start">
                <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${m.color} flex items-center justify-center text-xl shrink-0 shadow-md`}>
                  {m.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-gradient-to-r ${m.color} text-white`}>{m.label}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">just now</span>
                  </div>
                  <p className="font-bold text-gray-800 dark:text-white text-sm leading-tight">{popup.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{popup.message}</p>
                  <p className="text-[10px] text-primary dark:text-blue-400 font-semibold mt-2 flex items-center gap-1">
                    Tap to view <ChevronRight size={10} />
                  </p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setPopup(null); }}
                  className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition shrink-0">
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
