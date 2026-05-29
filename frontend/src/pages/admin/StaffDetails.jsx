import { useEffect, useRef, useState } from 'react';
import { useConfirm } from '../../components/ConfirmDialog';
import {
  Plus, Trash2, Edit2, Search, X, ShieldCheck, ShieldOff,
  FileSpreadsheet, Users, Clock, CalendarCheck, ChevronRight,
  MoreVertical, Building2, UserCheck, Loader2, TrendingUp,
  MapPin, Phone, Mail, LayoutList, LayoutGrid,
} from 'lucide-react';
import { usersApi, excelImportApi, attendanceApi, leavesApi } from '../../services/api';

// ── Constants ──────────────────────────────────────────────────────────────────
const ROLES = ['staff', 'admin'];
const DEPARTMENTS = [
  'Sales', 'Presales', 'Digital Marketing', 'Accounts',
  'Legal', 'Administration', 'Human Resources', 'Management',
];
const LOCATIONS = ['Head Office', 'Tambaram', 'Auroville'];

const REPORT_TYPES = [
  { value: '',                  label: 'Not Assigned' },
  { value: 'sales_head',        label: 'Sales Head Report' },
  { value: 'sales_manager',     label: 'Sales Manager Report' },
  { value: 'vp',                label: 'VP Report' },
  { value: 'telecallers_head',  label: 'Telecallers Head Report' },
  { value: 'marketing',         label: 'Marketing Report' },
  { value: 'bdm',               label: 'BDM Report' },
  { value: 'telecallers',       label: 'Telecallers Report' },
];

