import { useCallback, useEffect, useRef, useState } from 'react';
import { useConfirm } from '../../components/ConfirmDialog';
import {
  FileText, Save, Send, CheckCircle, Clock, Edit3, AlertCircle,
  RefreshCw, Calendar, ChevronLeft, ChevronRight, Upload, Download,
  BarChart2, Users, Phone, TrendingUp, Megaphone,
  X, ChevronDown, ChevronUp, Loader2, Check,
} from 'lucide-react';
import { reportsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// ── Helpers ───────────────────────────────────────────────────────────────────
const todayISO   = () => new Date().toISOString().slice(0, 10);
const fmtLong    = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN',
  { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtShort   = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN',
  { day: '2-digit', month: 'short', year: 'numeric' });
const fmtMonth   = (iso) => new Date(iso + '-01').toLocaleDateString('en-IN',
  { month: 'long', year: 'numeric' });

const LEGACY_MAP = {
  sales_manager: 'sm_bdm', bdm: 'sm_bdm',
  sales_head: 'vp_sales_head', vp: 'vp_sales_head',
  telecallers_head: 'telecallers',
};

const REPORT_META = {
  sm_bdm:        { icon: BarChart2,  color: '#1E3A5F', gradient: 'from-[#1E3A5F] to-[#2563eb]' },
  vp_sales_head: { icon: TrendingUp, color: '#4A0072', gradient: 'from-[#4A0072] to-[#7B1FA2]' },
  telecallers:   { icon: Phone,      color: '#14532D', gradient: 'from-[#14532D] to-[#166534]' },
  marketing:     { icon: Megaphone,  color: '#7F1D1D', gradient: 'from-[#7F1D1D] to-[#991B1B]' },
};

const STATUS_CFG = {
  draft:     { label: 'Draft',     icon: Edit3,       cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  submitted: { label: 'Submitted', icon: Send,        cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  reviewed:  { label: 'Reviewed',  icon: CheckCircle, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' },
};

function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG.draft;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${c.cls}`}>
      <Icon size={11}/>{c.label}
    </span>
  );
}

// ── Date Navigator ────────────────────────────────────────────────────────────
function DateNav({ value, onChange }) {
  const prev = () => { const d = new Date(value + 'T00:00:00'); d.setDate(d.getDate()-1); onChange(d.toISOString().slice(0,10)); };
  const next = () => {
    const d = new Date(value + 'T00:00:00'); d.setDate(d.getDate()+1);
    if (d.toISOString().slice(0,10) <= todayISO()) onChange(d.toISOString().slice(0,10));
  };
  return (
    <div className="flex items-center gap-1">
      <button onClick={prev} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 transition-colors">
        <ChevronLeft size={16}/>
      </button>
      <input type="date" value={value} max={todayISO()}
        onChange={e => e.target.value && onChange(e.target.value)}
        className="text-sm font-bold text-gray-800 dark:text-white bg-transparent border-0 outline-none cursor-pointer"/>
      <button onClick={next} disabled={value >= todayISO()}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 disabled:opacity-30 transition-colors">
        <ChevronRight size={16}/>
      </button>
    </div>
  );
}

// ── Single Report Field ───────────────────────────────────────────────────────
function ReportField({ field, value, onChange, disabled }) {
  const isNum = field.type === 'number';
  const isTxt = field.type === 'textarea';
  const base  = `w-full px-4 py-3 rounded-xl border text-sm transition-all outline-none
    ${disabled
      ? 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white focus:border-blue-400 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
    }`;
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
        {field.label}
      </label>
      {isTxt ? (
        <textarea value={value || ''} onChange={e => onChange(field.key, e.target.value)}
          disabled={disabled} rows={3}
          placeholder={disabled ? '' : `Enter ${field.label.toLowerCase()}…`}
          className={`${base} resize-none`}/>
      ) : (
        <input type={isNum ? 'number' : 'text'}
          value={value || ''} onChange={e => onChange(field.key, e.target.value)}
          disabled={disabled} min={isNum ? '0' : undefined}
          placeholder={disabled ? '—' : (isNum ? '0' : `Enter ${field.label.toLowerCase()}…`)}
          className={`${base} ${isNum ? 'text-right font-semibold text-lg' : ''}`}/>
      )}
    </div>
  );
}

// ── Download Panel ────────────────────────────────────────────────────────────
function DownloadPanel({ reportType }) {
  const [open, setOpen]         = useState(false);
  const [period, setPeriod]     = useState('monthly');
  const [month, setMonth]       = useState(new Date().toISOString().slice(0,7));
  const [weekStart, setWkStart] = useState(() => {
    const d = new Date(); d.setDate(d.getDate()-d.getDay()+1); return d.toISOString().slice(0,10);
  });
  const [loading, setLoading] = useState(false);

  const MONTHS = Array.from({length:12},(_,i)=>{
    const d = new Date(new Date().getFullYear(), new Date().getMonth()-i, 1);
    return { value:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label:fmtMonth(d.toISOString().slice(0,7)) };
  });

  const dl = async () => {
    setLoading(true);
    try {
      const p = { period, report_type: reportType };
      if (period==='weekly')  p.week_start = weekStart;
      if (period==='monthly') p.month = month;
      const res = await reportsApi.download(p);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `my_report_${period==='weekly' ? weekStart : month}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o=>!o)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
          <Download size={15} className="text-white"/>
        </div>
        <div className="flex-1 text-left">
          <p className="font-bold text-gray-800 dark:text-white text-sm">Download My Reports</p>
          <p className="text-xs text-gray-400 mt-0.5">Export submitted data as Excel</p>
        </div>
        {open ? <ChevronUp size={15} className="text-gray-400"/> : <ChevronDown size={15} className="text-gray-400"/>}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-50 dark:border-gray-800">
          <div className="mt-4 flex flex-wrap gap-3 items-end">
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              {[['monthly','Monthly'],['weekly','Weekly']].map(([v,l]) => (
                <button key={v} onClick={() => setPeriod(v)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${period===v ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{l}</button>
              ))}
            </div>
            {period==='monthly' ? (
              <select value={month} onChange={e => setMonth(e.target.value)}
                className="flex-1 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none">
                {MONTHS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input type="date" value={weekStart} onChange={e => setWkStart(e.target.value)} max={todayISO()}
                className="flex-1 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none"/>
            )}
            <button onClick={dl} disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-60 transition-colors">
              {loading ? <Loader2 size={13} className="animate-spin"/> : <Download size={13}/>}
              {loading ? 'Generating…' : 'Download'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Upload Panel ──────────────────────────────────────────────────────────────
function UploadPanel({ reportType, schemaLabel, onDone }) {
  const [open, setOpen]       = useState(false);
  const [dlLoad, setDlLoad]   = useState(false);
  const [uploading, setUpl]   = useState(false);
  const [result, setResult]   = useState(null);
  const fileRef = useRef();

  const dlTemplate = async () => {
    setDlLoad(true);
    try {
      const res = await reportsApi.template(reportType);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `${schemaLabel.replace(/\s+/g,'_').toLowerCase()}_template.xlsx`;
      a.click(); URL.revokeObjectURL(url);
    } catch {}
    setDlLoad(false);
  };

  const upload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUpl(true); setResult(null);
    try {
      const res = await reportsApi.importData(reportType, file);
      setResult({ ok:true, ...res.data }); onDone?.();
    } catch (err) {
      setResult({ ok:false, msg: err.response?.data?.detail || 'Upload failed.' });
    }
    setUpl(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o=>!o)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
          <Upload size={15} className="text-white"/>
        </div>
        <div className="flex-1 text-left">
          <p className="font-bold text-gray-800 dark:text-white text-sm">Import Historical Data</p>
          <p className="text-xs text-gray-400 mt-0.5">Download template → fill past data → upload</p>
        </div>
        {open ? <ChevronUp size={15} className="text-gray-400"/> : <ChevronDown size={15} className="text-gray-400"/>}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-50 dark:border-gray-800">
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
              <p className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-2">Step 1 — Template</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Download blank Excel, fill your data by date, then upload.</p>
              <button onClick={dlTemplate} disabled={dlLoad}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-60">
                {dlLoad ? <RefreshCw size={11} className="animate-spin"/> : <Download size={11}/>}
                Get Template
              </button>
            </div>
            <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-100 dark:border-violet-800">
              <p className="text-xs font-black text-violet-700 dark:text-violet-400 uppercase tracking-wide mb-2">Step 2 — Upload</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Upload filled .xlsx or .csv — existing entries are updated.</p>
              <label className="flex items-center gap-2 px-3 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 cursor-pointer">
                {uploading ? <RefreshCw size={11} className="animate-spin"/> : <Upload size={11}/>}
                {uploading ? 'Uploading…' : 'Upload File'}
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={upload} className="hidden"/>
              </label>
            </div>
          </div>
          {result && (
            <div className={`mt-3 p-3 rounded-xl text-xs font-medium ${result.ok
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'}`}>
              {result.ok ? `✓ ${result.message}` : result.msg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function StaffReports() {
  const confirm = useConfirm();
  const { user } = useAuth();

  const [schema,       setSchema]       = useState(null);
  const [selType,      setSelType]      = useState('');
  const [selDate,      setSelDate]      = useState(todayISO());
  const [report,       setReport]       = useState(null);
  const [formData,     setFormData]     = useState({});
  const [history,      setHistory]      = useState([]);
  const [loadingSchema,setLoadingSchema]= useState(true);
  const [loadingReport,setLoadingReport]= useState(false);
  const [saving,       setSaving]       = useState(false);
  const [autoSaving,   setAutoSaving]   = useState(false);
  const [saveStatus,   setSaveStatus]   = useState(null); // null|'saving'|'saved'|'error'
  const [submitting,   setSubmitting]   = useState(false);
  const [showHistory,  setShowHistory]  = useState(false);

  const autoSaveTimer = useRef();
  const saveStatusTimer = useRef();

  // ── Schema load ───────────────────────────────────────────────────────────
  useEffect(() => {
    reportsApi.schema().then(r => {
      setSchema(r.data);
      const types  = Object.keys(r.data);
      const rawRt  = user?.report_type || '';
      const mapped = LEGACY_MAP[rawRt] || rawRt;
      const def    = mapped && r.data[mapped] ? mapped : types[0];
      setSelType(def || '');
    }).finally(() => setLoadingSchema(false));
  }, [user?.report_type]);

  // ── Load report for type + date ───────────────────────────────────────────
  const loadReport = useCallback(async (type, date) => {
    if (!type) return;
    setLoadingReport(true);
    clearTimeout(autoSaveTimer.current);
    setSaveStatus(null);
    try {
      const [rptRes, histRes] = await Promise.all([
        reportsApi.list({ report_type: type, date }),
        reportsApi.list({ report_type: type }),
      ]);
      const rpts  = rptRes.data.results || rptRes.data || [];
      const found = rpts[0] || null;
      setReport(found);
      setFormData(found?.data || {});
      setHistory(histRes.data.results || histRes.data || []);
    } finally { setLoadingReport(false); }
  }, []);

  useEffect(() => { if (selType) loadReport(selType, selDate); }, [selType, selDate, loadReport]);

  const typeSchema = schema?.[selType];
  const isSubmitted = report?.status === 'submitted' || report?.status === 'reviewed';
  const meta = REPORT_META[selType] || REPORT_META.sm_bdm;
  const IconComp = meta.icon;

  // ── Field change → auto-save draft ───────────────────────────────────────
  const handleField = (key, val) => {
    const next = { ...formData, [key]: val };
    setFormData(next);
    if (isSubmitted) return;

    clearTimeout(autoSaveTimer.current);
    setSaveStatus('saving');
    autoSaveTimer.current = setTimeout(() => autoSaveDraft(next), 800);
  };

  const autoSaveDraft = async (data) => {
    if (!typeSchema || isSubmitted) return;
    setAutoSaving(true);
    try {
      const payload = { report_date: selDate, report_type: selType, data, status: 'draft' };
      let saved;
      if (report?.id) {
        const r = await reportsApi.update(report.id, payload);
        saved = r.data;
      } else {
        const r = await reportsApi.save(payload);
        saved = r.data;
      }
      setReport(saved);
      setSaveStatus('saved');
      clearTimeout(saveStatusTimer.current);
      saveStatusTimer.current = setTimeout(() => setSaveStatus(null), 2500);
    } catch {
      setSaveStatus('error');
    } finally { setAutoSaving(false); }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!typeSchema) return;
    const ok = await confirm({
      title: 'Submit Report?',
      message: 'Once submitted, the report is locked and sent to your admin for review.',
      variant: 'confirm',
      confirmText: 'Submit Report',
    });
    if (!ok) return;
    setSubmitting(true);
    clearTimeout(autoSaveTimer.current);
    try {
      const payload = { report_date: selDate, report_type: selType, data: formData, status: 'submitted' };
      let saved;
      if (report?.id) {
        const r = await reportsApi.update(report.id, payload);
        saved = r.data;
      } else {
        const r = await reportsApi.save(payload);
        saved = r.data;
      }
      setReport(saved);
      setFormData(saved.data || {});
      setSaveStatus(null);
      reportsApi.list({ report_type: selType }).then(r => setHistory(r.data.results || r.data || []));
    } catch (e) {
      alert(e.response?.data?.detail || 'Submit failed. Please try again.');
    } finally { setSubmitting(false); }
  };

  const openHistory = (r) => { setSelDate(r.report_date); window.scrollTo({top:0,behavior:'smooth'}); };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loadingSchema) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 size={28} className="animate-spin text-blue-500 mx-auto mb-3"/>
          <p className="text-sm text-gray-400 font-medium">Loading report…</p>
        </div>
      </div>
    );
  }

  if (!schema || !selType) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-center">
        <div>
          <FileText size={40} className="text-gray-300 mx-auto mb-3"/>
          <p className="text-gray-500 font-semibold">No report assigned</p>
          <p className="text-sm text-gray-400 mt-1">Contact your admin to assign a report type to your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-10">

      {/* ── Report Type selector (tabs) ── */}
      {schema && Object.keys(schema).length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-5 scrollbar-hide">
          {Object.entries(schema).map(([key, s]) => {
            const m = REPORT_META[key] || REPORT_META.sm_bdm;
            const Icon = m.icon;
            const active = key === selType;
            return (
              <button key={key} onClick={() => setSelType(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  active
                    ? 'text-white shadow-md'
                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                }`}
                style={active ? { background: `linear-gradient(135deg, ${m.color}, ${m.color}dd)` } : {}}>
                <Icon size={13}/>{s.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Report Card ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">

        {/* Header */}
        <div className={`px-5 py-4 bg-gradient-to-r ${meta.gradient} relative`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <IconComp size={18} className="text-white"/>
              </div>
              <div>
                <p className="font-black text-white text-base leading-tight">{typeSchema?.label}</p>
                <p className="text-white/70 text-xs mt-0.5 font-medium">{fmtLong(selDate)}</p>
              </div>
            </div>
            {report && <StatusBadge status={report.status}/>}
          </div>

          {/* Date navigation */}
          <div className="mt-4 flex items-center justify-between bg-white/10 rounded-xl px-3 py-2">
            <DateNav value={selDate} onChange={setSelDate}/>
            {/* Save status indicator */}
            <div className="text-[11px] font-semibold flex items-center gap-1.5 text-white/70">
              {saveStatus === 'saving' && <><RefreshCw size={10} className="animate-spin"/>Saving…</>}
              {saveStatus === 'saved'  && <><Check size={10} className="text-emerald-300"/>Saved</>}
              {saveStatus === 'error'  && <><AlertCircle size={10} className="text-red-300"/>Save failed</>}
              {selDate === todayISO() && !saveStatus && (
                <span className="bg-white/20 text-white px-2 py-0.5 rounded-md text-[10px] font-bold">TODAY</span>
              )}
            </div>
          </div>
        </div>

        {/* Form body */}
        <div className="p-5">
          {loadingReport ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={22} className="animate-spin text-blue-500"/>
            </div>
          ) : typeSchema ? (
            <>
              {/* Submitted banner */}
              {isSubmitted && (
                <div className="mb-5 flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                  <Send size={16} className="text-blue-500 shrink-0 mt-0.5"/>
                  <div>
                    <p className="text-sm font-bold text-blue-700 dark:text-blue-400">Report Submitted</p>
                    <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">
                      This report has been submitted and is now locked. Your admin has been notified.
                    </p>
                  </div>
                </div>
              )}

              {/* Fields */}
              <div className={`grid gap-4 ${
                typeSchema.fields.some(f => f.type === 'number') && typeSchema.fields.some(f => f.type !== 'number')
                  ? 'grid-cols-1'
                  : typeSchema.fields.length <= 4
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1'
              }`}>
                {typeSchema.fields.map(field => (
                  <ReportField
                    key={field.key}
                    field={field}
                    value={formData[field.key]}
                    onChange={handleField}
                    disabled={isSubmitted}
                  />
                ))}
              </div>

              {/* Number fields get 2-col layout on sm+ */}
              {/* Action buttons */}
              {!isSubmitted && (
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || autoSaving}
                    className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black text-white shadow-lg transition-all active:scale-[.98] disabled:opacity-60"
                    style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}dd)` }}>
                    {submitting
                      ? <><Loader2 size={15} className="animate-spin"/>Submitting…</>
                      : <><Send size={15}/>Submit Report</>}
                  </button>
                </div>
              )}

              {report?.admin_notes && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Admin Notes</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{report.admin_notes}</p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {/* ── History ── */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <button onClick={() => setShowHistory(h=>!h)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                <Clock size={15} className="text-gray-500"/>
              </div>
              <div className="text-left">
                <p className="font-bold text-gray-800 dark:text-white text-sm">Submission History</p>
                <p className="text-xs text-gray-400">{history.length} record{history.length!==1?'s':''}</p>
              </div>
            </div>
            {showHistory ? <ChevronUp size={15} className="text-gray-400"/> : <ChevronDown size={15} className="text-gray-400"/>}
          </button>
          {showHistory && (
            <div className="border-t border-gray-50 dark:border-gray-800">
              {history.slice(0,20).map((r, i) => (
                <div key={r.id}
                  className={`flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors cursor-pointer ${
                    i < history.length-1 ? 'border-b border-gray-50 dark:border-gray-800' : ''
                  }`}
                  onClick={() => openHistory(r)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      r.status==='reviewed' ? 'bg-emerald-500' :
                      r.status==='submitted' ? 'bg-blue-500' : 'bg-amber-400'
                    }`}/>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{fmtShort(r.report_date)}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                        {Object.keys(r.data || {}).length} field{Object.keys(r.data||{}).length!==1?'s':''} filled
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={r.status}/>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Download + Upload panels ── */}
      {typeSchema && (
        <>
          <DownloadPanel reportType={selType}/>
          <UploadPanel
            reportType={selType}
            schemaLabel={typeSchema.label}
            onDone={() => loadReport(selType, selDate)}
          />
        </>
      )}
    </div>
  );
}
