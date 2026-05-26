import { useEffect, useState } from 'react';
import {
  Building2, Users, MapPin, CheckCircle2, Clock, FileText,
  MessageSquare, CalendarCheck, TrendingUp, ArrowRight, ChevronRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { projectsApi, usersApi, leavesApi, feedbackApi, reportsApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import MotivationalQuote from '../../components/MotivationalQuote';
import { useAuth } from '../../contexts/AuthContext';

const PIE_COLORS = ['#ef4444', '#10b981', '#f59e0b', '#3b82f6'];

// ── Metric card ───────────────────────────────────────────────────────────────
function MetricCard({ title, value, icon: Icon, color, sub, onClick, badge }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`group relative flex flex-col gap-3 rounded-2xl p-4 sm:p-5 overflow-hidden
        bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800
        shadow-sm transition-all duration-200
        ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 text-left w-full' : ''}`}>

      {/* Coloured top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${color}`} />

      {/* Icon + badge row */}
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} bg-opacity-10`}
          style={{ background: 'var(--icon-bg)' }}>
          <span className={`${color.replace('bg-', 'text-')} text-opacity-100`}>
            <Icon size={18} />
          </span>
        </div>
        {badge !== undefined && badge > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>

      {/* Number */}
      <div>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-none">
          {value ?? '—'}
        </p>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium mt-1 leading-tight">
          {title}
        </p>
        {sub && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>
        )}
      </div>

      {/* Arrow */}
      {onClick && (
        <ChevronRight size={14}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600
            group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
      )}
    </Tag>
  );
}

// ── Icon background helper ────────────────────────────────────────────────────
const iconStyles = {
  blue:   { bar: 'bg-blue-500',    bg: 'bg-blue-50   dark:bg-blue-900/20',   text: 'text-blue-500' },
  violet: { bar: 'bg-violet-500',  bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-500' },
  amber:  { bar: 'bg-amber-500',   bg: 'bg-amber-50  dark:bg-amber-900/20',  text: 'text-amber-500' },
  emerald:{ bar: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20',text: 'text-emerald-500' },
  red:    { bar: 'bg-red-500',     bg: 'bg-red-50    dark:bg-red-900/20',    text: 'text-red-500' },
  orange: { bar: 'bg-orange-500',  bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-500' },
  sky:    { bar: 'bg-sky-500',     bg: 'bg-sky-50    dark:bg-sky-900/20',    text: 'text-sky-500' },
  teal:   { bar: 'bg-teal-500',    bg: 'bg-teal-50   dark:bg-teal-900/20',   text: 'text-teal-500' },
};

function IconBox({ color, icon: Icon }) {
  const s = iconStyles[color] || iconStyles.blue;
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>
      <Icon size={18} className={s.text} />
    </div>
  );
}

// ── Full metric card (flat design) ────────────────────────────────────────────
function FlatCard({ title, value, icon: Icon, color, sub, onClick, badge }) {
  const s = iconStyles[color] || iconStyles.blue;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick}
      className={`group relative flex items-center gap-4 rounded-2xl p-4 sm:p-5
        bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800
        shadow-sm transition-all duration-200 overflow-hidden
        ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 text-left w-full' : ''}`}>

      <div className={`absolute top-0 left-0 bottom-0 w-1 rounded-l-2xl ${s.bar}`} />

      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
        <Icon size={20} className={s.text} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-none">
          {value ?? '—'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5 truncate">{title}</p>
        {sub && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {badge !== undefined && badge > 0 && (
          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
        {onClick && (
          <ChevronRight size={16}
            className="text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
        )}
      </div>
    </Tag>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
function SectionHead({ title, sub }) {
  return (
    <div className="mb-3 sm:mb-4">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</h2>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats,          setStats]          = useState(null);
  const [staffCount,     setStaffCount]     = useState(null);
  const [pendingLeaves,  setPendingLeaves]  = useState(null);
  const [unreadFeedback, setUnreadFeedback] = useState(null);
  const [pendingReports, setPendingReports] = useState(null);
  const navigate = useNavigate();
  const { user }  = useAuth();

  useEffect(() => {
    projectsApi.dashboardStats().then(r => setStats(r.data)).catch(() => {});
    usersApi.staffList().then(r => setStaffCount(r.data.length)).catch(() => {});
    leavesApi.list({ status: 'pending' }).then(r => setPendingLeaves((r.data.results || r.data).length)).catch(() => {});
    feedbackApi.list().then(r => setUnreadFeedback((r.data.results || r.data).filter(f => f.status === 'unread').length)).catch(() => {});
    reportsApi.list({ status: 'submitted' }).then(r => setPendingReports((r.data.results || r.data).length)).catch(() => {});
  }, []);

  const barData = stats?.project_stats?.map(p => ({
    name: p.name.length > 12 ? p.name.slice(0, 11) + '…' : p.name,
    Sold: p.sold,
    Available: p.available,
  })) || [];

  const pieData = stats ? [
    { name: 'Sold',      value: stats.total_sold      || 0 },
    { name: 'Available', value: stats.total_available || 0 },
  ].filter(d => d.value > 0) : [];

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="space-y-6 sm:space-y-8 w-full">

      <MotivationalQuote name={user?.full_name} />

      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Welcome back, <span className="font-medium text-gray-700 dark:text-gray-300">{user?.full_name?.split(' ')[0] || 'Admin'}</span>
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 shadow-sm">
          <Clock size={13} className="text-gray-400" />
          <span className="text-xs text-gray-500 dark:text-gray-400">{today}</span>
        </div>
      </div>

      {/* ── Overview metrics ── */}
      <section>
        <SectionHead title="Overview" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { title: 'Total Staff',    value: staffCount,           icon: Users,       color: 'blue',    onClick: () => navigate('/admin/staff') },
            { title: 'Total Projects', value: stats?.total_projects, icon: Building2,   color: 'violet' },
            { title: 'Total Plots',    value: stats?.total_plots,    icon: MapPin,      color: 'amber',   sub: `${stats?.sold_percentage ?? 0}% sold` },
            { title: 'Plots Sold',     value: stats?.total_sold,     icon: CheckCircle2,color: 'emerald' },
          ].map(c => {
            const s = iconStyles[c.color] || iconStyles.blue;
            return (
              <div key={c.title}
                onClick={c.onClick}
                className={`group relative flex flex-col gap-2.5 rounded-2xl p-4 sm:p-5
                  bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800
                  shadow-sm transition-all duration-200 overflow-hidden
                  ${c.onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0' : ''}`}>
                <div className={`absolute top-0 left-0 right-0 h-0.5 ${s.bar}`} />
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg}`}>
                  <c.icon size={17} className={s.text} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
                    {c.value ?? <span className="text-gray-300 dark:text-gray-600 text-xl">—</span>}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">{c.title}</p>
                  {c.sub && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{c.sub}</p>}
                </div>
                {c.onClick && (
                  <ChevronRight size={14} className="absolute right-3.5 bottom-3.5 text-gray-300 dark:text-gray-600
                    group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Action items ── */}
      <section>
        <SectionHead title="Action Required" sub="Items needing your attention" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { title: 'Pending Leaves',  value: pendingLeaves,    icon: CalendarCheck, color: 'red',    onClick: () => navigate('/admin/leaves'),   badge: pendingLeaves,   sub: 'Awaiting review' },
            { title: 'Unread Feedback', value: unreadFeedback,   icon: MessageSquare, color: 'orange', onClick: () => navigate('/admin/feedback'), badge: unreadFeedback,  sub: 'From staff' },
            { title: 'Pending Reports', value: pendingReports,   icon: FileText,      color: 'sky',    onClick: () => navigate('/admin/reports'),  badge: pendingReports,  sub: 'To be reviewed' },
            { title: 'Plots Available', value: stats?.total_available, icon: TrendingUp, color: 'teal', sub: 'Ready to book' },
          ].map(c => (
            <FlatCard key={c.title} {...c} />
          ))}
        </div>
      </section>

      {/* ── Charts ── */}
      <section>
        <SectionHead title="Analytics" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">

          {/* Donut */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
            <p className="text-sm font-semibold text-gray-800 dark:text-white mb-0.5">Plot Status</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Sold vs Available</p>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72}
                    paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-gray-300 dark:text-gray-600 text-sm">
                No data yet
              </div>
            )}
          </div>

          {/* Bar */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 lg:col-span-2">
            <p className="text-sm font-semibold text-gray-800 dark:text-white mb-0.5">Plots by Project</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">Sold vs Available breakdown</p>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData} barSize={14} barGap={3} margin={{ left: -15 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', fontSize: 12 }}
                    cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Sold"      fill="#ef4444" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="Available" fill="#10b981" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-gray-300 dark:text-gray-600 text-sm">
                No project data
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Project table ── */}
      {stats?.project_stats?.length > 0 && (
        <section>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">Project Summary</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{stats.project_stats.length} active projects</p>
              </div>
              <button onClick={() => navigate('/admin/projects')}
                className="flex items-center gap-1 text-xs text-[#1a3a6b] dark:text-blue-400 font-semibold
                  hover:underline underline-offset-2 transition-all">
                View all <ArrowRight size={12} />
              </button>
            </div>

            {/* Scrollable on mobile */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead className="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    {['Project', 'Total', 'Sold', 'Available', 'Progress'].map(h => (
                      <th key={h}
                        className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {stats.project_stats.map(p => (
                    <tr key={p.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-800 dark:text-white">{p.name}</td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">{p.total}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400
                          text-xs font-semibold px-2 py-0.5 rounded-lg">{p.sold}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400
                          text-xs font-semibold px-2 py-0.5 rounded-lg">{p.available}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 min-w-[60px]">
                            <div className="h-1.5 rounded-full bg-gradient-to-r from-[#f26522] to-[#1a3a6b]"
                              style={{ width: `${p.sold_percentage}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-8 text-right tabular-nums">
                            {p.sold_percentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
