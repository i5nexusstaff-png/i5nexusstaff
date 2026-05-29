/**
 * SettingsExtras — reusable sections added to every settings page:
 *   1. Font Size selector
 *   2. Active Sessions (logged-in devices)
 */
import { useEffect, useState } from 'react';
import { Type, Monitor, Smartphone, Laptop, Globe, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { useFontSize, FONT_SIZES } from '../contexts/FontSizeContext';
import { usersApi } from '../services/api';

/* ── Font Size Selector ──────────────────────────────────────────────────── */
export function FontSizeSection() {
  const { size, setSize } = useFontSize();

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0">
          <Type size={16} className="text-indigo-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-800 dark:text-white text-sm">Font Size</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Adjust the text size across the app</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {FONT_SIZES.map(f => (
          <button
            key={f.key}
            onClick={() => setSize(f.key)}
            className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl border-2 transition-all
              ${size === f.key
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-100 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600'
              }`}>
            {/* Preview text */}
            <span
              className={`font-bold text-gray-800 dark:text-white leading-none ${
                f.key === 'sm' ? 'text-sm' : f.key === 'md' ? 'text-base' : f.key === 'lg' ? 'text-lg' : 'text-xl'
              }`}>
              Aa
            </span>
            <span className={`text-[10px] font-semibold leading-none ${
              size === f.key ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
            }`}>
              {f.label}
            </span>
            {size === f.key && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Device icon helper ──────────────────────────────────────────────────── */
function DeviceIcon({ device }) {
  const d = (device || '').toLowerCase();
  if (d.includes('iphone') || d.includes('android')) return <Smartphone size={16} className="text-blue-500" />;
  if (d.includes('ipad')) return <Monitor size={16} className="text-purple-500" />;
  if (d.includes('mac') || d.includes('windows') || d.includes('linux')) return <Laptop size={16} className="text-gray-500" />;
  return <Globe size={16} className="text-gray-400" />;
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d) / 60000);
  if (diff < 1)    return 'Just now';
  if (diff < 60)   return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── Active Sessions ─────────────────────────────────────────────────────── */
export function ActiveSessionsSection() {
  const [sessions, setSessions]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [revoking, setRevoking]   = useState(null);
  const currentKey = localStorage.getItem('session_key') || '';

  const load = () => {
    setLoading(true);
    usersApi.sessions(currentKey)
      .then(r => setSessions(r.data || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleRevoke = async (sessionId) => {
    setRevoking(sessionId);
    try {
      await usersApi.revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch {}
    finally { setRevoking(null); }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
            <Monitor size={16} className="text-blue-500" />
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-white text-sm">Active Sessions</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Devices currently logged into your account</p>
          </div>
        </div>
        <button onClick={load} disabled={loading}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={20} className="animate-spin text-blue-400" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-10">
          <Monitor size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-400 dark:text-gray-500">No sessions found</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 dark:divide-gray-800">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                s.is_current ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-gray-50 dark:bg-gray-800'
              }`}>
                <DeviceIcon device={s.device} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{s.device}</p>
                  {s.is_current && (
                    <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                      This device
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {s.ip !== '—' ? `${s.ip} · ` : ''}{fmtDate(s.last_active)}
                </p>
                <p className="text-[10px] text-gray-300 dark:text-gray-600 mt-0.5">
                  Signed in {fmtDate(s.created_at)}
                </p>
              </div>
              {!s.is_current && (
                <button
                  onClick={() => handleRevoke(s.id)}
                  disabled={revoking === s.id}
                  className="shrink-0 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40">
                  {revoking === s.id
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Trash2 size={14} />}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