const DEPT_COLORS = {
  'Sales':            { bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-700 dark:text-blue-400' },
  'Presales':         { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400' },
  'Digital Marketing':{ bg: 'bg-pink-100 dark:bg-pink-900/30',    text: 'text-pink-700 dark:text-pink-400' },
  'Accounts':         { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' },
  'Legal':            { bg: 'bg-amber-100 dark:bg-amber-900/30',  text: 'text-amber-700 dark:text-amber-400' },
  'Administration':   { bg: 'bg-gray-100 dark:bg-gray-800',       text: 'text-gray-700 dark:text-gray-300' },
  'Human Resources':  { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400' },
  'Management':       { bg: 'bg-red-100 dark:bg-red-900/30',      text: 'text-red-700 dark:text-red-400' },
};

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
  'bg-rose-500', 'bg-cyan-500', 'bg-orange-500', 'bg-teal-500',
];

const emptyForm = {
  first_name: '', last_name: '', username: '', email: '', password: '',
  role: 'staff', position: '', department: 'Sales', phone: '',
  employee_id: '', site_location: 'Head Office', report_type: '',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const getAvatarColor = (name = '') =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

const fmt12 = (dt) => {
  if (!dt) return '—';
  return new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const isLate = (punchIn) => {
  if (!punchIn) return false;
  const d = new Date(punchIn);
  return d.getHours() > 9 || (d.getHours() === 9 && d.getMinutes() > 30);
};

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ name = '?', size = 9, className = '' }) {
  const initial = name.trim()[0]?.toUpperCase() || '?';
  const color   = getAvatarColor(name);
  const sz      = `w-${size} h-${size}`;
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center text-white font-bold shrink-0 ${className}`}
      style={{ fontSize: size <= 8 ? 12 : 14 }}>
      {initial}
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h3 className="font-bold text-gray-800 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ── Stat Pill ──────────────────────────────────────────────────────────────────
function StatPill({ label, value, color }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-2xl font-black ${color}`}>{value}</span>
      <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">{label}</span>
    </div>
  );
}

// ── Dept Badge ─────────────────────────────────────────────────────────────────
function DeptBadge({ dept }) {
  const c = DEPT_COLORS[dept] || { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-300' };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}>{dept || '—'}</span>
  );
}

// ── Attendance Status Badge ────────────────────────────────────────────────────
function AttBadge({ punchIn }) {
  if (!punchIn) return null;
  const late = isLate(punchIn);
  return late
    ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Arrived Late</span>
    : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">Punctual</span>;
}

// ════════════════════════════════════════════════════════════════════════════════
export default function StaffDetails() {
  const confirm = useConfirm();
  // ── Existing state (unchanged) ────────────────────────────────────────────
  const [users,    setUsers]    = useState([]);
  const [search,   setSearch]   = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(emptyForm);
  const [loading,  setLoading]  = useState(false);
  const [xlLoading, setXlLoading] = useState(false);
  const xlRef = useRef();

  // ── New dashboard state ───────────────────────────────────────────────────
  const [attendance,   setAttendance]   = useState([]);
  const [leaves,       setLeaves]       = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [heroTab,      setHeroTab]      = useState('dept');   // dept | role
  const [dirTab,       setDirTab]       = useState('staff');  // staff | leaves | attendance
  const [openMenu,     setOpenMenu]     = useState(null);     // row actions dropdown
  const [viewMode,     setViewMode]     = useState('list');   // list | teams

  // ── Load users ─────────────────────────────────────────────────────────────
  const load = () => usersApi.list().then(r => setUsers(r.data.results || r.data));
  useEffect(() => { load(); }, []);

  // ── Load dashboard stats ───────────────────────────────────────────────────
  const loadStats = () => {
    const today = new Date().toISOString().split('T')[0];
    setStatsLoading(true);
    Promise.all([
      attendanceApi.list({ date: today }),
      leavesApi.list(),
    ])
      .then(([attRes, leaveRes]) => {
        setAttendance(attRes.data.results || attRes.data || []);
        setLeaves(leaveRes.data.results || leaveRes.data || []);
      })
      .finally(() => setStatsLoading(false));
  };
  useEffect(() => { loadStats(); }, []);

  // ── Existing handlers (unchanged) ─────────────────────────────────────────
  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (u) => {
    setEditing(u);
    setForm({
      first_name: u.first_name || '', last_name: u.last_name || '',
      username: u.username || '', email: u.email || '', password: '',
      role: u.role || 'staff', position: u.position || '',
      department: u.department || 'Sales', phone: u.phone || '',
      employee_id: u.employee_id || '', site_location: u.site_location || 'Head Office',
      report_type: u.report_type || '',
    });
    setShowModal(true);
    setOpenMenu(null);
  };

  const handleSave = async () => {
    setLoading(true);
    const payload = { ...form };
    if (!payload.password) delete payload.password;
    try {
      if (editing) await usersApi.update(editing.id, payload);
      else await usersApi.create(payload);
      load(); setShowModal(false);
    } catch (e) {
      alert('Error: ' + JSON.stringify(e.response?.data || e.message));
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete staff member?',
      message: 'This will permanently remove the account and all associated data. This cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!ok) return;
    await usersApi.delete(id); load(); setOpenMenu(null);
  };

  const handleRoleToggle = async (u) => {
    const newRole = u.role === 'admin' ? 'staff' : 'admin';
    const isPromote = newRole === 'admin';
    const ok = await confirm({
      title: isPromote ? `Promote to Admin?` : `Remove Admin access?`,
      message: isPromote
        ? `${u.full_name || u.username} will get full admin access to manage staff, reports, and bookings.`
        : `${u.full_name || u.username} will revert to staff access and lose admin privileges.`,
      variant: isPromote ? 'confirm' : 'warning',
      confirmText: isPromote ? 'Promote' : 'Remove Admin',
    });
    if (!ok) return;
    try { await usersApi.setRole(u.id, newRole); load(); }
    catch (e) { alert('Error: ' + (e.response?.data?.error || e.message)); }
    setOpenMenu(null);
  };

  // ── Computed values ────────────────────────────────────────────────────────
  const totalEmp    = users.length;
  const adminCount  = users.filter(u => u.role === 'admin').length;
  const staffCount  = users.filter(u => u.role === 'staff').length;

  const checkedInCount = attendance.filter(a => a.punch_in).length;
  const lateCount      = attendance.filter(a => a.punch_in && isLate(a.punch_in)).length;
  const absentCount    = Math.max(0, totalEmp - checkedInCount);
  const pendingLeaves  = leaves.filter(l => l.status === 'pending').length;

  // Dept breakdown for hero card
  const deptBreakdown = DEPARTMENTS
    .map(d => ({ name: d, count: users.filter(u => u.department === d).length }))
    .filter(d => d.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Role breakdown
  const roleBreakdown = [
    { name: 'Staff',      count: staffCount,  color: 'bg-blue-500' },
    { name: 'Admin',      count: adminCount,  color: 'bg-violet-500' },
    { name: 'Super Admin',count: users.filter(u => u.role === 'super_admin').length, color: 'bg-rose-500' },
  ].filter(r => r.count > 0);

  // Recent attendance (today, sorted by punch_in desc)
  const recentAtt = [...attendance]
    .filter(a => a.punch_in)
    .sort((a, b) => new Date(b.punch_in) - new Date(a.punch_in))
    .slice(0, 5);

  // Filtered user list
  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      u.first_name?.toLowerCase().includes(q) ||
      u.last_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.employee_id?.toLowerCase().includes(q) ||
      u.phone?.includes(q) ||
      u.email?.toLowerCase().includes(q);
    const matchDept = !deptFilter || u.department === deptFilter;
    return matchSearch && matchDept;
  });

  // ── Team grouping for Teams view ──────────────────────────────────────────
  const TEAMS = [
    { key: 'sales_ho',      label: 'Sales — Head Office',  match: u => u.department === 'Sales' && u.site_location === 'Head Office' },
    { key: 'sales_tam',     label: 'Sales — Tambaram',     match: u => u.department === 'Sales' && u.site_location === 'Tambaram'    },
    { key: 'sales_avi',     label: 'Sales — Auroville',    match: u => u.department === 'Sales' && u.site_location === 'Auroville'   },
    { key: 'presales',      label: 'Presales',             match: u => u.department === 'Presales'         },
    { key: 'digital',       label: 'Digital Marketing',    match: u => u.department === 'Digital Marketing'},
    { key: 'legal',         label: 'Legal',                match: u => u.department === 'Legal'            },
    { key: 'hr',            label: 'Human Resources',      match: u => u.department === 'Human Resources'  },
    { key: 'admin_dept',    label: 'Administration',       match: u => u.department === 'Administration'   },
    { key: 'accounts',      label: 'Accounts',             match: u => u.department === 'Accounts'         },
    { key: 'management',    label: 'Management',           match: u => u.department === 'Management'       },
    { key: 'others',        label: 'Others',               match: u => !['Sales','Presales','Digital Marketing','Legal','Human Resources','Administration','Accounts','Management'].includes(u.department) },
  ];

  const teamGroups = TEAMS
    .map(t => ({ ...t, members: filtered.filter(t.match) }))
    .filter(t => t.members.length > 0);

  // Close menu on outside click
  useEffect(() => {
    const handler = () => setOpenMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  /* ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col gap-5">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Staff Details</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{totalEmp} total members · {staffCount} staff · {adminCount} admin</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={xlRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={async e => {
              const file = e.target.files[0]; if (!file) return;
              setXlLoading(true);
              try {
                const r = await excelImportApi.import(file, 'staff');
                alert(`Import done: ${r.data.created} created, ${r.data.updated} updated${r.data.errors?.length ? `\nErrors: ${r.data.errors.slice(0, 3).join('\n')}` : ''}`);
                load();
              } catch { alert('Import failed. Check file format.'); }
              finally { setXlLoading(false); e.target.value = ''; }
            }} />
          <button onClick={() => xlRef.current.click()} disabled={xlLoading}
            className="flex items-center gap-2 border border-emerald-500 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-60 transition-colors">
            <FileSpreadsheet size={15} />
            {xlLoading ? 'Importing…' : 'Excel Import'}
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md transition-all hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg,#1E3A5F,#2563eb)' }}>
            <Plus size={15} /> Add New Employee
          </button>
        </div>
      </div>

      {/* ── Top Stats Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Hero: Total Employees ── */}
        <div className="rounded-2xl p-5 flex flex-col" style={{ background: 'linear-gradient(135deg,#1E3A5F 0%,#2563eb 100%)' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
              <Users size={16} className="text-white" />
            </div>
            <span className="text-white/80 text-sm font-semibold">Total Employees</span>
          </div>
          <div className="flex items-end gap-3 mt-2 mb-4">
            <span className="text-5xl font-black text-white leading-none">{totalEmp}</span>
            <span className="text-white/60 text-xs mb-1.5 font-medium">Active members</span>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 mb-3 bg-white/10 rounded-xl p-1">
            {[['dept', 'By Department'], ['role', 'By Role']].map(([key, label]) => (
              <button key={key} onClick={() => setHeroTab(key)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  heroTab === key
                    ? 'bg-white text-[#1E3A5F] shadow-sm'
                    : 'text-white/70 hover:text-white'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Breakdown list */}
          <div className="space-y-2 flex-1">
            {statsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={16} className="animate-spin text-white/60" />
              </div>
            ) : heroTab === 'dept' ? (
              deptBreakdown.map(d => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-white/90 text-xs font-semibold truncate">{d.name}</span>
                      <span className="text-white font-black text-xs ml-2">{d.count}</span>
                    </div>
                    <div className="w-full bg-white/15 rounded-full h-1.5">
                      <div className="bg-white rounded-full h-1.5 transition-all duration-700"
                        style={{ width: `${totalEmp ? (d.count / totalEmp) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              roleBreakdown.map(r => (
                <div key={r.name} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-white/90 text-xs font-semibold">{r.name}</span>
                      <span className="text-white font-black text-xs">{r.count}</span>
                    </div>
                    <div className="w-full bg-white/15 rounded-full h-1.5">
                      <div className="bg-white rounded-full h-1.5 transition-all duration-700"
                        style={{ width: `${totalEmp ? (r.count / totalEmp) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Recent Attendance ── */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Clock size={16} className="text-blue-600 dark:text-blue-400" />
            </div>
            <span className="font-bold text-gray-800 dark:text-white text-sm">Recent Attendance</span>
            <span className="ml-auto text-[11px] text-gray-400 dark:text-gray-500 font-medium">Today</span>
          </div>

          {statsLoading ? (
            <div className="flex items-center justify-center flex-1 py-8">
              <Loader2 size={20} className="animate-spin text-blue-400" />
            </div>
          ) : recentAtt.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 py-8 text-center">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-2">
                <Clock size={18} className="text-gray-300 dark:text-gray-600" />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">No check-ins yet today</p>
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {recentAtt.map(a => {
                const name = a.user_detail?.full_name || 'Unknown';
                const dept = a.user_detail?.department || '';
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <Avatar name={name} size={8} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{name}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{dept}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">{fmt12(a.punch_in)}</span>
                      <AttBadge punchIn={a.punch_in} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {attendance.length > 5 && (
            <button
              onClick={() => setDirTab('attendance')}
              className="mt-4 flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
              {attendance.length - 5}+ more attendance records logged today
              <ChevronRight size={12} />
            </button>
          )}
        </div>

        {/* ── Snapshot + Leave ── */}
        <div className="flex flex-col gap-4">
          {/* Attendance Snapshot */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                <UserCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="font-bold text-gray-800 dark:text-white text-sm">Today's Attendance</span>
            </div>
            {statsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={18} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <StatPill label="Checked-in" value={checkedInCount} color="text-emerald-600 dark:text-emerald-400" />
                  <StatPill label="Late"        value={lateCount}      color="text-amber-600 dark:text-amber-400" />
                  <StatPill label="Absent"      value={absentCount}    color="text-red-600 dark:text-red-400" />
                </div>
                {lateCount > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-xl px-3 py-2">
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium flex items-center gap-1.5">
                      <TrendingUp size={10} />
                      {lateCount} member{lateCount > 1 ? 's' : ''} arrived late today
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Leave Request */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm p-5 flex-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-violet-50 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
                <CalendarCheck size={16} className="text-violet-600 dark:text-violet-400" />
              </div>
              <span className="font-bold text-gray-800 dark:text-white text-sm">Leave Requests</span>
            </div>
            {statsLoading ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 size={18} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-4xl font-black text-gray-800 dark:text-white">{pendingLeaves}</span>
                  <span className="ml-2 text-[11px] bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 px-2 py-0.5 rounded-full font-bold">
                    Pending
                  </span>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium">
                    {leaves.length} total requests
                  </p>
                </div>
                <button
                  onClick={() => setDirTab('leaves')}
                  className="flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors">
                  View All <ChevronRight size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Employee Directory ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
        {/* Directory header */}
        <div className="px-5 pt-5 pb-0">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-gray-400 dark:text-gray-500" />
              <h2 className="font-bold text-gray-800 dark:text-white">Employee Directory</h2>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div className="flex gap-1">
              {[
                { key: 'staff',      label: 'Employee List',       count: filtered.length },
                { key: 'leaves',     label: 'Leave Requests',      count: leaves.length },
                { key: 'attendance', label: "Today's Attendance",  count: attendance.length },
              ].map(tab => (
                <button key={tab.key} onClick={() => setDirTab(tab.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    dirTab === tab.key
                      ? 'text-white shadow-md'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  style={dirTab === tab.key ? { background: 'linear-gradient(135deg,#1E3A5F,#2563eb)' } : {}}>
                  {tab.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    dirTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>{tab.count}</span>
                </button>
              ))}
            </div>
            {/* List / Teams toggle — only on Employee List tab */}
            {dirTab === 'staff' && (
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                <button onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                  <LayoutList size={13} /> List
                </button>
                <button onClick={() => setViewMode('teams')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === 'teams'
                      ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                  <LayoutGrid size={13} /> Teams
                </button>
              </div>
            )}
          </div>

          {/* Search + filter (only for Employee List) */}
          {dirTab === 'staff' && (
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name, email, phone, EMP ID…"
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-shadow"
                />
              </div>
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                className="border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                <option value="">All Departments</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* ── Tab: Employee List ── */}
        {dirTab === 'staff' && viewMode === 'list' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-y border-gray-100 dark:border-gray-700">
                <tr>
                  {['Name', 'Department', 'Location', 'Contact', 'Role', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-5 text-[11px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-14 text-gray-400 dark:text-gray-600">
                      <Users size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-medium">No staff found</p>
                    </td>
                  </tr>
                ) : filtered.map(u => {
                  const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
                  return (
                    <tr key={u.id}
                      className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">

                      {/* Name */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <Avatar name={name} size={9} />
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-white text-sm leading-tight">{name}</p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                              {u.employee_id ? u.employee_id : u.username}
                              {u.position ? ` · ${u.position}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-5"><DeptBadge dept={u.department} /></td>

                      {/* Location */}
                      <td className="py-3.5 px-5">
                        <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                          <MapPin size={11} className="text-gray-400 shrink-0" />
                          {u.site_location || '—'}
                        </span>
                      </td>

                      {/* Contact (phone + email) */}
                      <td className="py-3.5 px-5">
                        <div className="space-y-1">
                          <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                            <Phone size={11} className="text-gray-400 shrink-0" />
                            {u.phone || '—'}
                          </span>
                          {u.email && (
                            <span className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                              <Mail size={11} className="text-gray-300 dark:text-gray-600 shrink-0" />
                              {u.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                            : u.role === 'super_admin'
                            ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        }`}>
                          {u.role === 'super_admin' ? 'Super Admin' : u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-5">
                        <div className="relative" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                            <MoreVertical size={15} />
                          </button>
                          {openMenu === u.id && (
                            <div className="absolute right-0 top-8 z-30 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 w-44 text-sm">
                              <button onClick={() => openEdit(u)}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors">
                                <Edit2 size={13} className="text-blue-500" /> Edit Details
                              </button>
                              <button onClick={() => handleRoleToggle(u)}
                                className={`flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                  u.role === 'admin' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                                }`}>
                                {u.role === 'admin'
                                  ? <><ShieldOff size={13} /> Remove Admin</>
                                  : <><ShieldCheck size={13} /> Make Admin</>}
                              </button>
                              <div className="h-px bg-gray-100 dark:bg-gray-700 mx-3 my-1" />
                              <button onClick={() => handleDelete(u.id)}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 transition-colors">
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Tab: Teams view ── */}
        {dirTab === 'staff' && viewMode === 'teams' && (
          <div className="p-5 space-y-6">
            {teamGroups.length === 0 ? (
              <div className="text-center py-14 text-gray-400 dark:text-gray-600">
                <Users size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No staff found</p>
              </div>
            ) : teamGroups.map(team => (
              <div key={team.key}>
                {/* Team header */}
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-black text-gray-700 dark:text-gray-200">{team.label}</h3>
                  <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-black flex items-center justify-center">
                    {team.members.length}
                  </span>
                  <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                </div>
                {/* Member cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {team.members.map(u => {
                    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
                    return (
                      <div key={u.id}
                        className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3.5 flex flex-col gap-2.5 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <Avatar name={name} size={10} />
                          <div className="min-w-0">
                            <p className="font-bold text-gray-800 dark:text-white text-sm leading-tight truncate">{name}</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">
                              {u.employee_id || u.username}
                              {u.position ? ` · ${u.position}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {u.phone && (
                            <span className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                              <Phone size={10} className="text-gray-400 shrink-0" />{u.phone}
                            </span>
                          )}
                          {u.email && (
                            <span className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                              <Mail size={10} className="text-gray-300 dark:text-gray-600 shrink-0" />{u.email}
                            </span>
                          )}
                          {u.site_location && (
                            <span className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
                              <MapPin size={10} className="text-gray-300 dark:text-gray-600 shrink-0" />{u.site_location}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-1.5 border-t border-gray-50 dark:border-gray-700">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.role === 'admin'
                              ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400'
                              : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          }`}>
                            {u.role === 'super_admin' ? 'Super Admin' : u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                          </span>
                          <div className="relative" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setOpenMenu(openMenu === u.id ? null : u.id)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                              <MoreVertical size={13} />
                            </button>
                            {openMenu === u.id && (
                              <div className="absolute right-0 bottom-7 z-30 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 w-40 text-sm">
                                <button onClick={() => openEdit(u)}
                                  className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs transition-colors">
                                  <Edit2 size={11} className="text-blue-500" /> Edit
                                </button>
                                <button onClick={() => handleRoleToggle(u)}
                                  className={`flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs transition-colors ${u.role === 'admin' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                  {u.role === 'admin' ? <><ShieldOff size={11} /> Remove Admin</> : <><ShieldCheck size={11} /> Make Admin</>}
                                </button>
                                <div className="h-px bg-gray-100 dark:bg-gray-700 mx-2 my-1" />
                                <button onClick={() => handleDelete(u.id)}
                                  className="flex items-center gap-2 w-full px-3 py-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 text-xs transition-colors">
                                  <Trash2 size={11} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab: Leave Requests ── */}
        {dirTab === 'leaves' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-y border-gray-100 dark:border-gray-700">
                <tr>
                  {['Employee', 'Type', 'From', 'To', 'Reason', 'Status'].map(h => (
                    <th key={h} className="text-left py-3 px-5 text-[11px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-14 text-gray-400 dark:text-gray-600">
                      <CalendarCheck size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-medium">No leave requests</p>
                    </td>
                  </tr>
                ) : leaves.map(l => {
                  const name = l.user_detail?.full_name || l.user?.full_name || '—';
                  const statusCls = l.status === 'approved'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                    : l.status === 'rejected'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
                  return (
                    <tr key={l.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={name} size={8} />
                          <div>
                            <p className="font-semibold text-gray-800 dark:text-white text-sm">{name}</p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500">{l.user_detail?.department || l.user?.department || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-xs text-gray-600 dark:text-gray-300 font-medium capitalize">{l.leave_type || l.type || '—'}</td>
                      <td className="py-3.5 px-5 text-xs text-gray-600 dark:text-gray-300 font-medium">{l.start_date || l.from_date || '—'}</td>
                      <td className="py-3.5 px-5 text-xs text-gray-600 dark:text-gray-300 font-medium">{l.end_date || l.to_date || '—'}</td>
                      <td className="py-3.5 px-5 text-xs text-gray-500 dark:text-gray-400 max-w-[160px]">
                        <span className="line-clamp-1">{l.reason || '—'}</span>
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${statusCls}`}>{l.status}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Tab: Today's Attendance ── */}
        {dirTab === 'attendance' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/60 border-y border-gray-100 dark:border-gray-700">
                <tr>
                  {['Employee', 'Department', 'Check-in', 'Check-out', 'Location', 'Status'].map(h => (
                    <th key={h} className="text-left py-3 px-5 text-[11px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-14 text-gray-400 dark:text-gray-600">
                      <Clock size={32} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm font-medium">No attendance records today</p>
                    </td>
                  </tr>
                ) : [...attendance]
                    .sort((a, b) => (b.punch_in || '').localeCompare(a.punch_in || ''))
                    .map(a => {
                      const name = a.user_detail?.full_name || '—';
                      const statusCls = {
                        present:  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
                        absent:   'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
                        half_day: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
                        leave:    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
                      }[a.status] || 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300';
                      return (
                        <tr key={a.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={name} size={8} />
                              <div>
                                <p className="font-semibold text-gray-800 dark:text-white text-sm leading-tight">{name}</p>
                                <p className="text-[11px] text-gray-400 dark:text-gray-500">{a.user_detail?.employee_id || ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-5">
                            <DeptBadge dept={a.user_detail?.department} />
                          </td>
                          <td className="py-3.5 px-5 font-medium text-xs text-gray-700 dark:text-gray-300">
                            {fmt12(a.punch_in)}
                            {a.punch_in && (
                              <div className="mt-0.5"><AttBadge punchIn={a.punch_in} /></div>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-xs text-gray-500 dark:text-gray-400 font-medium">{fmt12(a.punch_out)}</td>
                          <td className="py-3.5 px-5 text-xs text-gray-500 dark:text-gray-400">{a.site_location || '—'}</td>
                          <td className="py-3.5 px-5">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${statusCls}`}>
                              {(a.status || '—').replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Mobile card fallback (for very small screens on Employee List) ── */}
      {dirTab === 'staff' && (
        <div className="sm:hidden space-y-3 -mt-3">
          {filtered.map(u => {
            const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
            return (
              <div key={`m-${u.id}`} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={name} size={10} />
                    <div>
                      <p className="font-bold text-gray-800 dark:text-white text-sm">{name}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">{u.employee_id} · {u.position || u.department}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(u)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit2 size={14} /></button>
                    <button onClick={() => handleRoleToggle(u)}
                      className={`p-1.5 rounded-lg ${u.role === 'admin' ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}>
                      {u.role === 'admin' ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                    </button>
                    <button onClick={() => handleDelete(u.id)} className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <DeptBadge dept={u.department} />
                  <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400"><MapPin size={10} />{u.site_location}</span>
                  {u.phone && <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400"><Phone size={10} />{u.phone}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Modal (unchanged) ── */}
      {showModal && (
        <Modal title={editing ? 'Edit Staff Member' : 'Add New Staff'} onClose={() => setShowModal(false)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[['first_name', 'First Name'], ['last_name', 'Last Name']].map(([k, l]) => (
                <div key={k}>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{l}</label>
                  <input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['username', 'Username *'], ['employee_id', 'Employee ID']].map(([k, l]) => (
                <div key={k}>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{l}</label>
                  <input value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Phone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Department</label>
                <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none">
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Location</label>
                <select value={form.site_location} onChange={e => setForm(f => ({ ...f, site_location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none">
                  {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Position / Designation</label>
              <input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                placeholder="e.g. BDM, Manager, Tele Caller"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Report Template</label>
              <select value={form.report_type} onChange={e => setForm(f => ({ ...f, report_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none">
                {REPORT_TYPES.map(rt => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={loading}
                className="px-4 py-2 text-sm text-white rounded-xl disabled:opacity-60 shadow-md transition-all"
                style={{ background: 'linear-gradient(135deg,#1E3A5F,#2563eb)' }}>
                {loading ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
