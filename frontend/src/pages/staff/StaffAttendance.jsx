import { useEffect, useState } from 'react';
import { Clock, CheckCircle, XCircle, MapPin, ExternalLink, Image, Building2 } from 'lucide-react';
import { attendanceApi, officeLocationsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import AttendanceCamera  from '../../components/AttendanceCamera';
import PunchModeModal    from '../../components/PunchModeModal';

const STATUS_COLOR = {
  present:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  absent:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  half_day: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  leave:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

function MapLink({ lat, lng, label }) {
  if (!lat) return <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>;
  return (
    <a href={`https://maps.google.com?q=${lat},${lng}`}
       target="_blank" rel="noopener noreferrer"
       className="flex items-center gap-1 text-blue-500 hover:text-blue-600 text-xs group">
      <MapPin size={10} className="shrink-0" />
      <span className="truncate max-w-[130px]">{label || `${parseFloat(lat).toFixed(4)}, ${parseFloat(lng).toFixed(4)}`}</span>
      <ExternalLink size={9} className="shrink-0 opacity-0 group-hover:opacity-100 transition" />
    </a>
  );
}

function PunchModeBadge({ mode }) {
  if (!mode) return null;
  if (mode === 'geofence') return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
      🏢 Geofencing
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      📍 GPS Tagged
    </span>
  );
}

export default function StaffAttendance() {
  const { user } = useAuth();

  const [today,          setToday]          = useState(null);
  const [history,        setHistory]        = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [selfieModal,    setSelfieModal]    = useState(null);
  const [officeLocations, setOfficeLocations] = useState([]);

  /* ── punch flow state ── */
  const [modeModal,   setModeModal]   = useState(false);   // show mode-selection overlay
  const [punchAction, setPunchAction] = useState('in');    // 'in' | 'out'
  const [punchMode,   setPunchMode]   = useState(null);    // 'geofence' | 'gps_tagged'
  const [camera,      setCamera]      = useState(false);   // show camera

  const load = () => {
    attendanceApi.todayStatus().then(r => setToday(r.data)).catch(() => {});
    attendanceApi.list({}).then(r => {
      const todayStr = new Date().toISOString().split('T')[0];
      const past = (r.data.results || r.data).filter(rec => rec.date !== todayStr);
      setHistory(past.slice(0, 14));
    }).catch(() => {});
  };

  useEffect(() => {
    load();
    officeLocationsApi.list().then(r => setOfficeLocations(r.data)).catch(() => {});
  }, []);

  /* ── Open mode-selection modal ── */
  const openModeSelect = act => { setPunchAction(act); setModeModal(true); };

  /* ── User picked a mode → show camera ── */
  const handleModeSelect = mode => {
    setPunchMode(mode);
    setModeModal(false);
    setCamera(true);
  };

  /* ── Camera captured ── */
  const handleCapture = async ({ blob, location, address, bypassGeofence }) => {
    setCamera(false);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('selfie', blob, 'selfie.jpg');
      if (location) {
        fd.append('latitude',  location.lat);
        fd.append('longitude', location.lng);
        fd.append('address',   address.fullAddr || address.short || address.cityLine || '');
      }
      if (bypassGeofence) fd.append('bypass_geofence', 'true');
      if (punchAction === 'in') await attendanceApi.punchIn(fd);
      else                       await attendanceApi.punchOut(fd);
      load();
    } catch (e) {
      alert(e.response?.data?.error || e.response?.data?.detail || 'Failed — please try again.');
    } finally { setLoading(false); }
  };

  const fmt     = dt => dt ? new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
  const fmtDate = d  => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <>
      {/* ── Punch-mode selection overlay ── */}
      {modeModal && (
        <PunchModeModal
          action={punchAction}
          onSelect={handleModeSelect}
          onCancel={() => setModeModal(false)}
        />
      )}

      {/* ── Full-screen geo-camera ── */}
      {camera && (
        <AttendanceCamera
          action={punchAction}
          punchMode={punchMode}
          userName={user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim()}
          onCapture={handleCapture}
          onCancel={() => setCamera(false)}
          officeLocations={officeLocations}
        />
      )}

      {/* ── Selfie lightbox ── */}
      {selfieModal && (
        <div className="fixed inset-0 bg-black/85 z-[9990] flex items-center justify-center p-4"
             onClick={() => setSelfieModal(null)}>
          <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelfieModal(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center z-10">✕</button>
            <img src={selfieModal} alt="attendance selfie"
              className="w-full rounded-2xl shadow-2xl object-contain max-h-[80vh]" />
            <p className="text-center text-white/60 text-xs mt-3">GPS location &amp; timestamp stamped on photo</p>
          </div>
        </div>
      )}

      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Attendance</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">GPS-tagged selfie required · choose Geofencing or GPS Tagged</p>
        </div>

        {/* ── Today card ── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 sm:p-6 mb-5">
          <h2 className="font-bold text-gray-800 dark:text-white mb-4">Today's Status</h2>

          {loading && <p className="text-sm text-gray-400 dark:text-gray-500 animate-pulse py-2">Saving attendance…</p>}

          {!loading && (today?.punch_in ? (
            <div className="space-y-4">
              {/* Punch-in */}
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                  <CheckCircle size={20} className="text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-800 dark:text-white">Punched In</p>
                    <PunchModeBadge mode={today.punch_mode} />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{fmt(today.punch_in)}</p>
                  {today.punch_in_address && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin size={10} className="shrink-0" />{today.punch_in_address}
                    </p>
                  )}
                </div>
                {today.selfie_url && (
                  <button onClick={() => setSelfieModal(today.selfie_url)} className="shrink-0">
                    <img src={today.selfie_url} alt="punch-in selfie"
                      className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-200 dark:border-emerald-800 hover:opacity-80 transition" />
                  </button>
                )}
              </div>

              {/* Punch-out or button */}
              {today.punch_out ? (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                    <XCircle size={20} className="text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 dark:text-white">Punched Out</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {fmt(today.punch_out)} &nbsp;·&nbsp; {today.hours_worked}h worked
                    </p>
                    {today.punch_out_address && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin size={10} className="shrink-0" />{today.punch_out_address}
                      </p>
                    )}
                  </div>
                  {today.punch_out_selfie_url && (
                    <button onClick={() => setSelfieModal(today.punch_out_selfie_url)} className="shrink-0">
                      <img src={today.punch_out_selfie_url} alt="punch-out selfie"
                        className="w-14 h-14 rounded-xl object-cover border-2 border-red-200 dark:border-red-800 hover:opacity-80 transition" />
                    </button>
                  )}
                </div>
              ) : (
                <button onClick={() => openModeSelect('out')}
                  className="flex items-center gap-2 w-full justify-center py-3.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 active:scale-[.98] transition-all shadow-md shadow-red-500/20">
                  <Clock size={18} /> Punch Out
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-gray-500 dark:text-gray-400 text-sm">You haven't punched in today.</p>
              <button onClick={() => openModeSelect('in')}
                className="flex items-center gap-2 w-full justify-center py-3.5 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 active:scale-[.98] transition-all shadow-md shadow-emerald-500/20">
                <Clock size={18} /> Punch In
              </button>
            </div>
          ))}

          {user?.site_location && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
              <Building2 size={13} className="text-gray-400 shrink-0" />
              <span>Site: <strong className="text-gray-700 dark:text-gray-200">{user.site_location}</strong></span>
            </div>
          )}
        </div>

        {/* ── History table ── */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="font-bold text-gray-800 dark:text-white">Recent Attendance</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  {['Date','Selfie','Punch In','Punch Out','Location','Mode','Hours','Status'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400 dark:text-gray-500">No records yet</td></tr>
                ) : history.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-2.5 px-4 text-gray-700 dark:text-gray-300 whitespace-nowrap font-medium text-xs">{fmtDate(r.date)}</td>
                    <td className="py-2.5 px-4">
                      <div className="flex gap-1">
                        {r.selfie_url
                          ? <button onClick={() => setSelfieModal(r.selfie_url)} title="Punch-in selfie">
                              <img src={r.selfie_url} alt="in" className="w-9 h-9 rounded-lg object-cover border border-emerald-200 dark:border-emerald-800 hover:opacity-75 transition" />
                            </button>
                          : <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center"><Image size={12} className="text-gray-300" /></div>}
                        {r.punch_out_selfie_url
                          ? <button onClick={() => setSelfieModal(r.punch_out_selfie_url)} title="Punch-out selfie">
                              <img src={r.punch_out_selfie_url} alt="out" className="w-9 h-9 rounded-lg object-cover border border-red-200 dark:border-red-800 hover:opacity-75 transition" />
                            </button>
                          : null}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-emerald-600 whitespace-nowrap text-xs">{fmt(r.punch_in)}</td>
                    <td className="py-2.5 px-4 text-red-400 whitespace-nowrap text-xs">{fmt(r.punch_out)}</td>
                    <td className="py-2.5 px-4">
                      <MapLink lat={r.punch_in_lat} lng={r.punch_in_lng} label={r.punch_in_address} />
                    </td>
                    <td className="py-2.5 px-4">
                      <PunchModeBadge mode={r.punch_mode} />
                    </td>
                    <td className="py-2.5 px-4 text-gray-700 dark:text-gray-300 whitespace-nowrap font-medium text-xs">
                      {r.hours_worked ? `${r.hours_worked}h` : '—'}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLOR[r.status]}`}>
                        {r.status?.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
