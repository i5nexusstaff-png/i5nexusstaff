import { useEffect, useState } from 'react';
import {
  CheckSquare, Clock, MessageSquare, Award, MapPin, User,
  ChevronRight, CalendarCheck, ArrowUpRight, Send,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceApi, todosApi, achievementsApi, leavesApi } from '../../services/api';
import MotivationalQuote from '../../components/MotivationalQuote';
import BannerSlider from '../../components/BannerSlider';
import { useNavigate } from 'react-router-dom';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmtTime = dt =>
  dt ? new Date(dt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null;

// ── Quick-action card ─────────────────────────────────────────────────────────
function QuickAction({ label, icon: Icon, accent, path, navigate }) {
  return (
    <button
      onClick={() => navigate(path)}
      className="flex flex-col items-center justify-center gap-2 py-4 sm:py-5 rounded-2xl
        bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm
        hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 w-full group">
      <span className={`flex items-center justify-center w-10 h-10 rounded-xl ${accent} transition-transform group-hover:scale-110`}>
        <Icon size={19} className="text-white" />
      </span>
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 text-center leading-tight px-1">
        {label}
      </span>
    </button>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent, path, navigate }) {
  const Tag = path ? 'button' : 'div';
  return (
    <Tag
      onClick={path ? () => navigate(path) : undefined}
      className={`group relative flex flex-col gap-2 rounded-2xl p-4 sm:p-5
        bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm
        transition-all duration-200 overflow-hidden
        ${path ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 w-full text-left' : ''}`}>

      {/* Accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />

      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent} bg-opacity-10`}>
        <Icon size={17} className="text-white" />
      </div>

      <div>
        <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-none">
          {value ?? '—'}
        </p>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">{label}</p>
        {sub && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 hidden sm:block">{sub}</p>}
      </div>

      {path && (
        <ChevronRight size={14}
          className="absolute right-3.5 bottom-3.5 text-gray-300 dark:text-gray-600
            group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
      )}
    </Tag>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function StaffDashboard() {
  const { user }    = useAuth();
  const navigate    = useNavigate();

  const [todayStatus,   setTodayStatus]   = useState(null);
  const [todosCount,    setTodosCount]    = useState(null);
  const [rank,          setRank]          = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState(null);

  useEffect(() => {
    attendanceApi.todayStatus().then(r => setTodayStatus(r.data)).catch(() => {});
    todosApi.list({}).then(r => setTodosCount((r.data.results || r.data).length)).catch(() => {});
    achievementsApi.list({ period_type: 'monthly' }).then(r => {
      const items = r.data.results || r.data;
      const mine  = items.find(a => a.user === user?.id || a.user_detail?.id === user?.id);
      if (mine) setRank(mine.rank);
    }).catch(() => {});
    leavesApi.list({ status: 'pending' }).then(r =>
      setPendingLeaves((r.data.results || r.data).length)
    ).catch(() => {});
  }, []);

  const punchIn  = fmtTime(todayStatus?.punch_in);
  const punchOut = fmtTime(todayStatus?.punch_out);

  const attendanceState = punchOut ? 'done' : punchIn ? 'active' : 'absent';

  const attendanceCard = {
    done:   { grad: 'from-gray-600 to-gray-800',          label: 'Work day complete', icon: '✓' },
    active: { grad: 'from-emerald-500 to-teal-600',       label: 'Currently working', icon: '●' },
    absent: { grad: 'from-[#1a3a6b] to-[#1e4d8c]',       label: 'Not punched in yet', icon: '○' },
  }[attendanceState];

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <div className="space-y-5 sm:space-y-6 w-full">

      {/* ── Banner slider ── */}
      <div className="-mx-4 sm:-mx-6 -mt-4 sm:-mt-6 mb-1">
        <BannerSlider />
      </div>

      <MotivationalQuote name={user?.full_name} />

      {/* ── Greeting ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.full_name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex flex-wrap items-center gap-x-1.5">
            {user?.position && <span>{user.position}</span>}
            {user?.position && user?.site_location && <span className="text-gray-300">·</span>}
            {user?.site_location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={11} />{user.site_location}
              </span>
            )}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-3.5 py-2 shadow-sm text-xs text-gray-500 dark:text-gray-400">
          <Clock size={12} className="text-gray-400" />{today}
        </div>
      </div>

      {/* ── Attendance hero card ── */}
      <div className={`relative rounded-2xl p-4 sm:p-6 text-white overflow-hidden bg-gradient-to-br ${attendanceCard.grad} shadow-lg`}>
        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute right-6 -bottom-6 w-24 h-24 bg-white/8 rounded-full pointer-events-none" />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-white/60 uppercase tracking-widest mb-1.5">
              Today's Attendance
            </p>
            <p className="text-lg sm:text-xl font-bold">{attendanceCard.label}</p>

            {punchIn && (
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1 text-xs font-medium">
                  <span className="text-white/60">In</span>
                  <span className="font-bold">{punchIn}</span>
                </div>
                {punchOut && (
                  <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1 text-xs font-medium">
                    <span className="text-white/60">Out</span>
                    <span className="font-bold">{punchOut}</span>
                  </div>
                )}
                {todayStatus?.hours_worked && (
                  <div className="flex items-center gap-1.5 bg-white/15 rounded-lg px-2.5 py-1 text-xs font-medium">
                    <span className="font-bold">{todayStatus.hours_worked}h worked</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {attendanceState !== 'done' && (
            <button
              onClick={() => navigate('/staff/attendance')}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm
                text-white font-semibold px-4 py-2.5 rounded-xl transition-all text-sm shrink-0
                border border-white/20 hover:border-white/40 shadow-sm">
              {attendanceState === 'absent' ? 'Punch In' : 'Punch Out'}
              <ArrowUpRight size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { icon: CheckSquare,   label: 'My Tasks',       value: todosCount,                sub: 'Open items',        accent: 'bg-blue-500',    path: '/staff/todos' },
          { icon: Award,         label: 'Monthly Rank',   value: rank ? `#${rank}` : null,  sub: 'In leaderboard',    accent: 'bg-amber-500',   path: '/staff/achievements' },
          { icon: CalendarCheck, label: 'Pending Leaves', value: pendingLeaves,             sub: 'Awaiting approval', accent: 'bg-violet-500',  path: '/staff/leaves' },
          { icon: MapPin,        label: 'Site Location',  value: user?.site_location || '—',sub: user?.department,    accent: 'bg-teal-500' },
        ].map(c => (
          <StatCard key={c.label} {...c} navigate={navigate} />
        ))}
      </div>

      {/* ── Quick actions ── */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Mark Attendance', icon: Clock,         accent: 'bg-emerald-500', path: '/staff/attendance' },
            { label: 'Submit Report',   icon: Send,          accent: 'bg-blue-500',    path: '/staff/reports' },
            { label: 'Apply for Leave', icon: CalendarCheck, accent: 'bg-violet-500',  path: '/staff/leaves' },
            { label: 'View Projects',   icon: MapPin,        accent: 'bg-amber-500',   path: '/staff/projects' },
          ].map(c => (
            <QuickAction key={c.label} {...c} navigate={navigate} />
          ))}
        </div>
      </section>

      {/* ── Profile card ── */}
      <section>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="w-8 h-8 rounded-xl bg-[#1a3a6b] flex items-center justify-center">
              <User size={15} className="text-white" />
            </div>
            <p className="font-semibold text-gray-800 dark:text-white text-sm">Your Profile</p>
          </div>
          <div className="p-4 sm:p-5 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
            {[
              ['Full Name',    user?.full_name],
              ['Employee ID',  user?.employee_id],
              ['Position',     user?.position],
              ['Department',   user?.department],
              ['Site Location',user?.site_location],
              ['Phone',        user?.phone],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                  {k}
                </p>
                <p className="text-sm font-medium text-gray-800 dark:text-white">{v || '—'}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
