import { useEffect, useState } from 'react';
import { Clock, MapPin, CheckCircle, XCircle, Eye, X, UserCheck,
         ExternalLink, Image, Users, Shield } from 'lucide-react';
import { attendanceApi, usersApi, officeLocationsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import AttendanceCamera from '../../components/AttendanceCamera';
import PunchModeModal   from '../../components/PunchModeModal';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const STATUS_COLOR = {
  present:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  absent:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  half_day: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  leave:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

/* ── tiny helpers ── */
const fmt     = dt => dt ? new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDate = d  => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

function MapLink({ lat, lng, label }) {
  if (!lat) return <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>;
  return (
    <a href={`https://maps.google.com?q=${lat},${lng}`}
       target="_blank" rel="noopener noreferrer"
       className="flex items-start gap-1 text-xs text-blue-500 hover:text-blue-600 group max-w-[160px]">
      <MapPin size={10} className="shrink-0 mt-0.5" />
      <span className="line-clamp-2 leading-tight">
        {label || `${parseFloat(lat).toFixed(5)}, ${parseFloat(lng).toFixed(5)}`}
      </span>
      <ExternalLink size={8} className="shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition" />
    </a>
  );
}

/* ── Selfie thumbnail ── */
function SelfieThumb({ url, label, border, onClick }) {
  if (!url) return (
    <div className={`w-10 h-10 rounded-lg border ${border} bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center gap-0.5`}>
      <Image size={11} className="text-gray-300 dark:text-gray-600" />
      <span className="text-[8px] text-gray-300 dark:text-gray-600">{label}</span>
    </div>
  );
  return (
    <button onClick={onClick} title={`${label} selfie`} className="relative group">
      <img src={url} alt={label}
           className={`w-10 h-10 rounded-lg object-cover border-2 ${border} shadow-sm transition-all group-hover:scale-105`} />
      <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Eye size={12} className="text-white" />
      </div>
    </button>
  );
}

/* ── Punch mode badge ── */
function PunchModeBadge({ mode, within }) {
  if (!mode) return <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>;
  if (mode === 'geofence') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold
                       bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 whitespace-nowrap">
        🏢 Geofence
        {within === true && <span className="opacity-70">✓</span>}
        {within === false && <span className="opacity-70 text-red-500">✗</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold
                     bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 whitespace-nowrap">
      📍 Client
      {within === false && <span className="opacity-70 ml-0.5">· outside</span>}
    </span>
  );
}

/* ── Reusable records table ── */
function RecordsTable({ records, openModal }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-x-auto">
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <tr>
            {['Name', 'Date', 'Selfies', 'Punch In', 'Punch In Location',
              'Punch Out', 'Punch Out Location', 'Hours', 'Status', 'Mode'].map(h => (
              <th key={h} className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap text-xs">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr><td colSpan={10} className="text-center py-10 text-gray-400 dark:text-gray-500">No records found</td></tr>
          ) : records.map(r => (
            <tr key={r.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <td className="py-3 px-4">
                <p className="font-semibold text-gray-800 dark:text-white text-sm leading-tight">{r.user_detail?.full_name}</p>
                <p className="text-xs text-gray-400">{r.user_detail?.site_location || r.user_detail?.department}</p>
              </td>
              <td className="py-3 px-4 text-gray-600 dark:text-gray-300 whitespace-nowrap text-xs">{fmtDate(r.date)}</td>
              <td className="py-3 px-4">
                <div className="flex gap-1.5">
                  <SelfieThumb url={r.selfie_url} label="IN" border="border-emerald-200 dark:border-emerald-800"
                    onClick={() => openModal(r.selfie_url, { label:'Punch In', time:fmt(r.punch_in), lat:r.punch_in_lat, lng:r.punch_in_lng, address:r.punch_in_address })} />
                  <SelfieThumb url={r.punch_out_selfie_url} label="OUT" border="border-red-200 dark:border-red-800"
                    onClick={() => openModal(r.punch_out_selfie_url, { label:'Punch Out', time:fmt(r.punch_out), lat:r.punch_out_lat, lng:r.punch_out_lng, address:r.punch_out_address })} />
                </div>
              </td>
              <td className="py-3 px-4 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <Clock size={11} className="text-emerald-500 shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300 text-xs">{fmt(r.punch_in)}</span>
                </div>
              </td>
              <td className="py-3 px-4"><MapLink lat={r.punch_in_lat} lng={r.punch_in_lng} label={r.punch_in_address} /></td>
              <td className="py-3 px-4 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <Clock size={11} className="text-red-400 shrink-0" />
                  <span className="text-gray-700 dark:text-gray-300 text-xs">{fmt(r.punch_out)}</span>
                </div>
              </td>
              <td className="py-3 px-4"><MapLink lat={r.punch_out_lat} lng={r.punch_out_lng} label={r.punch_out_address} /></td>
              <td className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap text-xs">
                {r.hours_worked ? `${r.hours_worked}h` : '—'}
              </td>
              <td className="py-3 px-4">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_COLOR[r.status] || STATUS_COLOR.absent}`}>
                  {r.status?.replace('_', ' ')}
                </span>
              </td>
              <td className="py-3 px-4">
                <PunchModeBadge mode={r.punch_mode} within={r.within_geofence} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Filter row (shared) ── */
function FilterRow({ filters, setFilters, userList, allLabel }) {
  return (
    <div className="flex flex-wrap gap-3 mb-5">
      {userList && (
        <select value={filters.user_id || ''}
          onChange={e => setFilters(f => ({ ...f, user_id: e.target.value }))}
          className="border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30">
          <option value="">{allLabel || 'All'}</option>
          {userList.map(s => <option key={s.id} value={s.id}>{s.full_name || s.username}</option>)}
        </select>
      )}
      <input type="date" value={filters.date || ''}
        onChange={e => setFilters(f => ({ ...f, date: e.target.value }))}
        className="border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
      <select value={filters.month}
        onChange={e => setFilters(f => ({ ...f, month: e.target.value, date: '' }))}
        className="border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30">
        {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
      </select>
      <input type="number" value={filters.year}
        onChange={e => setFilters(f => ({ ...f, year: e.target.value, date: '' }))}
        className="border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 w-24" />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════ */
export default function AdminAttendance() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin      = user?.role === 'admin';

  /* ── tab: super_admin → 'staff' | 'admin_att' | 'mine'
             admin       → 'staff' | 'mine'       | 'sa_view'  ── */
  const [tab, setTab] = useState('staff');

  /* ── Staff records (both roles) ── */
  const [records,    setRecords]    = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [filters,    setFilters]    = useState({
    user_id: '', date: '',
    month: new Date().getMonth() + 1,
    year:  new Date().getFullYear(),
  });

  /* ── Admin attendance records (super admin's 2nd tab) ── */
  const [adminRecords, setAdminRecords] = useState([]);
  const [adminUsers,   setAdminUsers]   = useState([]);
  const [adminFilters, setAdminFilters] = useState({
    user_id: '', date: '',
    month: new Date().getMonth() + 1,
    year:  new Date().getFullYear(),
  });

  /* ── Super-admin records (admin's 3rd tab) ── */
  const [saRecords,  setSaRecords]  = useState([]);
  const [saFilters,  setSaFilters]  = useState({
    date: '',
    month: new Date().getMonth() + 1,
    year:  new Date().getFullYear(),
  });

  /* ── Selfie lightbox ── */
  const [selfieModal, setSelfieModal] = useState(null);

  /* ── Own attendance (Mine / Super Admin Attendance tab) ── */
  const [today,   setToday]   = useState(null);
  const [history, setHistory] = useState([]);
  const [camera,  setCamera]  = useState(false);
  const [camAction, setCamAction] = useState('in');
  const [loading, setLoading] = useState(false);
  const [officeLocations, setOfficeLocations] = useState([]);

  /* ── punch flow ── */
  const [modeModal, setModeModal] = useState(false);
  const [punchMode, setPunchMode] = useState(null);

  /* ── Loaders ── */
  const loadStaff = () => {
    const p = isSuperAdmin ? {} : { staff_only: true };
    if (filters.user_id) p.user_id = filters.user_id;
    if (filters.date)    p.date    = filters.date;
    else { p.month = filters.month; p.year = filters.year; }
    attendanceApi.list(p).then(r => setRecords(r.data.results || r.data));
  };

  const loadAdminRecords = () => {
    const p = { role: 'admin' };
    if (adminFilters.user_id) p.user_id = adminFilters.user_id;
    if (adminFilters.date)    p.date    = adminFilters.date;
    else { p.month = adminFilters.month; p.year = adminFilters.year; }
    attendanceApi.list(p).then(r => setAdminRecords(r.data.results || r.data));
  };

  const loadSaRecords = () => {
    const p = { role: 'super_admin' };
    if (saFilters.date) p.date = saFilters.date;
    else { p.month = saFilters.month; p.year = saFilters.year; }
    attendanceApi.list(p).then(r => setSaRecords(r.data.results || r.data));
  };

  const loadMine = () => {
    attendanceApi.todayStatus().then(r => setToday(r.data)).catch(() => {});
    attendanceApi.list({}).then(r => {
      const todayStr = new Date().toISOString().split('T')[0];
      const past = (r.data.results || r.data).filter(rec => rec.date !== todayStr);
      setHistory(past.slice(0, 15));
    }).catch(() => {});
  };

  /* ── Initial data load ── */
  useEffect(() => {
    if (isSuperAdmin) {
      usersApi.list().then(r => setStaffUsers(r.data.results || r.data)).catch(() => {});
      usersApi.list({ role: 'admin' }).then(r => setAdminUsers(r.data.results || r.data)).catch(() => {});
    } else {
      usersApi.staffList().then(r => setStaffUsers(r.data)).catch(() => {});
    }
    officeLocationsApi.list().then(r => setOfficeLocations(r.data)).catch(() => {});
  }, []);

  useEffect(() => { loadStaff(); },                                    [filters]);
  useEffect(() => { if (isSuperAdmin && tab === 'admin_att') loadAdminRecords(); }, [tab, adminFilters]);
  useEffect(() => { if (isAdmin && tab === 'sa_view') loadSaRecords(); },          [tab, saFilters]);
  useEffect(() => { if (tab === 'mine') loadMine(); },                 [tab]);

  /* ── Camera flow ── */
  const openModeSelect  = act  => { setCamAction(act); setModeModal(true); };
  const handleModeSelect = mode => { setPunchMode(mode); setModeModal(false); setCamera(true); };;

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
      if (camAction === 'in') await attendanceApi.punchIn(fd);
      else                    await attendanceApi.punchOut(fd);
      loadMine();
    } catch (e) {
      alert(e.response?.data?.error || e.response?.data?.detail || 'Failed — please try again.');
    } finally { setLoading(false); }
  };

  const openModal = (url, meta) => setSelfieModal({ url, ...meta });

  /* ── Tab definitions ── */
  const tabDefs = isSuperAdmin
    ? [
        { key: 'staff',     label: 'Staff Attendance',      icon: <UserCheck size={15}/> },
        { key: 'admin_att', label: 'Admin Attendance',       icon: <Users size={15}/> },
        { key: 'mine',      label: 'Super Admin Attendance', icon: <Clock size={15}/> },
      ]
    : [
        { key: 'staff',   label: 'Staff Attendance', icon: <UserCheck size={15}/> },
        { key: 'mine',    label: 'My Attendance',    icon: <Clock size={15}/> },
        { key: 'sa_view', label: 'Super Admin',      icon: <Shield size={15}/> },
      ];

  /* ════════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── Punch-mode selection overlay ── */}
      {modeModal && (
        <PunchModeModal
          action={camAction}
          onSelect={handleModeSelect}
          onCancel={() => setModeModal(false)}
        />
      )}

      {/* ── Geo-camera overlay ── */}
      {camera && (
        <AttendanceCamera
          action={camAction}
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
              className="absolute -top-3 -right-3 w-8 h-8 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center z-10">
              <X size={15} className="text-gray-700 dark:text-gray-300" />
            </button>
            <img src={selfieModal.url} alt="attendance selfie"
              className="w-full rounded-2xl shadow-2xl object-contain max-h-[75vh]" />
            <div className="mt-3 space-y-1 px-1">
              {selfieModal.time && (
                <p className="text-white/70 text-xs flex items-center gap-1.5">
                  <Clock size={11}/>{selfieModal.label} — {selfieModal.time}
                </p>
              )}
              {selfieModal.lat && (
                <a href={`https://maps.google.com?q=${selfieModal.lat},${selfieModal.lng}`}
                   target="_blank" rel="noopener noreferrer"
                   className="flex items-center gap-1.5 text-white/60 hover:text-white text-xs transition">
                  <MapPin size={11}/>
                  {selfieModal.address || `${parseFloat(selfieModal.lat).toFixed(5)}, ${parseFloat(selfieModal.lng).toFixed(5)}`}
                  <ExternalLink size={9}/>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Attendance</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">GPS attendance records &amp; selfie verification</p>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit mb-6 flex-wrap">
          {tabDefs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-white dark:bg-gray-700 text-primary dark:text-blue-400 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ═══════════ STAFF ATTENDANCE TAB ═══════════ */}
        {tab === 'staff' && (
          <>
            <FilterRow
              filters={filters}
              setFilters={setFilters}
              userList={staffUsers}
              allLabel={isSuperAdmin ? 'All Users' : 'All Staff'}
            />
            <RecordsTable records={records} openModal={openModal} />
          </>
        )}

        {/* ═══════════ ADMIN ATTENDANCE TAB (super admin only) ═══════════ */}
        {tab === 'admin_att' && isSuperAdmin && (
          <>
            <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
              <Users size={15} className="text-blue-500 shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                Showing attendance records for Admin-role users
              </p>
            </div>
            <FilterRow
              filters={adminFilters}
              setFilters={setAdminFilters}
              userList={adminUsers}
              allLabel="All Admins"
            />
            <RecordsTable records={adminRecords} openModal={openModal} />
          </>
        )}

        {/* ═══════════ SUPER ADMIN VIEW TAB (admin only) ═══════════ */}
        {tab === 'sa_view' && isAdmin && (
          <>
            <div className="flex items-center gap-2 mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800">
              <Shield size={15} className="text-purple-500 shrink-0" />
              <p className="text-sm text-purple-700 dark:text-purple-300 font-medium">
                Showing attendance records for Super Admin
              </p>
            </div>
            <FilterRow
              filters={saFilters}
              setFilters={setSaFilters}
              userList={null}
              allLabel={null}
            />
            <RecordsTable records={saRecords} openModal={openModal} />
          </>
        )}

        {/* ═══════════ MINE / SUPER ADMIN ATTENDANCE TAB ═══════════ */}
        {tab === 'mine' && (
          <>
            {/* Today card */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 mb-5">
              <h2 className="font-bold text-gray-800 dark:text-white mb-4">Today's Status</h2>

              {loading && <p className="text-sm text-gray-400 animate-pulse py-2">Saving attendance…</p>}

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
                        <PunchModeBadge mode={today.punch_mode} within={today.within_geofence} />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{fmt(today.punch_in)}</p>
                      {today.punch_in_address && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                          <MapPin size={10} className="shrink-0"/>{today.punch_in_address}
                        </p>
                      )}
                    </div>
                    {today.selfie_url && (
                      <button onClick={() => setSelfieModal({ url:today.selfie_url, label:'Punch In', time:fmt(today.punch_in), lat:today.punch_in_lat, lng:today.punch_in_lng, address:today.punch_in_address })} className="shrink-0">
                        <img src={today.selfie_url} alt="in selfie"
                          className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-200 dark:border-emerald-800 hover:opacity-80 transition"/>
                      </button>
                    )}
                  </div>

                  {/* Punch-out */}
                  {today.punch_out ? (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                        <XCircle size={20} className="text-red-400"/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 dark:text-white">Punched Out</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {fmt(today.punch_out)} &nbsp;·&nbsp; {today.hours_worked}h worked
                        </p>
                        {today.punch_out_address && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                            <MapPin size={10} className="shrink-0"/>{today.punch_out_address}
                          </p>
                        )}
                      </div>
                      {today.punch_out_selfie_url && (
                        <button onClick={() => setSelfieModal({ url:today.punch_out_selfie_url, label:'Punch Out', time:fmt(today.punch_out), lat:today.punch_out_lat, lng:today.punch_out_lng, address:today.punch_out_address })} className="shrink-0">
                          <img src={today.punch_out_selfie_url} alt="out selfie"
                            className="w-14 h-14 rounded-xl object-cover border-2 border-red-200 dark:border-red-800 hover:opacity-80 transition"/>
                        </button>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => openModeSelect('out')}
                      className="flex items-center gap-2 w-full justify-center py-3.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 active:scale-[.98] transition-all shadow-md shadow-red-500/20">
                      <Clock size={18}/> Punch Out
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {isSuperAdmin ? "You haven't punched in today." : "You haven't punched in today."}
                  </p>
                  <button onClick={() => openModeSelect('in')}
                    className="flex items-center gap-2 w-full justify-center py-3.5 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 active:scale-[.98] transition-all shadow-md shadow-emerald-500/20">
                    <Clock size={18}/> Punch In
                  </button>
                </div>
              ))}
            </div>

            {/* History table */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="font-bold text-gray-800 dark:text-white">
                  {isSuperAdmin ? 'Super Admin Attendance History' : 'My Attendance History'}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[680px]">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      {['Date', 'Selfies', 'Punch In', 'Punch Out', 'Location', 'Mode', 'Hours', 'Status'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap text-xs">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-8 text-gray-400 dark:text-gray-500">No records yet</td></tr>
                    ) : history.map(r => (
                      <tr key={r.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="py-2.5 px-4 text-gray-700 dark:text-gray-300 whitespace-nowrap font-medium text-xs">{fmtDate(r.date)}</td>
                        <td className="py-2.5 px-4">
                          <div className="flex gap-1.5">
                            <SelfieThumb url={r.selfie_url} label="IN" border="border-emerald-200 dark:border-emerald-800"
                              onClick={() => openModal(r.selfie_url, { label:'Punch In', time:fmt(r.punch_in), lat:r.punch_in_lat, lng:r.punch_in_lng, address:r.punch_in_address })} />
                            <SelfieThumb url={r.punch_out_selfie_url} label="OUT" border="border-red-200 dark:border-red-800"
                              onClick={() => openModal(r.punch_out_selfie_url, { label:'Punch Out', time:fmt(r.punch_out), lat:r.punch_out_lat, lng:r.punch_out_lng, address:r.punch_out_address })} />
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-emerald-600 whitespace-nowrap text-xs">{fmt(r.punch_in)}</td>
                        <td className="py-2.5 px-4 text-red-400 whitespace-nowrap text-xs">{fmt(r.punch_out)}</td>
                        <td className="py-2.5 px-4">
                          <MapLink lat={r.punch_in_lat} lng={r.punch_in_lng} label={r.punch_in_address}/>
                        </td>
                        <td className="py-2.5 px-4">
                          <PunchModeBadge mode={r.punch_mode} within={r.within_geofence} />
                        </td>
                        <td className="py-2.5 px-4 font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap text-xs">
                          {r.hours_worked ? `${r.hours_worked}h` : '—'}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[r.status] || STATUS_COLOR.absent}`}>
                            {r.status?.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
