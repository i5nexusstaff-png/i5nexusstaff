import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FileText, Save, Send, CheckCircle, Clock, Edit3, AlertCircle,
  RefreshCw, Calendar, Users, Eye, MessageSquare, X, Filter,
  TrendingUp, BarChart2, Phone, Target, Megaphone, Briefcase,
  Download, Upload, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  Activity, Hash, ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { reportsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (iso) =>
  new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
const todayISO = () => new Date().toISOString().slice(0, 10);

const MONTH_OPTS = (() => {
  const opts = []; const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    opts.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
    });
  }
  return opts;
})();

const STATUS_CFG = {
  draft:     { label: 'Draft',     icon: Edit3,       cls: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
  submitted: { label: 'Submitted', icon: Send,        cls: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' },
  reviewed:  { label: 'Reviewed',  icon: CheckCircle, cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
};

const REPORT_ICONS = {
  sm_bdm:        BarChart2,
  vp_sales_head: TrendingUp,
  telecallers:   Phone,
  marketing:     Megaphone,
  // legacy
  sales_head: TrendingUp, sales_manager: BarChart2, vp: Target,
  telecallers_head: Phone, bdm: Briefcase,
};

const REPORT_COLORS = {
  sm_bdm:        { from: '#1E3A5F', to: '#1d4ed8' },
  vp_sales_head: { from: '#4A0072', to: '#7B1FA2' },
  telecallers:   { from: '#14532D', to: '#166534' },
  marketing:     { from: '#7F1D1D', to: '#991B1B' },
  // legacy
  sales_head: { from: '#1E3A5F', to: '#2D6A4F' },
  sales_manager: { from: '#1a1a2e', to: '#16213e' },
  vp: { from: '#4A0072', to: '#7B1FA2' },
  telecallers_head: { from: '#1B4332', to: '#2D6A4F' },
  bdm: { from: '#1e3a5f', to: '#1d4ed8' },
};

const PIE_PALETTE = ['#1E3A5F','#2563eb','#7c3aed','#0891b2','#059669','#d97706','#dc2626'];

const AVATAR_COLORS = [
  'from-blue-500 to-indigo-600','from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600','from-amber-500 to-orange-600','from-rose-500 to-pink-600',
];

function Avatar({ name = 'U', idx = 0 }) {
  return (
    <div className={`w-8 h-8 bg-gradient-to-br ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0`}>
      {String(name)[0].toUpperCase()}
    </div>
  );
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.cls}`}>
      <Icon size={10}/>{cfg.label}
    </span>
  );
}

function ReportField({ field, value, onChange, disabled }) {
  const base = 'w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800/60 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed placeholder-gray-300 dark:placeholder-gray-600';
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{field.label}</label>
      {field.type === 'textarea' ? (
        <textarea value={value || ''} onChange={e => onChange(field.key, e.target.value)}
          disabled={disabled} rows={3}
          placeholder={disabled ? '' : `Enter ${field.label.toLowerCase()}…`}
          className={`${base} resize-none`}/>
      ) : (
        <input type={field.type === 'number' ? 'number' : 'text'}
          value={value || ''} onChange={e => onChange(field.key, e.target.value)}
          disabled={disabled} min={field.type === 'number' ? '0' : undefined}
          placeholder={disabled ? '' : (field.type === 'number' ? '0' : `Enter ${field.label.toLowerCase()}…`)}
          className={base}/>
      )}
    </div>
  );
}

// ── Date Navigator ─────────────────────────────────────────────────────────────
function DateNav({ value, onChange }) {
  const prev = () => {
    const d = new Date(value + 'T00:00:00'); d.setDate(d.getDate() - 1);
    onChange(d.toISOString().slice(0, 10));
  };
  const next = () => {
    const d = new Date(value + 'T00:00:00'); d.setDate(d.getDate() + 1);
    if (d.toISOString().slice(0, 10) <= todayISO()) onChange(d.toISOString().slice(0, 10));
  };
  return (
    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700">
      <button onClick={prev} className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
        <ChevronLeft size={15} className="text-gray-500"/>
      </button>
      <input type="date" value={value} max={todayISO()}
        onChange={e => e.target.value && onChange(e.target.value)}
        className="bg-transparent text-sm font-bold text-gray-700 dark:text-white outline-none cursor-pointer"/>
      <button onClick={next} disabled={value === todayISO()}
        className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-30">
        <ChevronRight size={15} className="text-gray-500"/>
      </button>
      {value !== todayISO() && (
        <button onClick={() => onChange(todayISO())}
          className="ml-1 text-xs px-2.5 py-1 bg-accent text-white rounded-lg font-bold hover:opacity-90 transition-all">
          Today
        </button>
      )}
    </div>
  );
}

// ── Admin Download Section — export all staff data as xlsx ───────────────────
function AdminDownloadSection({ reportType }) {
  const [open,      setOpen]      = useState(false);
  const [period,    setPeriod]    = useState('monthly');
  const [month,     setMonth]     = useState(todayISO().slice(0, 7));
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [loading, setLoading] = useState(false);

  const MONTH_OPTS = (() => {
    const opts = []; const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      opts.push({
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
      });
    }
    return opts;
  })();

  const handleDownload = async (allTypes) => {
    setLoading(true);
    try {
      const params = { period };
      if (!allTypes && reportType) params.report_type = reportType;
      if (period === 'weekly')  params.week_start = weekStart;
      if (period === 'monthly') params.month = month;
      const res = await reportsApi.download(params);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `reports_${period === 'weekly' ? weekStart : month}${allTypes ? '_all' : ''}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
    } catch { /**/ }
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <Download size={14} className="text-white"/>
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-800 dark:text-white text-sm">Download Reports</p>
            <p className="text-xs text-gray-400 mt-0.5">Export all staff data as Excel — weekly or monthly</p>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-700">
          <div className="mt-5 flex flex-wrap gap-3 items-end">
            {/* Period */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Period</p>
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                {[['monthly','Monthly'],['weekly','Weekly']].map(([v,l]) => (
                  <button key={v} onClick={() => setPeriod(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      period === v ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                    }`}>{l}</button>
                ))}
              </div>
            </div>

            {period === 'monthly' && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Month</p>
                <select value={month} onChange={e => setMonth(e.target.value)}
                  className="border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none">
                  {MONTH_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )}

            {period === 'weekly' && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Week start (Monday)</p>
                <input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)}
                  max={todayISO()}
                  className="border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none"/>
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => handleDownload(false)} disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-60">
                {loading ? <RefreshCw size={13} className="animate-spin"/> : <Download size={13}/>}
                This Report Type
              </button>
              <button onClick={() => handleDownload(true)} disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-60">
                <Download size={13}/>All 4 Types
              </button>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-3">
            "All 4 Types" generates one Excel with 4 sheets: SM&amp;BDM, VP&amp;SH, Telecallers, Marketing — all staff included.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Import Section ─────────────────────────────────────────────────────────────
function ImportSection({ reportType, schemaLabel, onDone }) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dlLoading, setDlLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const downloadTemplate = async () => {
    setDlLoading(true);
    try {
      const res = await reportsApi.template(reportType);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `${schemaLabel.replace(/\s+/g, '_').toLowerCase()}_template.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch { /**/ }
    setDlLoading(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setImporting(true); setResult(null);
    try {
      const res = await reportsApi.importData(reportType, file);
      setResult({ ok: true, ...res.data }); onDone?.();
    } catch (err) {
      setResult({ ok: false, msg: err.response?.data?.detail || 'Upload failed.' });
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Upload size={14} className="text-white"/>
          </div>
          <div className="text-left">
            <p className="font-bold text-gray-800 dark:text-white text-sm">Import Historical Data</p>
            <p className="text-xs text-gray-400 mt-0.5">Download template → fill past data → upload</p>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
      </button>
      {open && (
        <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
              <p className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-2">Step 1 — Download Template</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Download the Excel template for <strong>{schemaLabel}</strong>, fill in historical data by date.</p>
              <button onClick={downloadTemplate} disabled={dlLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-60">
                {dlLoading ? <RefreshCw size={12} className="animate-spin"/> : <Download size={12}/>}
                Download Template
              </button>
            </div>
            <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-100 dark:border-violet-800">
              <p className="text-xs font-black text-violet-700 dark:text-violet-400 uppercase tracking-wide mb-2">Step 2 — Upload Filled File</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Upload your .xlsx or .csv. Existing entries are updated; new dates are created.</p>
              <label className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 transition-colors cursor-pointer">
                {importing ? <RefreshCw size={12} className="animate-spin"/> : <Upload size={12}/>}
                {importing ? 'Importing…' : 'Upload File'}
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleUpload} className="hidden"/>
              </label>
            </div>
          </div>
          {result && (
            <div className={`mt-4 p-4 rounded-xl border text-sm ${result.ok
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'}`}>
              {result.ok ? (
                <>
                  <p className="font-bold mb-1">✓ {result.message}</p>
                  {result.errors?.length > 0 && (
                    <ul className="text-xs mt-2 space-y-0.5">{result.errors.map((e, i) => <li key={i} className="opacity-70">• {e}</li>)}</ul>
                  )}
                </>
              ) : <p>{result.msg}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── KPI Card with mini sparkline ───────────────────────────────────────────────
function KpiCard({ label, value, trend, sparkData, color, icon: Icon }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 flex flex-col justify-between min-h-[120px]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{label}</p>
          <p className="text-3xl font-black text-gray-800 dark:text-white">{value ?? '—'}</p>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '20' }}>
          {Icon && <Icon size={18} style={{ color }}/>}
        </div>
      </div>
      {sparkData?.length > 1 && (
        <div className="mt-3 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2}
                fill={`url(#spark-${label})`} dot={false} isAnimationActive={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          <ArrowUpRight size={11} className={trend >= 0 ? 'text-emerald-500' : 'text-red-400 rotate-90'}/>
          <span className={`text-xs font-bold ${trend >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
            {Math.abs(trend)}% vs last month
          </span>
        </div>
      )}
    </div>
  );
}

// ── Analytics Dashboard ────────────────────────────────────────────────────────
function AnalyticsDashboard({ schema, isSuperAdmin }) {
  const [selType,    setSelType]    = useState('');
  const [selMonth,   setSelMonth]   = useState(MONTH_OPTS[0].value);
  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [reviewed,   setReviewed]   = useState(null);
  const [reviewNotes,setReviewNotes]= useState('');
  const [reviewing,  setReviewing]  = useState(false);
  const [toast,      setToast]      = useState(null);
  const toastRef = useRef();

  const showToast = (msg, ok = true) => {
    clearTimeout(toastRef.current); setToast({ msg, ok });
    toastRef.current = setTimeout(() => setToast(null), 3000);
  };

  // init selType when schema loads
  useEffect(() => {
    if (schema && !selType) setSelType(Object.keys(schema)[0] || '');
  }, [schema, selType]);

  const loadReports = useCallback(async () => {
    if (!selType) return;
    setLoading(true);
    try {
      const r = await reportsApi.team({ month: selMonth, report_type: selType });
      setReports(r.data);
    } finally { setLoading(false); }
  }, [selType, selMonth]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const typeSchema = schema?.[selType];
  const numFields  = (typeSchema?.fields || []).filter(f => f.type === 'number');

  // ── Aggregations ─────────────────────────────────────────────────────────
  const totalSubmitted = reports.filter(r => r.status !== 'draft').length;
  const totalReviewed  = reports.filter(r => r.status === 'reviewed').length;
  const uniqueStaff    = new Set(reports.map(r => r.user)).size;
  const kpi1Field      = numFields[0];
  const kpi2Field      = numFields[1];
  const kpi1Total = reports.reduce((s, r) => s + (parseFloat(r.data?.[kpi1Field?.key]) || 0), 0);
  const kpi2Total = reports.reduce((s, r) => s + (parseFloat(r.data?.[kpi2Field?.key]) || 0), 0);

  // Bar chart: daily totals for first numeric field
  const barData = (() => {
    if (!kpi1Field) return [];
    const byDate = {};
    reports.forEach(r => {
      const d = r.report_date;
      const v = parseFloat(r.data?.[kpi1Field.key]) || 0;
      byDate[d] = (byDate[d] || 0) + v;
    });
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([d, v]) => ({
      day: d.slice(8), // DD
      v,
    }));
  })();

  // Donut: distribution across numeric fields
  const pieData = numFields.slice(0, 6).map((f, i) => {
    const total = reports.reduce((s, r) => s + (parseFloat(r.data?.[f.key]) || 0), 0);
    return { name: f.label, value: total, color: PIE_PALETTE[i % PIE_PALETTE.length] };
  }).filter(d => d.value > 0);

  // Spark series for KPIs
  const sparkFor = (field) => {
    if (!field) return [];
    const byDate = {};
    reports.forEach(r => {
      const d = r.report_date;
      byDate[d] = (byDate[d] || 0) + (parseFloat(r.data?.[field.key]) || 0);
    });
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => ({ v }));
  };

  const submitReview = async () => {
    if (!reviewed) return;
    setReviewing(true);
    try {
      await reportsApi.review(reviewed.id, { admin_notes: reviewNotes, status: 'reviewed' });
      showToast('Review saved.');
      setReviewed(null); setReviewNotes('');
      loadReports();
    } catch { showToast('Review failed.', false); }
    setReviewing(false);
  };

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'}`}>
          {toast.ok ? <CheckCircle size={15}/> : <AlertCircle size={15}/>}{toast.msg}
        </div>
      )}

      {/* ── Filters bar ── */}
      <div className="flex flex-wrap gap-3 items-center bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-4 shadow-sm">
        {/* Report type */}
        <div className="flex items-center gap-2">
          <Activity size={13} className="text-gray-400 shrink-0"/>
          <select value={selType} onChange={e => setSelType(e.target.value)}
            className="bg-transparent text-sm font-bold text-gray-700 dark:text-white focus:outline-none">
            {schema && Object.entries(schema).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700"/>
        {/* Month */}
        <div className="flex items-center gap-2">
          <Calendar size={13} className="text-gray-400 shrink-0"/>
          <select value={selMonth} onChange={e => setSelMonth(e.target.value)}
            className="bg-transparent text-sm text-gray-700 dark:text-white focus:outline-none">
            {MONTH_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {loading && <RefreshCw size={13} className="animate-spin text-accent"/>}
          <span className="text-xs text-gray-400">{reports.length} report{reports.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Reports" value={reports.length} color="#2563eb"
          sparkData={barData.map(d => ({ v: d.v }))} icon={FileText}/>
        <KpiCard label="Submitted" value={totalSubmitted} color="#059669"
          sparkData={sparkFor(kpi1Field)} icon={Send}/>
        <KpiCard label={kpi1Field?.label || 'KPI 1'} value={Math.round(kpi1Total).toLocaleString('en-IN')}
          color="#7c3aed" sparkData={sparkFor(kpi1Field)} icon={TrendingUp}/>
        <KpiCard label={kpi2Field?.label || 'Staff'} value={kpi2Field ? Math.round(kpi2Total).toLocaleString('en-IN') : uniqueStaff}
          color="#d97706" sparkData={sparkFor(kpi2Field)} icon={Users}/>
      </div>

      {/* ── Charts row ── */}
      {reports.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Bar chart */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-black text-gray-800 dark:text-white text-sm">
                  {kpi1Field ? kpi1Field.label : 'Daily Activity'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Daily totals for {MONTH_OPTS.find(o => o.value === selMonth)?.label}</p>
              </div>
              <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-lg font-bold">
                {typeSchema?.label}
              </span>
            </div>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false}/>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}/>
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false}/>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }}
                    cursor={{ fill: '#eff6ff' }}
                    formatter={(v) => [v, kpi1Field?.label || 'Value']}
                    labelFormatter={(l) => `Day ${l}`}/>
                  <Bar dataKey="v" fill="#2563eb" radius={[5,5,0,0]} maxBarSize={28}/>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-gray-300 dark:text-gray-600 text-sm">No data for this month</div>
            )}
          </div>

          {/* Donut chart */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <p className="font-black text-gray-800 dark:text-white text-sm mb-1">Field Breakdown</p>
            <p className="text-xs text-gray-400 mb-4">Totals by metric type</p>
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={80}
                      paddingAngle={3} dataKey="value" stroke="none">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }}
                      formatter={(v, n) => [v.toLocaleString('en-IN'), n]}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: d.color }}/>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[110px]">{d.name}</span>
                      </div>
                      <span className="text-[11px] font-bold text-gray-700 dark:text-white">{d.value.toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-gray-300 dark:text-gray-600 text-sm">No numeric data</div>
            )}
          </div>
        </div>
      )}

      {/* ── Submissions table ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <Clock size={14} className="text-gray-400"/>
          <p className="font-bold text-gray-700 dark:text-white text-sm">Submissions</p>
          <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full font-black">{reports.length}</span>
          <span className="ml-auto text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
            {totalReviewed} reviewed
          </span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><RefreshCw size={22} className="animate-spin text-accent"/></div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-gray-400">
            <FileText size={36} className="mb-3 text-gray-300 dark:text-gray-600"/>
            <p className="font-semibold">No reports found</p>
            <p className="text-sm mt-1">Try a different report type or month</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  {['Staff Member', 'Date', 'Status', 'Submitted At',
                    ...(numFields.slice(0, 2).map(f => f.label)),
                    'Action'].map((h, i) => (
                    <th key={i} className="text-left py-3 px-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {reports.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={r.user_detail?.full_name || 'U'} idx={idx}/>
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white leading-tight text-xs">{r.user_detail?.full_name || 'Unknown'}</p>
                          <p className="text-[10px] text-gray-400 capitalize">{r.user_detail?.position || r.user_detail?.role || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap text-xs">{fmtDate(r.report_date)}</td>
                    <td className="py-3 px-4"><StatusBadge status={r.status}/></td>
                    <td className="py-3 px-4 text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">{r.submitted_at ? fmtDate(r.submitted_at) : '—'}</td>
                    {numFields.slice(0, 2).map(f => (
                      <td key={f.key} className="py-3 px-4 text-gray-700 dark:text-gray-300 text-xs font-medium">
                        {r.data?.[f.key] || '—'}
                      </td>
                    ))}
                    <td className="py-3 px-4">
                      <button onClick={() => { setReviewed(r); setReviewNotes(r.admin_notes || ''); }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                        <Eye size={12}/> Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Review Modal ── */}
      {reviewed && schema && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col ring-1 ring-white/10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-3">
                <Avatar name={reviewed.user_detail?.full_name || 'U'} idx={0}/>
                <div>
                  <p className="font-black text-gray-800 dark:text-white">{reviewed.user_detail?.full_name || 'Unknown'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{reviewed.report_type_label} · {fmtDate(reviewed.report_date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={reviewed.status}/>
                <button onClick={() => setReviewed(null)} className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
                  <X size={16} className="text-gray-400"/>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(schema[reviewed.report_type]?.fields || []).map(f => (
                  <div key={f.key} className={`${f.type === 'textarea' ? 'sm:col-span-2' : ''} bg-gray-50 dark:bg-gray-800 rounded-xl p-3.5`}>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1">{f.label}</p>
                    <p className={`text-sm font-medium ${!reviewed.data?.[f.key] ? 'text-gray-300 dark:text-gray-600 italic' : 'text-gray-800 dark:text-white'}`}>
                      {reviewed.data?.[f.key] || 'Not filled'}
                    </p>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                  <MessageSquare size={11} className="inline mr-1"/>Add Notes / Feedback
                </label>
                <textarea value={reviewNotes} onChange={e => setReviewNotes(e.target.value)}
                  rows={3} placeholder="Optional feedback to the staff member…"
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none transition-all"/>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 shrink-0">
              <button onClick={() => setReviewed(null)}
                className="px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium">
                Close
              </button>
              <button onClick={submitReview} disabled={reviewing}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-500/20 hover:opacity-90 disabled:opacity-60 transition-all">
                {reviewing ? <RefreshCw size={14} className="animate-spin"/> : <CheckCircle size={14}/>}
                Mark Reviewed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function AdminReports() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [activeTab,  setActiveTab]  = useState('analytics');  // 'my' | 'analytics'
  const [schema,     setSchema]     = useState(null);

  // ── My Report state ───────────────────────────────────────────────────────
  const [selType,    setSelType]    = useState('');
  const [selDate,    setSelDate]    = useState(todayISO());
  const [myReport,   setMyReport]   = useState(null);
  const [myForm,     setMyForm]     = useState({});
  const [mySaving,   setMySaving]   = useState(false);
  const [mySavingAs, setMySavingAs] = useState(null);
  const [myLoading,  setMyLoading]  = useState(false);
  const [myHistory,  setMyHistory]  = useState([]);
  const [toast,      setToast]      = useState(null);
  const toastTimer = useRef();

  const showToast = (msg, ok = true) => {
    clearTimeout(toastTimer.current); setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  // ── Load schema once ───────────────────────────────────────────────────────
  useEffect(() => {
    reportsApi.schema().then(r => {
      setSchema(r.data);
      const types = Object.keys(r.data);
      const def   = user?.report_type && r.data[user.report_type] ? user.report_type : types[0];
      setSelType(def || '');
    });
  }, [user?.report_type]);

  // ── Load my report for selType + selDate ──────────────────────────────────
  const loadMyReport = useCallback(async (type, date) => {
    if (!type) return;
    setMyLoading(true);
    try {
      const [rptRes, histRes] = await Promise.all([
        reportsApi.list({ report_type: type, date }),
        reportsApi.list({ report_type: type }),
      ]);
      const rpts = rptRes.data.results || rptRes.data || [];
      const found = rpts[0] || null;
      setMyReport(found); setMyForm(found?.data || {});
      setMyHistory(histRes.data.results || histRes.data || []);
    } finally { setMyLoading(false); }
  }, []);

  useEffect(() => { if (activeTab === 'my' && selType) loadMyReport(selType, selDate); }, [activeTab, selType, selDate, loadMyReport]);

  const typeSchema = schema?.[selType];
  const isLocked   = myReport?.status === 'submitted' || myReport?.status === 'reviewed';
  const isToday    = selDate === todayISO();

  // ── Save my report ─────────────────────────────────────────────────────────
  const handleMySave = async (newStatus) => {
    if (!typeSchema) return;
    setMySaving(true); setMySavingAs(newStatus);
    try {
      const payload = { report_date: selDate, report_type: selType, data: myForm, status: newStatus };
      let saved;
      if (myReport?.id) {
        saved = (await reportsApi.update(myReport.id, payload)).data;
      } else {
        saved = (await reportsApi.save(payload)).data;
      }
      setMyReport(saved); setMyForm(saved.data || {});
      showToast(newStatus === 'submitted' ? '✓ Report submitted!' : '✓ Draft saved.');
      reportsApi.list({ report_type: selType }).then(r => setMyHistory(r.data.results || r.data || []));
    } catch (e) {
      showToast(e.response?.data?.detail || 'Save failed.', false);
    } finally { setMySaving(false); setMySavingAs(null); }
  };

  /* ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="max-w-6xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'}`}>
          {toast.ok ? <CheckCircle size={15}/> : <AlertCircle size={15}/>}{toast.msg}
        </div>
      )}

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Reports</h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">
          {isSuperAdmin
            ? 'All reports submitted by admin & staff — review and download'
            : 'Team analytics dashboard & your daily report'}
        </p>
      </div>

      {/* Tabs — hidden for super admin (only one view) */}
      {!isSuperAdmin && (
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit mb-6">
          {[
            { key: 'analytics', label: 'Team Analytics', icon: BarChart2 },
            { key: 'my',        label: 'My Report',      icon: FileText },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === key
                  ? 'bg-white dark:bg-gray-900 text-gray-800 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}>
              <Icon size={14}/>{label}
            </button>
          ))}
        </div>
      )}

      {/* ═══ Super admin: only Analytics ═══ */}
      {isSuperAdmin && schema && (
        <AnalyticsDashboard schema={schema} isSuperAdmin={isSuperAdmin}/>
      )}

      {/* ═══ TAB: ANALYTICS (admin only) ═══ */}
      {!isSuperAdmin && activeTab === 'analytics' && schema && (
        <AnalyticsDashboard schema={schema} isSuperAdmin={isSuperAdmin}/>
      )}

      {/* ═══ TAB: MY REPORT (admin only) ═══ */}
      {!isSuperAdmin && activeTab === 'my' && (
        <div className="space-y-5">
          {/* Type selector */}
          {schema && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(schema).map(([key, s]) => {
                const Icon   = REPORT_ICONS[key] || FileText;
                const colors = REPORT_COLORS[key] || REPORT_COLORS.sales_head;
                const active = key === selType;
                return (
                  <button key={key} onClick={() => setSelType(key)}
                    className={`relative group flex flex-col items-start p-4 rounded-2xl border-2 transition-all text-left
                      ${active ? 'border-transparent shadow-lg scale-[1.02]' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-md'}`}
                    style={active ? { background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` } : {}}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-all
                      ${active ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'}`}>
                      <Icon size={16} className={active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}/>
                    </div>
                    <p className={`text-xs font-black leading-tight ${active ? 'text-white' : 'text-gray-700 dark:text-white'}`}>
                      {s.label}
                    </p>
                    {active && <div className="absolute top-2 right-2 w-2 h-2 bg-white/70 rounded-full"/>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Date nav */}
          {typeSchema && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-gray-400"/>
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Reporting Date</span>
              </div>
              <DateNav value={selDate} onChange={setSelDate}/>
            </div>
          )}

          {/* Form card */}
          {typeSchema && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/60 dark:to-gray-900 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${REPORT_COLORS[selType]?.from || '#1E3A5F'}, ${REPORT_COLORS[selType]?.to || '#1E3A5F'})` }}>
                    {(() => { const Icon = REPORT_ICONS[selType] || FileText; return <Icon size={16} className="text-white"/>; })()}
                  </div>
                  <div>
                    <p className="font-black text-gray-800 dark:text-white text-sm">{typeSchema.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(selDate + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      {isToday && <span className="ml-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-md">TODAY</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {myReport && <StatusBadge status={myReport.status}/>}
                  {myLoading && <RefreshCw size={14} className="animate-spin text-accent"/>}
                </div>
              </div>
              <div className="p-6">
                {myReport?.admin_notes && (
                  <div className="mb-5 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Notes from Super Admin</p>
                    <p className="text-sm text-blue-800 dark:text-blue-200">{myReport.admin_notes}</p>
                  </div>
                )}
                {isLocked && (
                  <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                    <CheckCircle size={16}/>
                    {myReport?.status === 'reviewed' ? 'Reviewed by super admin.' : 'Submitted — read-only.'}
                  </div>
                )}
                {!myReport && !myLoading && (
                  <div className="mb-5 p-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400 text-center">
                    No report for this date. Fill in the fields below to create one.
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {typeSchema.fields.map(f => (
                    <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                      <ReportField field={f} value={myForm[f.key]}
                        onChange={(k, v) => setMyForm(fd => ({ ...fd, [k]: v }))}
                        disabled={isLocked}/>
                    </div>
                  ))}
                </div>
                {!isLocked && (
                  <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
                    <button onClick={() => handleMySave('draft')} disabled={mySaving}
                      className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 dark:border-gray-600 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-60">
                      {mySavingAs === 'draft' && mySaving ? <RefreshCw size={14} className="animate-spin"/> : <Save size={14}/>}
                      Save Draft
                    </button>
                    <button onClick={() => handleMySave('submitted')} disabled={mySaving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1E3A5F] to-[#2563eb] text-white rounded-xl text-sm font-bold shadow-md shadow-blue-900/20 hover:opacity-90 transition-all disabled:opacity-60">
                      {mySavingAs === 'submitted' && mySaving ? <RefreshCw size={14} className="animate-spin"/> : <Send size={14}/>}
                      {isSuperAdmin ? 'Submit Report' : 'Submit to Super Admin'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Download Reports (admin) ── */}
          {selType && typeSchema && (
            <AdminDownloadSection reportType={selType} />
          )}

          {/* Import section */}
          {selType && typeSchema && (
            <ImportSection
              reportType={selType}
              schemaLabel={typeSchema.label}
              onDone={() => reportsApi.list({ report_type: selType }).then(r => setMyHistory(r.data.results || r.data || []))}
            />
          )}

          {/* My history */}
          {myHistory.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <Clock size={14} className="text-gray-400"/>
                <p className="font-bold text-gray-700 dark:text-white text-sm">My Submission History</p>
                <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full font-black">{myHistory.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      {['Date', 'Report Type', 'Status', 'Updated', ''].map((h, i) => (
                        <th key={i} className="text-left py-3 px-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {myHistory.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
                        onClick={() => { setSelDate(r.report_date); setSelType(r.report_type); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                        <td className="py-3 px-4 font-semibold text-gray-800 dark:text-white whitespace-nowrap text-xs">{fmtDate(r.report_date)}</td>
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">{r.report_type_label}</td>
                        <td className="py-3 px-4"><StatusBadge status={r.status}/></td>
                        <td className="py-3 px-4 text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">{fmtDate(r.updated_at)}</td>
                        <td className="py-3 px-4"><span className="text-xs font-semibold text-accent">View</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
