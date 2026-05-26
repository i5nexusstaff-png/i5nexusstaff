import { useEffect, useState } from 'react';
import { Trophy, Users, ChevronUp, ChevronDown, TrendingUp, Target, Award, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { teamAchievementsApi } from '../../services/api';

const medalEmoji = ['🥇','🥈','🥉'];
const TEAM_COLORS = ['#f59e0b','#94a3b8','#d97706','#3b82f6','#8b5cf6','#10b981'];

// ── Analytics strip shown above rankings ──────────────────────────────────────
function AnalyticsStrip({ data }) {
  const salesTeams   = data?.sales_teams    || [];
  const presaleTeams = data?.presales_teams || [];

  const totalSqft    = salesTeams.reduce((s, t) => s + (t.total_sqft   || 0), 0);
  const totalUnits   = salesTeams.reduce((s, t) => s + (t.total_units  || 0), 0);
  const topTeam      = salesTeams[0] || null;
  const allMembers   = salesTeams.flatMap(t => t.members || []);
  const topPerformer = [...allMembers].sort((a, b) => (b.square_feet_sold || 0) - (a.square_feet_sold || 0))[0] || null;

  const barData = salesTeams.map((t, i) => ({
    name:  t.team_name.length > 12 ? t.team_name.slice(0, 11) + '…' : t.team_name,
    fullName: t.team_name,
    sqft:  t.total_sqft || 0,
    color: TEAM_COLORS[i % TEAM_COLORS.length],
  }));

  if (salesTeams.length === 0) return null;

  return (
    <div className="space-y-4 mb-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Sq.Ft',   value: totalSqft.toLocaleString(), icon: TrendingUp, gradient: 'from-emerald-500 to-teal-500' },
          { label: 'Total Units',   value: totalUnits,                  icon: Target,     gradient: 'from-blue-500 to-indigo-500'  },
          { label: 'Sales Teams',   value: salesTeams.length,           icon: Award,      gradient: 'from-amber-500 to-orange-500' },
          { label: 'Team Members',  value: allMembers.length,           icon: Users,      gradient: 'from-violet-500 to-purple-500'},
        ].map(card => (
          <div key={card.label} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-sm shrink-0`}>
              <card.icon size={15} className="text-white" />
            </div>
            <div>
              <p className="text-xl font-black text-gray-800 dark:text-white leading-none">{card.value}</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart + highlights row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-gray-800 dark:text-white text-sm mb-3">Team Ranking — Sq.Ft Sold</h3>
          <ResponsiveContainer width="100%" height={Math.max(140, barData.length * 42)}>
            <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 36, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                tickFormatter={v => v >= 1000 ? (v/1000).toFixed(0)+'k' : v} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }}
                width={88} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }}
                formatter={(v, n, p) => [v.toLocaleString() + ' sq.ft', p.payload.fullName]}
                labelFormatter={() => ''}
              />
              <Bar dataKey="sqft" radius={[0, 8, 8, 0]} maxBarSize={28}>
                {barData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top team + top performer */}
        <div className="flex flex-col gap-3">
          {topTeam && (
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-100 dark:border-amber-800/40 rounded-2xl p-4 shadow-sm flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">🥇</span>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Top Team</span>
              </div>
              <p className="font-black text-gray-800 dark:text-white text-sm mb-2 leading-tight">{topTeam.team_name}</p>
              <div className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5">
                <p><span className="font-bold">{(topTeam.total_sqft || 0).toLocaleString()}</span> sq.ft sold</p>
                <p><span className="font-bold">{topTeam.total_units || 0}</span> units · <span className="font-bold">{topTeam.member_count}</span> members</p>
              </div>
            </div>
          )}
          {topPerformer && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
                  <Star size={12} className="text-white" />
                </div>
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Top Performer</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0">
                  {(topPerformer.employee_name || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-800 dark:text-white text-sm leading-tight">{topPerformer.employee_name}</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">{(topPerformer.square_feet_sold || 0).toLocaleString()} sq.ft</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StaffAchievements() {
  const [periods, setPeriods]   = useState([]);
  const [sel, setSel]           = useState(null);
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    teamAchievementsApi.availablePeriods().then(r => {
      const ps = r.data || [];
      setPeriods(ps);
      if (ps.length > 0) setSel(ps[0]);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!sel) return;
    setLoading(true);
    teamAchievementsApi.buckets({ month: sel.month, year: sel.year })
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [sel]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Leaderboard</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Team performance &amp; rankings</p>
      </div>

      {/* Period pills */}
      {periods.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-5">
          {periods.map(p => (
            <button key={`${p.month}-${p.year}`} onClick={() => setSel(p)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors
                ${sel?.month === p.month && sel?.year === p.year
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {periods.length === 0 && !loading && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 p-14 text-center">
          <Trophy size={44} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-400 dark:text-gray-500">No achievement data available yet</p>
        </div>
      )}

      {loading && <p className="text-sm text-gray-400 animate-pulse">Loading…</p>}

      {!loading && data && (
        <>
          {/* ── Analytics strip (above rankings) ── */}
          <AnalyticsStrip data={data} />

          <div className="space-y-7">
            {/* ── Sales Rankings ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🏆</span>
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">Sales Teams Ranking</h2>
                <span className="ml-2 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                  Ranked by Sq.Ft Sold
                </span>
              </div>

              {data.sales_teams.length === 0 ? (
                <p className="text-gray-400 dark:text-gray-500 text-sm italic">No sales data for this period.</p>
              ) : (
                <div className="space-y-4">
                  {data.sales_teams.map(team => (
                    <SalesBucket key={team.team_name} team={team} />
                  ))}
                </div>
              )}
            </section>

            {/* ── Pre-Sales Data ── */}
            {data.presales_teams.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">📋</span>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white">Pre-Sales Teams</h2>
                  <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full font-medium">
                    Activity Data
                  </span>
                </div>
                <div className="space-y-4">
                  {data.presales_teams.map(team => (
                    <PresalesBucket key={team.team_name} team={team} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}


function SalesBucket({ team }) {
  const [open, setOpen] = useState(true);
  const rank = team.rank;

  const rankBadgeCls = rank === 1
    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-600'
    : rank === 2
    ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-500'
    : rank === 3
    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-600'
    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700';

  const headerBg = rank === 1 ? 'bg-yellow-50 dark:bg-yellow-900/10'
    : rank === 2 ? 'bg-gray-50 dark:bg-gray-800'
    : rank === 3 ? 'bg-amber-50 dark:bg-amber-900/10'
    : 'bg-white dark:bg-gray-900';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className={`flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 ${headerBg}`}>
        {rank && (
          <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl border-2 font-black text-sm shrink-0 ${rankBadgeCls}`}>
            {rank <= 3 ? medalEmoji[rank - 1] : `#${rank}`}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 dark:text-white">{team.team_name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
            <Users size={11}/>{team.member_count} members
            <span>·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {team.total_sqft.toLocaleString()} sq.ft
            </span>
            <span>·</span>
            <span>{team.total_units} units</span>
          </p>
        </div>
        <button onClick={() => setOpen(o => !o)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          {open ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
        </button>
      </div>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {['Name','Designation','Visits','Appts','Meetings','Bookings','Reg','Sq.Ft','Units'].map(h => (
                  <th key={h} className="text-left py-2 px-4 text-gray-400 dark:text-gray-500 font-medium text-xs whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {team.members.map((m, i) => (
                <tr key={i} className="border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="py-2 px-4 font-medium text-gray-800 dark:text-white whitespace-nowrap">{m.employee_name}</td>
                  <td className="py-2 px-4 text-gray-500 dark:text-gray-400 text-xs">{m.designation || '—'}</td>
                  <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{m.site_visits}</td>
                  <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{m.appointments}</td>
                  <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{m.meetings}</td>
                  <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{m.bookings}</td>
                  <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{m.registrations}</td>
                  <td className="py-2 px-4 font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {m.square_feet_sold > 0 ? m.square_feet_sold.toLocaleString() : '—'}
                  </td>
                  <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{m.units_sold || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60">
                <td className="py-2 px-4 font-bold text-gray-700 dark:text-gray-200 text-xs" colSpan={2}>TEAM TOTAL</td>
                <td className="py-2 px-4 font-bold text-gray-700 dark:text-gray-200">{team.members.reduce((s,m)=>s+m.site_visits,0)}</td>
                <td className="py-2 px-4 font-bold text-gray-700 dark:text-gray-200">{team.members.reduce((s,m)=>s+m.appointments,0)}</td>
                <td className="py-2 px-4 font-bold text-gray-700 dark:text-gray-200">{team.members.reduce((s,m)=>s+m.meetings,0)}</td>
                <td className="py-2 px-4 font-bold text-gray-700 dark:text-gray-200">{team.members.reduce((s,m)=>s+m.bookings,0)}</td>
                <td className="py-2 px-4 font-bold text-gray-700 dark:text-gray-200">{team.members.reduce((s,m)=>s+m.registrations,0)}</td>
                <td className="py-2 px-4 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{team.total_sqft.toLocaleString()}</td>
                <td className="py-2 px-4 font-bold text-gray-700 dark:text-gray-200">{team.total_units}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}


function PresalesBucket({ team }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/10">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-300 dark:border-purple-600 shrink-0">
          <Users size={16} className="text-purple-600 dark:text-purple-400" />
        </span>
        <div className="flex-1">
          <p className="font-bold text-gray-800 dark:text-white">{team.team_name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
            <Users size={11}/>{team.members.length} members
            <span>·</span>
            <span>{team.total_site_visits} visits</span>
            <span>·</span>
            <span>{team.total_appointments} appts</span>
            <span>·</span>
            <span>{team.total_meetings} meetings</span>
          </p>
        </div>
        <button onClick={() => setOpen(o => !o)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          {open ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
        </button>
      </div>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[380px]">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {['Name','Designation','Site Visits','Appointments','Meetings'].map(h => (
                  <th key={h} className="text-left py-2 px-4 text-gray-400 dark:text-gray-500 font-medium text-xs whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {team.members.map((m, i) => (
                <tr key={i} className="border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="py-2 px-4 font-medium text-gray-800 dark:text-white whitespace-nowrap">{m.employee_name}</td>
                  <td className="py-2 px-4 text-gray-500 dark:text-gray-400 text-xs">{m.designation || '—'}</td>
                  <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{m.site_visits}</td>
                  <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{m.appointments}</td>
                  <td className="py-2 px-4 text-gray-700 dark:text-gray-300">{m.meetings}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60">
                <td className="py-2 px-4 font-bold text-gray-700 dark:text-gray-200 text-xs" colSpan={2}>TEAM TOTAL</td>
                <td className="py-2 px-4 font-bold text-gray-700 dark:text-gray-200">{team.total_site_visits}</td>
                <td className="py-2 px-4 font-bold text-gray-700 dark:text-gray-200">{team.total_appointments}</td>
                <td className="py-2 px-4 font-bold text-gray-700 dark:text-gray-200">{team.total_meetings}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
