import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Trophy, Upload, History, Download,
  CheckCircle, XCircle, AlertCircle, Users,
  ChevronUp, ChevronDown, Plus, Trash2, Pencil, X, Save, RefreshCw,
  LayoutDashboard, TrendingUp, Award, Target, Star, ChevronRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { teamAchievementsApi, teamMembersApi } from '../../services/api';

// ── constants ─────────────────────────────────────────────────────────────────
const MONTHS = [
  '', 'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const nowMonth = new Date().getMonth() + 1;
const nowYear  = new Date().getFullYear();
const medalEmoji = ['🥇','🥈','🥉'];

const TEAM_COLORS = ['#f59e0b','#94a3b8','#d97706','#3b82f6','#8b5cf6','#10b981','#ec4899','#06b6d4'];

const TABS = [
  { id: 'overview',  label: 'Overview',      icon: LayoutDashboard },
  { id: 'rankings',  label: 'Team Rankings', icon: Trophy          },
  { id: 'upload',    label: 'Upload Data',   icon: Upload          },
  { id: 'members',   label: 'Members',       icon: Users           },
  { id: 'history',   label: 'History',       icon: History         },
];

// ════════════════════════════════════════════════════════════════════════════
export default function AdminAchievements() {
  const [tab, setTab] = useState('overview');

  // ── Shared data state (lifted from RankingsTab) ───────────────────────────
  const [periods,  setPeriods]  = useState([]);
  const [sel,      setSel]      = useState(null);
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);

  const loadData = useCallback((period) => {
    if (!period) return;
    setLoading(true);
    teamAchievementsApi.buckets({ month: period.month, year: period.year })
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    teamAchievementsApi.recalculateAll().catch(() => {});
    teamAchievementsApi.availablePeriods().then(r => {
      const ps = r.data || [];
      setPeriods(ps);
      if (ps.length > 0) { setSel(ps[0]); loadData(ps[0]); }
    }).catch(() => {});
  }, [loadData]);

  const handleSelect = (p) => { setSel(p); loadData(p); };

  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' | 'weekly'

  return (
    <div>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Achievements</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Team-based performance tracking &amp; rankings</p>
        </div>
        {/* Monthly / Weekly toggle */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {[['monthly','📅 Monthly'],['weekly','📆 Weekly']].map(([v,l]) => (
            <button key={v} onClick={() => setViewMode(v)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                viewMode===v ? 'bg-white dark:bg-gray-700 text-primary shadow-sm' : 'text-gray-500 dark:text-gray-400'
              }`}>{l}</button>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${tab === t.id
                  ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              <Icon size={15}/>{t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview'  && <OverviewTab  viewMode={viewMode} periods={periods} sel={sel} onSelect={handleSelect} data={data} loading={loading} />}
      {tab === 'rankings'  && <RankingsTab  viewMode={viewMode} periods={periods} sel={sel} onSelect={handleSelect} data={data} loading={loading} loadData={loadData} />}
      {tab === 'upload'    && <UploadTab viewMode={viewMode} />}
      {tab === 'members'   && <MembersTab />}
      {tab === 'history'   && <HistoryTab />}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// TAB: Overview — Analytics dashboard
// ════════════════════════════════════════════════════════════════════════════
function OverviewTab({ viewMode, periods, sel, onSelect, data, loading }) {
  // ── Computed analytics ──────────────────────────────────────────────────
  const salesTeams   = data?.sales_teams    || [];
  const presaleTeams = data?.presales_teams || [];

  const totalSqft     = salesTeams.reduce((s, t) => s + (t.total_sqft    || 0), 0);
  const totalUnits    = salesTeams.reduce((s, t) => s + (t.total_units   || 0), 0);
  const totalBookings = salesTeams.reduce((s, t) => s + (t.total_bookings|| 0), 0);
  const totalMembers  = salesTeams.reduce((s, t) => s + (t.member_count  || 0), 0)
                      + presaleTeams.reduce((s, t) => s + (t.members?.length || 0), 0);

  const totalVisits   = presaleTeams.reduce((s, t) => s + (t.total_site_visits   || 0), 0);
  const totalMeetings = presaleTeams.reduce((s, t) => s + (t.total_meetings      || 0), 0);

  const topTeam = salesTeams[0] || null; // rank 1

  const allSalesMembers = salesTeams.flatMap(t => (t.members || []).map(m => ({ ...m, _team: t.team_name })));
  const topPerformer    = [...allSalesMembers].sort((a, b) => (b.square_feet_sold || 0) - (a.square_feet_sold || 0))[0] || null;

  // Bar chart data
  const barData = salesTeams.map((t, i) => ({
    name:  t.team_name.length > 14 ? t.team_name.slice(0, 13) + '…' : t.team_name,
    fullName: t.team_name,
    sqft:  t.total_sqft   || 0,
    units: t.total_units  || 0,
    rank:  t.rank,
    color: TEAM_COLORS[i % TEAM_COLORS.length],
  }));


  // No data state
  const noData = !loading && salesTeams.length === 0 && presaleTeams.length === 0;


  return (
    <div className="space-y-5">

      {/* ── Period selector ── */}
      {periods.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 mr-1">
            {viewMode === 'weekly' ? 'Pick week' : 'Pick month'}:
          </span>
          {periods.map(p => (
            <button key={`${p.month}-${p.year}`} onClick={() => onSelect(p)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-colors
                ${sel?.month === p.month && sel?.year === p.year
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400 dark:text-gray-500">Loading analytics…</p>
          </div>
        </div>
      )}

      {noData && !loading && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 p-16 text-center">
          <Trophy size={48} className="mx-auto text-gray-200 dark:text-gray-700 mb-4" />
          <p className="text-gray-500 dark:text-gray-400 font-semibold">No data yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Upload your first Excel file to see analytics.</p>
        </div>
      )}

      {!loading && data && salesTeams.length > 0 && (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Sq.Ft Sold',  value: totalSqft.toLocaleString(),  sub: 'sq.ft across all teams',  icon: TrendingUp, gradient: 'from-emerald-500 to-teal-500' },
              { label: 'Units Sold',         value: totalUnits,                   sub: 'across all sales teams',  icon: Target,     gradient: 'from-blue-500 to-indigo-500' },
              { label: 'Total Bookings',     value: totalBookings,                sub: 'confirmed this period',   icon: Award,      gradient: 'from-amber-500 to-orange-500' },
              { label: 'Active Members',     value: totalMembers,                 sub: `${salesTeams.length} sales · ${presaleTeams.length} pre-sales teams`, icon: Users, gradient: 'from-violet-500 to-purple-500' },
            ].map(card => (
              <div key={card.label} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-sm`}>
                    <card.icon size={16} className="text-white" />
                  </div>
                </div>
                <p className="text-2xl font-black text-gray-800 dark:text-white leading-none mb-1">{card.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-tight">{card.label}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Charts row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Team Performance Bar Chart */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white text-sm">Sales Team Performance</h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Sq.Ft Sold · Ranked by volume</p>
                </div>
                <span className="text-[11px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full font-bold">
                  {sel?.label}
                </span>
              </div>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(180, barData.length * 48)}>
                  <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 40, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                      tickFormatter={v => v >= 1000 ? (v/1000).toFixed(0)+'k' : v} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }}
                      width={90} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: 12 }}
                      formatter={(v, n, p) => [v.toLocaleString() + ' sq.ft', p.payload.fullName]}
                      labelFormatter={() => ''}
                    />
                    <Bar dataKey="sqft" radius={[0, 8, 8, 0]} maxBarSize={32}>
                      {barData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-36 text-gray-300 dark:text-gray-700 text-sm">No sales data</div>
              )}
            </div>

            {/* Right column: Top Performer + Pre-Sales Summary */}
            <div className="flex flex-col gap-4">

              {/* Top Performer */}
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-sm">
                    <Star size={14} className="text-white" />
                  </div>
                  <h3 className="font-bold text-gray-800 dark:text-white text-sm">Top Performer</h3>
                </div>
                {topPerformer ? (
                  <>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md">
                        {(topPerformer.employee_name || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800 dark:text-white text-sm leading-tight">{topPerformer.employee_name}</p>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500">{topPerformer.designation || topPerformer._team}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-2.5 text-center">
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{(topPerformer.square_feet_sold || 0).toLocaleString()}</p>
                        <p className="text-[10px] text-emerald-500 dark:text-emerald-500 font-medium">sq.ft</p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2.5 text-center">
                        <p className="text-sm font-black text-blue-600 dark:text-blue-400">{topPerformer.units_sold || 0}</p>
                        <p className="text-[10px] text-blue-500 dark:text-blue-500 font-medium">units</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500 italic">No data available</p>
                )}
              </div>

              {/* Top Team */}
              {topTeam && (
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border border-amber-100 dark:border-amber-800/40 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🥇</span>
                    <h3 className="font-bold text-amber-800 dark:text-amber-300 text-sm">Top Team</h3>
                  </div>
                  <p className="font-black text-gray-800 dark:text-white text-base leading-tight mb-2">{topTeam.team_name}</p>
                  <div className="flex items-center gap-3 text-xs text-amber-700 dark:text-amber-400">
                    <span className="font-bold">{(topTeam.total_sqft || 0).toLocaleString()} sq.ft</span>
                    <span>·</span>
                    <span>{topTeam.total_units || 0} units</span>
                    <span>·</span>
                    <span>{topTeam.member_count} members</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Detailed team stat bars ── */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
            <h3 className="font-bold text-gray-800 dark:text-white text-sm mb-4">Team Breakdown — Sales</h3>
            <div className="space-y-3">
              {salesTeams.map((team, i) => {
                const pct = totalSqft > 0 ? Math.round((team.total_sqft / totalSqft) * 100) : 0;
                const color = TEAM_COLORS[i % TEAM_COLORS.length];
                return (
                  <div key={team.team_name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-bold" style={{ minWidth: 28 }}>{medalEmoji[i] || `#${i+1}`}</span>
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{team.team_name}</span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">· {team.member_count} members</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{(team.total_sqft || 0).toLocaleString()} sq.ft</span>
                        <span className="text-[11px] text-gray-400 w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                      <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Pre-Sales Summary ── */}
          {presaleTeams.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">📋</span>
                <h3 className="font-bold text-gray-800 dark:text-white text-sm">Pre-Sales Activity</h3>
                <span className="ml-auto text-[11px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2.5 py-1 rounded-full font-bold">
                  {presaleTeams.length} team{presaleTeams.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[
                  { label: 'Site Visits',   value: totalVisits,   color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
                  { label: 'Meetings',      value: totalMeetings, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
                ].map(stat => (
                  <div key={stat.label} className={`${stat.bg} rounded-xl p-3 text-center`}>
                    <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {presaleTeams.map((team, i) => (
                  <div key={team.team_name} className="flex items-center gap-3 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                      <Users size={12} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex-1 truncate">{team.team_name}</span>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 shrink-0">
                      <span>{team.total_site_visits} visits</span>
                      <span className="text-gray-300 dark:text-gray-600">·</span>
                      <span>{team.total_meetings} meetings</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// TAB: Rankings  — with inline edit / delete / add row
// ════════════════════════════════════════════════════════════════════════════
function RankingsTab({ viewMode, periods, sel, onSelect, data, loading, loadData }) {
  const [recalcing,  setRecalcing]  = useState(false);
  const [recalcMsg,  setRecalcMsg]  = useState('');

  const handleSelect = (p) => onSelect(p);

  const handleRecalc = async () => {
    setRecalcing(true); setRecalcMsg('');
    try {
      const r = await teamAchievementsApi.recalculateAll();
      setRecalcMsg(`✓ Recalculated ${r.data.periods_recalculated} period(s)`);
      if (sel) loadData(sel);
    } catch {
      setRecalcMsg('Failed to recalculate');
    } finally {
      setRecalcing(false);
      setTimeout(() => setRecalcMsg(''), 4000);
    }
  };

  if (periods.length === 0 && !loading) return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 p-14 text-center">
      <Trophy size={44} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
      <p className="text-gray-500 dark:text-gray-400 font-medium">No data yet</p>
      <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Upload your first Excel file to see rankings.</p>
    </div>
  );

  return (
    <div className="space-y-7">
      {/* Period pills + recalculate button */}
      {periods.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap justify-between">
          <div className="flex gap-2 flex-wrap">
          {periods.map(p => (
            <button key={`${p.month}-${p.year}`} onClick={() => handleSelect(p)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors
                ${sel?.month === p.month && sel?.year === p.year
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
              {p.label}
            </button>
          ))}
          </div>
          <div className="flex items-center gap-2">
            {recalcMsg && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{recalcMsg}</span>
            )}
            <button onClick={handleRecalc} disabled={recalcing}
              title="Re-rank all periods (fixes rank gaps caused by dirty data)"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 dark:border-gray-600
                bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg hover:border-primary hover:text-primary
                disabled:opacity-50 transition-all">
              <RefreshCw size={12} className={recalcing ? 'animate-spin' : ''} />
              Fix Rankings
            </button>
          </div>
        </div>
      )}

      {loading && <p className="text-sm text-gray-400 animate-pulse">Loading…</p>}

      {!loading && data && (
        <>
          {/* ── Sales Teams (ranked) ── */}
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
                  <SalesBucket key={team.team_name} team={team} period={sel} onRefresh={() => loadData(sel)} />
                ))}
              </div>
            )}
          </section>

          {/* ── Pre-Sales Teams ── */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">📋</span>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Pre-Sales Teams</h2>
              <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full font-medium">
                Activity Data
              </span>
            </div>
            {data.presales_teams.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500 text-sm italic">No pre-sales data for this period.</p>
            ) : (
              <div className="space-y-4">
                {data.presales_teams.map(team => (
                  <PresalesBucket key={team.team_name} team={team} period={sel} onRefresh={() => loadData(sel)} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}


// ── inline numeric cell editor ────────────────────────────────────────────────
function NumCell({ value, editing, field, draft, setDraft }) {
  if (!editing) return <span>{value ?? 0}</span>;
  return (
    <input type="number" min="0"
      value={draft[field] ?? value ?? 0}
      onChange={e => setDraft(d => ({ ...d, [field]: Number(e.target.value) }))}
      className="w-16 border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary/50"
    />
  );
}

// ── Sales team bucket ─────────────────────────────────────────────────────────
function SalesBucket({ team, period, onRefresh }) {
  const [open,      setOpen]      = useState(true);
  const [editId,    setEditId]    = useState(null);
  const [draft,     setDraft]     = useState({});
  const [saving,    setSaving]    = useState(false);
  const [addOpen,   setAddOpen]   = useState(false);
  const [members,   setMembers]   = useState([]);  // for add-row dropdown

  const rank = team.rank;
  const rankBadgeCls = rank === 1
    ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-600'
    : rank === 2
    ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-500'
    : rank === 3
    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-600'
    : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-700';

  const startEdit = (m) => { setEditId(m.id); setDraft({}); };
  const cancelEdit = () => { setEditId(null); setDraft({}); };

  const saveEdit = async (m) => {
    setSaving(true);
    try {
      await teamAchievementsApi.updateRecord(m.id, draft);
      cancelEdit();
      onRefresh();
    } finally { setSaving(false); }
  };

  const deleteRow = async (m) => {
    if (!confirm(`Delete ${m.employee_name}'s record for this period?`)) return;
    await teamAchievementsApi.deleteRecord(m.id);
    onRefresh();
  };

  const openAdd = async () => {
    const r = await teamMembersApi.list({ team_type: 'sales', team_name: team.team_name });
    setMembers(r.data || []);
    setAddOpen(true);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Team header */}
      <div className={`flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700
        ${rank === 1 ? 'bg-yellow-50 dark:bg-yellow-900/10' : rank === 2 ? 'bg-gray-50 dark:bg-gray-800' : rank === 3 ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-white dark:bg-gray-900'}`}>
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
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{(team.total_sqft||0).toLocaleString()} sq.ft</span>
            <span>·</span>{team.total_units} units
            <span>·</span>{team.total_bookings} bookings
          </p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 transition-colors font-medium mr-1">
          <Plus size={12}/>Add Row
        </button>
        <button onClick={() => setOpen(o => !o)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          {open ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
        </button>
      </div>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {['Name','Designation','Visits','Meetings','Bookings','Reg','Sq.Ft','Units',''].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-gray-400 dark:text-gray-500 font-medium text-xs whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {team.members.map((m, i) => {
                const editing = editId === m.id;
                return (
                  <tr key={m.id || i}
                    className="border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="py-2 px-3 font-medium text-gray-800 dark:text-white whitespace-nowrap">{m.employee_name}</td>
                    <td className="py-2 px-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">{m.designation || '—'}</td>
                    {['site_visits','meetings','bookings','registrations'].map(f => (
                      <td key={f} className="py-2 px-3 text-gray-700 dark:text-gray-300">
                        <NumCell value={m[f]} editing={editing} field={f} draft={draft} setDraft={setDraft}/>
                      </td>
                    ))}
                    <td className="py-2 px-3 font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {editing
                        ? <input type="number" min="0" step="0.01"
                            value={draft.square_feet_sold ?? m.square_feet_sold ?? 0}
                            onChange={e => setDraft(d => ({ ...d, square_feet_sold: parseFloat(e.target.value)||0 }))}
                            className="w-20 border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary/50"/>
                        : (m.square_feet_sold > 0 ? (m.square_feet_sold||0).toLocaleString() : '—')
                      }
                    </td>
                    <td className="py-2 px-3 text-gray-700 dark:text-gray-300">
                      <NumCell value={m.units_sold} editing={editing} field="units_sold" draft={draft} setDraft={setDraft}/>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        {editing ? (
                          <>
                            <button onClick={() => saveEdit(m)} disabled={saving}
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                              <Save size={13}/>
                            </button>
                            <button onClick={cancelEdit}
                              className="p-1 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                              <X size={13}/>
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(m)}
                              className="p-1 rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                              <Pencil size={13}/>
                            </button>
                            <button onClick={() => deleteRow(m)}
                              className="p-1 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                              <Trash2 size={13}/>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60">
                <td className="py-2 px-3 font-bold text-gray-700 dark:text-gray-200 text-xs" colSpan={2}>TEAM TOTAL</td>
                <td className="py-2 px-3 font-bold text-gray-700 dark:text-gray-200">{team.members.reduce((s,m)=>s+m.site_visits,0)}</td>
                <td className="py-2 px-3 font-bold text-gray-700 dark:text-gray-200">{team.members.reduce((s,m)=>s+m.meetings,0)}</td>
                <td className="py-2 px-3 font-bold text-gray-700 dark:text-gray-200">{team.members.reduce((s,m)=>s+m.bookings,0)}</td>
                <td className="py-2 px-3 font-bold text-gray-700 dark:text-gray-200">{team.members.reduce((s,m)=>s+m.registrations,0)}</td>
                <td className="py-2 px-3 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">{(team.total_sqft||0).toLocaleString()}</td>
                <td className="py-2 px-3 font-bold text-gray-700 dark:text-gray-200">{team.total_units}</td>
                <td/>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {addOpen && (
        <AddRowModal
          teamType="sales"
          teamName={team.team_name}
          period={period}
          members={members}
          onClose={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); onRefresh(); }}
        />
      )}
    </div>
  );
}


// ── Pre-Sales team bucket ────────────────────────────────────────────────────
function PresalesBucket({ team, period, onRefresh }) {
  const [open,    setOpen]    = useState(true);
  const [editId,  setEditId]  = useState(null);
  const [draft,   setDraft]   = useState({});
  const [saving,  setSaving]  = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [members, setMembers] = useState([]);

  const startEdit = (m) => { setEditId(m.id); setDraft({}); };
  const cancelEdit = () => { setEditId(null); setDraft({}); };

  const saveEdit = async (m) => {
    setSaving(true);
    try {
      await teamAchievementsApi.updateRecord(m.id, draft);
      cancelEdit();
      onRefresh();
    } finally { setSaving(false); }
  };

  const deleteRow = async (m) => {
    if (!confirm(`Delete ${m.employee_name}'s record for this period?`)) return;
    await teamAchievementsApi.deleteRecord(m.id);
    onRefresh();
  };

  const openAdd = async () => {
    const r = await teamMembersApi.list({ team_type: 'pre_sales', team_name: team.team_name });
    setMembers(r.data || []);
    setAddOpen(true);
  };

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
            <span>·</span>{team.total_site_visits} visits
            <span>·</span>{team.total_meetings} meetings
          </p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-1 text-xs px-2.5 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 transition-colors font-medium mr-1">
          <Plus size={12}/>Add Row
        </button>
        <button onClick={() => setOpen(o => !o)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
          {open ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
        </button>
      </div>

      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                {['Name','Designation','Site Visits','Meetings',''].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-gray-400 dark:text-gray-500 font-medium text-xs whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {team.members.map((m, i) => {
                const editing = editId === m.id;
                return (
                  <tr key={m.id || i}
                    className="border-t border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="py-2 px-3 font-medium text-gray-800 dark:text-white whitespace-nowrap">{m.employee_name}</td>
                    <td className="py-2 px-3 text-gray-500 dark:text-gray-400 text-xs">{m.designation || '—'}</td>
                    {['site_visits','meetings'].map(f => (
                      <td key={f} className="py-2 px-3 text-gray-700 dark:text-gray-300">
                        <NumCell value={m[f]} editing={editing} field={f} draft={draft} setDraft={setDraft}/>
                      </td>
                    ))}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        {editing ? (
                          <>
                            <button onClick={() => saveEdit(m)} disabled={saving}
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
                              <Save size={13}/>
                            </button>
                            <button onClick={cancelEdit}
                              className="p-1 rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                              <X size={13}/>
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(m)}
                              className="p-1 rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                              <Pencil size={13}/>
                            </button>
                            <button onClick={() => deleteRow(m)}
                              className="p-1 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                              <Trash2 size={13}/>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/60">
                <td className="py-2 px-3 font-bold text-gray-700 dark:text-gray-200 text-xs" colSpan={2}>TEAM TOTAL</td>
                <td className="py-2 px-3 font-bold text-gray-700 dark:text-gray-200">{team.total_site_visits}</td>
                <td className="py-2 px-3 font-bold text-gray-700 dark:text-gray-200">{team.total_meetings}</td>
                <td/>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {addOpen && (
        <AddRowModal
          teamType="pre_sales"
          teamName={team.team_name}
          period={period}
          members={members}
          onClose={() => setAddOpen(false)}
          onSaved={() => { setAddOpen(false); onRefresh(); }}
        />
      )}
    </div>
  );
}


// ── Modal: Add a data row for an existing member in this period ──────────────
function AddRowModal({ teamType, teamName, period, members, onClose, onSaved }) {
  const isSales = teamType === 'sales';
  const [memberId, setMemberId] = useState('');
  const [vals, setVals] = useState({
    site_visits:0, meetings:0,
    bookings:0, registrations:0, square_feet_sold:0, units_sold:0,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (f, v) => setVals(d => ({ ...d, [f]: v }));

  const save = async () => {
    if (!memberId) { setErr('Select a member.'); return; }
    setSaving(true); setErr('');
    try {
      const payload = {
        employee: Number(memberId),
        team_name: teamName,
        team_type: teamType,
        month: period.month,
        year:  period.year,
        site_visits: vals.site_visits,
        appointments: 0,
        meetings: vals.meetings,
        ...(isSales ? {
          bookings: vals.bookings,
          registrations: vals.registrations,
          square_feet_sold: vals.square_feet_sold,
          units_sold: vals.units_sold,
        } : {}),
      };
      await teamAchievementsApi.createRecord(payload);
      onSaved();
    } catch (e) {
      setErr(e.response?.data?.detail || e.response?.data?.employee?.[0] || 'Failed to add record.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-800 dark:text-white">Add Record — {teamName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Team Member</label>
            <select value={memberId} onChange={e => setMemberId(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">— Select member —</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.employee_name} ({m.designation})</option>)}
            </select>
            {members.length === 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">No members in this team yet. Add them from the Members tab first.</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { f: 'site_visits',   label: 'Site Visits' },
              { f: 'meetings',      label: 'Meetings' },
              ...(isSales ? [
                { f: 'bookings',        label: 'Bookings' },
                { f: 'registrations',   label: 'Registrations' },
                { f: 'square_feet_sold',label: 'Sq.Ft Sold', step: '0.01' },
                { f: 'units_sold',      label: 'Units Sold' },
              ] : []),
            ].map(({ f, label, step }) => (
              <div key={f}>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
                <input type="number" min="0" step={step || '1'} value={vals[f]}
                  onChange={e => set(f, parseFloat(e.target.value)||0)}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30"/>
              </div>
            ))}
          </div>

          {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}
        </div>
        <div className="px-5 pb-5 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all">
            {saving ? 'Saving…' : 'Add Record'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// TAB: Members — grouped accordion by team name (mobile-friendly)
// ════════════════════════════════════════════════════════════════════════════
function MembersTab() {
  const [members,    setMembers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [search,     setSearch]     = useState('');
  const [addOpen,    setAddOpen]    = useState(false);
  const [expanded,   setExpanded]   = useState(new Set()); // set of open team names

  const load = () => {
    setLoading(true);
    teamMembersApi.list()
      .then(r => {
        const data = r.data.results || r.data;
        setMembers(data);
        // Auto-expand all teams on first load
        const names = [...new Set(data.map(m => m.team_name))];
        setExpanded(new Set(names));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const toggleTeam = (name) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const filtered = members.filter(m => {
    const q = search.toLowerCase();
    const matchType   = filterType === 'all' || m.team_type === filterType;
    const matchSearch = !search ||
      m.employee_name.toLowerCase().includes(q) ||
      m.team_name.toLowerCase().includes(q) ||
      m.designation.toLowerCase().includes(q);
    return matchType && matchSearch;
  });

  // Group by team_name, preserving insertion order
  const teams = [];
  const teamMap = {};
  filtered.forEach(m => {
    if (!teamMap[m.team_name]) {
      teamMap[m.team_name] = [];
      teams.push(m.team_name);
    }
    teamMap[m.team_name].push(m);
  });

  const deleteMember = async (m) => {
    if (!confirm(`Delete ${m.employee_name}? This removes all their achievement records too.`)) return;
    await teamMembersApi.delete(m.id);
    load();
  };

  const typeBadgeClass = (type) => type === 'sales'
    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-2">
          {[['all','All'],['sales','Sales'],['pre_sales','Pre-Sales']].map(([v,l]) => (
            <button key={v} onClick={() => setFilterType(v)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                ${filterType === v
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
              {l}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name, team, designation…"
          className="flex-1 min-w-[160px] border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"/>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all">
          <Plus size={14}/>Add Member
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 animate-pulse">Loading members…</p>
      ) : teams.length === 0 ? (
        <div className="text-center py-14 text-gray-400 dark:text-gray-500">
          <Users size={32} className="mx-auto mb-2"/>
          <p>{members.length === 0 ? 'No members yet.' : 'No matches.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {teams.map(teamName => {
            const teamMembers = teamMap[teamName];
            const isOpen = expanded.has(teamName);
            const teamType = teamMembers[0]?.team_type;
            return (
              <div key={teamName}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                {/* Team header — tap to expand/collapse */}
                <button
                  onClick={() => toggleTeam(teamName)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors text-left">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    teamType === 'sales'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-purple-100 dark:bg-purple-900/30'
                  }`}>
                    <Users size={14} className={teamType === 'sales' ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 dark:text-white text-sm truncate">{teamName}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''} ·{' '}
                      <span className={`font-medium ${teamType === 'sales' ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'}`}>
                        {teamType === 'sales' ? 'Sales' : 'Pre-Sales'}
                      </span>
                    </p>
                  </div>
                  {isOpen
                    ? <ChevronDown size={16} className="text-gray-400 shrink-0" />
                    : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
                </button>

                {/* Member list (expanded) */}
                {isOpen && (
                  <div className="border-t border-gray-50 dark:border-gray-800">
                    {teamMembers.map((m, idx) => (
                      <div key={m.id}
                        className={`flex items-center gap-3 px-4 py-3 ${
                          idx < teamMembers.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''
                        } hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors`}>
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {(m.employee_name || '?')[0].toUpperCase()}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{m.employee_name}</p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{m.designation || '—'}</p>
                        </div>
                        {/* Actions */}
                        <MemberInlineActions member={m} onDelete={() => deleteMember(m)} onSaved={load} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {addOpen && <AddMemberModal onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); load(); }}/>}
    </div>
  );
}

/* Inline edit / delete for a member inside the accordion */
function MemberInlineActions({ member: m, onDelete, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState({});
  const [saving,  setSaving]  = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await teamMembersApi.update(m.id, draft);
      setEditing(false); setDraft({});
      onSaved();
    } finally { setSaving(false); }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <input
          value={draft.employee_name ?? m.employee_name}
          onChange={e => setDraft(d => ({ ...d, employee_name: e.target.value }))}
          placeholder="Name"
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none w-28"/>
        <input
          value={draft.designation ?? m.designation}
          onChange={e => setDraft(d => ({ ...d, designation: e.target.value }))}
          placeholder="Designation"
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none w-24"/>
        <button onClick={save} disabled={saving}
          className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors">
          <Save size={13}/>
        </button>
        <button onClick={() => { setEditing(false); setDraft({}); }}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <X size={13}/>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button onClick={() => setEditing(true)}
        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
        <Pencil size={13}/>
      </button>
      <button onClick={onDelete}
        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
        <Trash2 size={13}/>
      </button>
    </div>
  );
}


function AddMemberModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ employee_name:'', designation:'', team_name:'', team_type:'sales', department:'' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (f, v) => setForm(d => ({ ...d, [f]: v }));

  const save = async () => {
    if (!form.employee_name.trim() || !form.team_name.trim()) { setErr('Name and Team Name are required.'); return; }
    setSaving(true); setErr('');
    try {
      await teamMembersApi.create(form);
      onSaved();
    } catch (e) {
      const d = e.response?.data;
      setErr(typeof d === 'string' ? d : d?.employee_name?.[0] || d?.non_field_errors?.[0] || 'Failed to create member.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-800 dark:text-white">Add New Member</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={18}/></button>
        </div>
        <div className="p-5 space-y-4">
          {[
            { f:'employee_name', label:'Employee Name *', placeholder:'e.g. John Doe' },
            { f:'designation',   label:'Designation',     placeholder:'e.g. Sales Manager' },
            { f:'team_name',     label:'Team Name *',     placeholder:'e.g. Ram Saravanan' },
            { f:'department',    label:'Department',      placeholder:'e.g. Sales' },
          ].map(({ f, label, placeholder }) => (
            <div key={f}>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{label}</label>
              <input value={form[f]} onChange={e => set(f, e.target.value)} placeholder={placeholder}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30"/>
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Team Type *</label>
            <div className="grid grid-cols-2 gap-3">
              {[['sales','🏆 Sales'],['pre_sales','📋 Pre-Sales']].map(([v,l]) => (
                <button key={v} onClick={() => set('team_type', v)}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all text-left
                    ${form.team_type === v
                      ? v === 'sales' ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'border-purple-400 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {err && <p className="text-xs text-red-600 dark:text-red-400">{err}</p>}
        </div>
        <div className="px-5 pb-5 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors">Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all">
            {saving ? 'Saving…' : 'Add Member'}
          </button>
        </div>
      </div>
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// TAB: Upload Data
// ════════════════════════════════════════════════════════════════════════════
function UploadTab({ viewMode = 'monthly' }) {
  const [teamType, setTeamType] = useState('sales');
  const [month,    setMonth]    = useState(nowMonth);
  const [year,     setYear]     = useState(nowYear);
  const [file,     setFile]     = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result,   setResult]   = useState(null);
  const fileRef = useRef();

  const handleDrop = e => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) { setFile(f); setResult(null); }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setResult(null);
    const fd = new FormData();
    fd.append('file',      file);
    fd.append('month',     month);
    fd.append('year',      year);
    fd.append('team_type', teamType);
    try {
      const res = await teamAchievementsApi.upload(fd);
      setResult({ ok: true, data: res.data });
    } catch (e) {
      const d = e.response?.data;
      setResult({ ok: false, message: d?.error || 'Upload failed. Check file format.' });
    } finally { setUploading(false); }
  };

  const dlTemplate = async () => {
    try {
      const fn  = teamType === 'sales' ? 'sales_team_template.xlsx' : 'presales_team_template.xlsx';
      const res = teamType === 'sales'
        ? await teamAchievementsApi.downloadSalesTemplate()
        : await teamAchievementsApi.downloadPresalesTemplate();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement('a'); a.href = url;
      a.download = fn; a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const downloadErrors = () => {
    const errs = result?.data?.errors || [];
    if (!errs.length) return;
    const rows = [['Row','Employee Name','Team Name','Errors']];
    errs.forEach(e => rows.push([e.row, e.employee_name, e.team_name, (e.errors||[]).join(' | ')]));
    const csv  = rows.map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = `upload_errors_${MONTHS[month]}_${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl space-y-5">
      {/* Team type selector */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">Which team are you uploading for?</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { val: 'sales',     label: '🏆 Sales Team',     desc: 'Site Visits · Meetings · Bookings · Reg · Sq.Ft · Units' },
            { val: 'pre_sales', label: '📋 Pre-Sales Team', desc: 'Site Visits · Meetings' },
          ].map(opt => (
            <button key={opt.val} onClick={() => { setTeamType(opt.val); setResult(null); setFile(null); }}
              className={`p-4 rounded-xl border-2 text-left transition-all
                ${teamType === opt.val
                  ? opt.val === 'sales'
                    ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-purple-400 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}`}>
              <p className="font-semibold text-gray-800 dark:text-white text-sm mb-1">{opt.label}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Template download */}
      <div className={`border rounded-xl p-4 flex items-start gap-3
        ${teamType === 'sales'
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
          : 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700'}`}>
        <Download size={18} className={teamType === 'sales' ? 'text-emerald-500 shrink-0 mt-0.5' : 'text-purple-500 shrink-0 mt-0.5'} />
        <div className="flex-1">
          <p className={`font-semibold text-sm ${teamType === 'sales' ? 'text-emerald-800 dark:text-emerald-200' : 'text-purple-800 dark:text-purple-200'}`}>
            Download {teamType === 'sales' ? 'Sales' : 'Pre-Sales'} Template
          </p>
          <p className={`text-xs mt-0.5 ${teamType === 'sales' ? 'text-emerald-600 dark:text-emerald-300' : 'text-purple-600 dark:text-purple-300'}`}>
            Pre-filled with all team members. Just fill in the metric columns and re-upload.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Multi-month: rename sheets "March", "April", etc. — all will be imported at once.
          </p>
        </div>
        <button onClick={dlTemplate}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors
            ${teamType === 'sales' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
          Download
        </button>
      </div>

      {/* Period selectors */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 p-5">
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-3">
          Default Period <span className="text-xs font-normal text-gray-400 dark:text-gray-500">(used for single-sheet files)</span>
        </h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Month</label>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30">
              {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Year</label>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/30">
              {Array.from({ length: 5 }, (_, i) => nowYear - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
          ${dragging
            ? 'border-primary bg-primary/5'
            : 'border-gray-200 dark:border-gray-600 hover:border-primary/50 bg-white dark:bg-gray-900'}`}>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setResult(null); } }} />
        <Upload size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
        {file ? (
          <p className="font-semibold text-gray-800 dark:text-white">{file.name}</p>
        ) : (
          <>
            <p className="font-medium text-gray-600 dark:text-gray-300">Drop your Excel file here</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">or click to browse (.xlsx, .xls)</p>
          </>
        )}
      </div>

      {/* Upload button */}
      <button onClick={handleUpload} disabled={!file || uploading}
        className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
        {uploading ? 'Uploading…' : `Upload ${teamType === 'sales' ? 'Sales' : 'Pre-Sales'} data for ${MONTHS[month]} ${year}`}
      </button>

      {/* Result */}
      {result && (
        <div className={`rounded-xl border p-4 ${result.ok
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'}`}>
          {result.ok ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={18} className="text-emerald-500" />
                <p className="font-semibold text-emerald-800 dark:text-emerald-200">Upload Successful</p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-sm mb-3">
                {[
                  { label:'Processed', value:result.data.records_processed, cls:'text-gray-800 dark:text-white' },
                  { label:'Added',     value:result.data.records_added,     cls:'text-emerald-600 dark:text-emerald-400' },
                  { label:'Updated',   value:result.data.records_updated,   cls:'text-blue-600 dark:text-blue-400' },
                ].map(s => (
                  <div key={s.label} className="bg-white dark:bg-gray-800 rounded-lg p-2">
                    <p className={`font-bold text-lg ${s.cls}`}>{s.value}</p>
                    <p className="text-gray-400 dark:text-gray-500 text-xs">{s.label}</p>
                  </div>
                ))}
              </div>
              {result.data.errors_count > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertCircle size={14}/>{result.data.errors_count} row(s) skipped
                    </p>
                    <button onClick={downloadErrors} className="text-xs text-primary underline underline-offset-2">Download error CSV</button>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1">
                    {(result.data.errors || []).map((e, i) => (
                      <div key={i} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg px-3 py-1.5 text-xs">
                        <span className="font-medium text-amber-800 dark:text-amber-200">Row {e.row}</span>
                        {e.employee_name && <span className="text-amber-700 dark:text-amber-300"> · {e.employee_name}</span>}
                        <span className="text-amber-600 dark:text-amber-400"> — {(e.errors||[]).join('; ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-start gap-2">
              <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 dark:text-red-300 text-sm">{result.message}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


// ════════════════════════════════════════════════════════════════════════════
// TAB: Upload History
// ════════════════════════════════════════════════════════════════════════════
function HistoryTab() {
  const [history,    setHistory]    = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    teamAchievementsApi.history().then(r => setHistory(r.data.results || r.data)).catch(() => {});
  }, []);

  const toggleErrors = id => setExpandedId(v => v === id ? null : id);

  const downloadErrors = item => {
    const errs = item.error_report || [];
    if (!errs.length) return;
    const rows = [['Row','Employee Name','Team Name','Errors']];
    errs.forEach(e => rows.push([e.row, e.employee_name, e.team_name, (e.errors||[]).join(' | ')]));
    const csv  = rows.map(r => r.map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url;
    a.download = `errors_${item.month}_${item.year}_${item.id}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (history.length === 0) return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 p-12 text-center">
      <History size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
      <p className="text-gray-400 dark:text-gray-500">No uploads yet</p>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              {['File','Period','By','At','Processed','Added','Updated','Errors',''].map(h => (
                <th key={h} className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map(item => (
              <>
                <tr key={item.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="py-2.5 px-4 font-medium text-gray-800 dark:text-white max-w-[160px] truncate" title={item.filename}>{item.filename}</td>
                  <td className="py-2.5 px-4 text-gray-600 dark:text-gray-300 whitespace-nowrap">{item.month_name} {item.year}</td>
                  <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400">{item.uploaded_by_name}</td>
                  <td className="py-2.5 px-4 text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">
                    {new Date(item.uploaded_at).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                  </td>
                  <td className="py-2.5 px-4 text-gray-700 dark:text-gray-300 text-center">{item.records_processed}</td>
                  <td className="py-2.5 px-4 text-emerald-600 dark:text-emerald-400 font-semibold text-center">{item.records_added}</td>
                  <td className="py-2.5 px-4 text-blue-600 dark:text-blue-400 font-semibold text-center">{item.records_updated}</td>
                  <td className="py-2.5 px-4 text-center">
                    {item.errors_count > 0
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">{item.errors_count}</span>
                      : <span className="text-emerald-500">✓</span>
                    }
                  </td>
                  <td className="py-2.5 px-4">
                    {item.errors_count > 0 && (
                      <div className="flex gap-2">
                        <button onClick={() => toggleErrors(item.id)} className="text-xs text-primary underline underline-offset-2">
                          {expandedId === item.id ? 'Hide' : 'View'}
                        </button>
                        <button onClick={() => downloadErrors(item)} className="text-xs text-gray-400 dark:text-gray-500 underline underline-offset-2">CSV</button>
                      </div>
                    )}
                  </td>
                </tr>
                {expandedId === item.id && (
                  <tr key={`${item.id}-errs`} className="bg-red-50 dark:bg-red-900/10">
                    <td colSpan={9} className="px-5 py-3">
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {(item.error_report || []).map((e, i) => (
                          <div key={i} className="text-xs text-red-700 dark:text-red-300">
                            <span className="font-semibold">Row {e.row}</span>
                            {e.employee_name && <span> · {e.employee_name}</span>}
                            <span> — {(e.errors||[]).join('; ')}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
