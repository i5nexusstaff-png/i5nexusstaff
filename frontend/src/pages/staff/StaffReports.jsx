import { useCallback, useEffect, useRef, useState } from 'react';
import { useConfirm } from '../../components/ConfirmDialog';
import {
  FileText, Save, Send, CheckCircle, Clock, Edit3, AlertCircle,
  RefreshCw, Calendar, ChevronLeft, ChevronRight, Upload, Download,
  BarChart2, Users, Phone, Target, TrendingUp, Megaphone, Briefcase,
  X, ChevronDown, ChevronUp,
} from 'lucide-react';
import { reportsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (iso) =>
  new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

const todayISO = () => new Date().toISOString().slice(0, 10);

const REPORT_ICONS = {
  sales_head:      TrendingUp,
  sales_manager:   BarChart2,
  vp:              Target,
  telecallers_head: Phone,
  marketing:       Megaphone,
  bdm:             Briefcase,
  telecallers:     Users,
};

const REPORT_COLORS = {
  sales_head:       { from: '#1E3A5F', to: '#2D6A4F', accent: '#1E3A5F' },
  sales_manager:    { from: '#1a1a2e', to: '#16213e', accent: '#0f3460' },
  vp:               { from: '#4A0072', to: '#7B1FA2', accent: '#4A0072' },
  telecallers_head: { from: '#1B4332', to: '#2D6A4F', accent: '#1B4332' },
  marketing:        { from: '#7F1D1D', to: '#991B1B', accent: '#7F1D1D' },
  bdm:              { from: '#1e3a5f', to: '#1d4ed8', accent: '#1e3a5f' },
  telecallers:      { from: '#14532D', to: '#166534', accent: '#14532D' },
};

const STATUS_CFG = {
  draft:     { label: 'Draft',     icon: Edit3,       cls: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' },
  submitted: { label: 'Submitted', icon: Send,        cls: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' },
  reviewed:  { label: 'Reviewed',  icon: CheckCircle, cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' },
};

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
  const base = 'w-full px-3.5 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800/60 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all disabled:opacity-60 disabled:cursor-not-allowed placeholder-gray-300 dark:placeholder-gray-600';
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
        {field.label}
      </label>
      {field.type === 'textarea' ? (
        <textarea value={value || ''} onChange={e => onChange(field.key, e.target.value)}
          disabled={disabled} rows={3} placeholder={disabled ? '' : `Enter ${field.label.toLowerCase()}…`}
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
    const d = new Date(value + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    onChange(d.toISOString().slice(0, 10));
  };
  const next = () => {
    const d = new Date(value + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    const t = todayISO();
    if (d.toISOString().slice(0, 10) <= t) onChange(d.toISOString().slice(0, 10));
  };
  const isToday = value === todayISO();
  return (
    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2 border border-gray-200 dark:border-gray-700">
      <button onClick={prev} className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
        <ChevronLeft size={15} className="text-gray-500"/>
      </button>
      <input type="date" value={value}
        max={todayISO()}
        onChange={e => e.target.value && onChange(e.target.value)}
        className="bg-transparent text-sm font-bold text-gray-700 dark:text-white outline-none cursor-pointer"/>
      <button onClick={next} disabled={isToday}
        className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-30">
        <ChevronRight size={15} className="text-gray-500"/>
      </button>
      {!isToday && (
        <button onClick={() => onChange(todayISO())}
          className="ml-1 text-xs px-2.5 py-1 bg-accent text-white rounded-lg font-bold hover:opacity-90 transition-all">
          Today
        </button>
      )}
    </div>
  );
}

// ── Import Section ─────────────────────────────────────────────────────────────
function ImportSection({ reportType, schemaLabel, onDone }) {
  const [open,       setOpen]       = useState(false);
  const [importing,  setImporting]  = useState(false);
  const [dlLoading,  setDlLoading]  = useState(false);
  const [result,     setResult]     = useState(null);
  const fileRef = useRef();

  const downloadTemplate = async () => {
    setDlLoading(true);
    try {
      const res = await reportsApi.template(reportType);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `${schemaLabel.replace(/\s+/g, '_').toLowerCase()}_template.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* silent */ }
    setDlLoading(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setResult(null);
    try {
      const res = await reportsApi.importData(reportType, file);
      setResult({ ok: true, ...res.data });
      onDone?.();
    } catch (err) {
      setResult({ ok: false, msg: err.response?.data?.detail || 'Upload failed.' });
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
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
            {/* Step 1 */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
              <p className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-2">Step 1 — Download Template</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Download the Excel template for <strong>{schemaLabel}</strong>, fill in your historical data by date, then upload it.
              </p>
              <button onClick={downloadTemplate} disabled={dlLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-60">
                {dlLoading ? <RefreshCw size={12} className="animate-spin"/> : <Download size={12}/>}
                Download Template
              </button>
            </div>

            {/* Step 2 */}
            <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-100 dark:border-violet-800">
              <p className="text-xs font-black text-violet-700 dark:text-violet-400 uppercase tracking-wide mb-2">Step 2 — Upload Filled File</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Upload your filled .xlsx or .csv. Existing entries are updated; new dates are created.
              </p>
              <label className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 transition-colors cursor-pointer">
                {importing ? <RefreshCw size={12} className="animate-spin"/> : <Upload size={12}/>}
                {importing ? 'Importing…' : 'Upload File'}
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleUpload} className="hidden"/>
              </label>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className={`mt-4 p-4 rounded-xl border text-sm ${result.ok
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'}`}>
              {result.ok ? (
                <>
                  <p className="font-bold mb-1">✓ {result.message}</p>
                  {result.errors?.length > 0 && (
                    <ul className="text-xs mt-2 space-y-0.5">
                      {result.errors.map((e, i) => <li key={i} className="opacity-70">• {e}</li>)}
                    </ul>
                  )}
                </>
              ) : (
                <p>{result.msg}</p>
              )}
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
  const [selType,      setSelType]      = useState('');        // chosen report type
  const [selDate,      setSelDate]      = useState(todayISO());
  const [report,       setReport]       = useState(null);
  const [formData,     setFormData]     = useState({});
  const [history,      setHistory]      = useState([]);
  const [saving,       setSaving]       = useState(false);
  const [savingAs,     setSavingAs]     = useState(null);
  const [toast,        setToast]        = useState(null);
  const [loadingSchema, setLoadingSchema] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const toastTimer = useRef();

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = (msg, ok = true) => {
    clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  // ── Load schema once ───────────────────────────────────────────────────────
  useEffect(() => {
    reportsApi.schema().then(r => {
      setSchema(r.data);
      // default to user's assigned report type, or first available
      const types = Object.keys(r.data);
      const def   = user?.report_type && r.data[user.report_type] ? user.report_type : types[0];
      setSelType(def || '');
    }).finally(() => setLoadingSchema(false));
  }, [user?.report_type]);

  // ── Load report for selType + selDate ─────────────────────────────────────
  const loadReport = useCallback(async (type, date) => {
    if (!type) return;
    setLoadingReport(true);
    try {
      const [rptRes, histRes] = await Promise.all([
        reportsApi.list({ report_type: type, date }),
        reportsApi.list({ report_type: type }),
      ]);
      const rpts = rptRes.data.results || rptRes.data || [];
      const found = rpts[0] || null;
      setReport(found);
      setFormData(found?.data || {});

      const all = histRes.data.results || histRes.data || [];
      setHistory(all);
    } finally {
      setLoadingReport(false);
    }
  }, []);

  useEffect(() => {
    if (selType) loadReport(selType, selDate);
  }, [selType, selDate, loadReport]);

  const typeSchema = schema?.[selType];
  const isToday    = selDate === todayISO();
  const isLocked   = report?.status === 'submitted' || report?.status === 'reviewed';
  const canEdit    = !isLocked;

  // ── Field change ───────────────────────────────────────────────────────────
  const handleField = (key, val) => setFormData(f => ({ ...f, [key]: val }));

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async (newStatus) => {
    if (!typeSchema) return;
    if (newStatus === 'submitted') {
      const ok = await confirm({
        title: 'Submit report?',
        message: 'Once submitted, the report will be locked and sent to your admin for review.',
        variant: 'confirm',
        confirmText: 'Submit Report',
      });
      if (!ok) return;
    }
    setSaving(true); setSavingAs(newStatus);
    try {
      const payload = { report_date: selDate, report_type: selType, data: formData, status: newStatus };
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
      showToast(newStatus === 'submitted' ? '✓ Report submitted!' : '✓ Draft saved.');
      // Refresh history
      reportsApi.list({ report_type: selType }).then(r => setHistory(r.data.results || r.data || []));
    } catch (e) {
      showToast(e.response?.data?.detail || 'Save failed.', false);
    } finally {
      setSaving(false); setSavingAs(null);
    }
  };

  // ── Open past entry ────────────────────────────────────────────────────────
  const openEntry = (r) => {
    setSelDate(r.report_date);
    setSelType(r.report_type);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold ${toast.ok ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'}`}>
          {toast.ok ? <CheckCircle size={15}/> : <AlertCircle size={15}/>}
          {toast.msg}
        </div>
      )}

      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Daily Reports</h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Select a report type, fill in your data, and submit</p>
      </div>

      {loadingSchema ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="animate-spin text-accent"/>
        </div>
      ) : (
        <>
          {/* ── Report Type Selector ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {schema && Object.entries(schema).map(([key, s]) => {
              const Icon   = REPORT_ICONS[key] || FileText;
              const colors = REPORT_COLORS[key] || REPORT_COLORS.sales_head;
              const active = key === selType;
              return (
                <button key={key} onClick={() => setSelType(key)}
                  className={`relative group flex flex-col items-start p-4 rounded-2xl border-2 transition-all text-left
                    ${active
                      ? 'border-transparent shadow-lg scale-[1.02]'
                      : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-md'
                    }`}
                  style={active ? { background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` } : {}}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-all
                    ${active ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'}`}>
                    <Icon size={16} className={active ? 'text-white' : 'text-gray-500 dark:text-gray-400'}/>
                  </div>
                  <p className={`text-xs font-black leading-tight ${active ? 'text-white' : 'text-gray-700 dark:text-white'}`}>
                    {s.label}
                  </p>
                  {active && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-white/70 rounded-full"/>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── Date Nav + Report Form ── */}
          {typeSchema && (
            <>
              {/* Date selector row */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400"/>
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Reporting Date</span>
                </div>
                <DateNav value={selDate} onChange={setSelDate}/>
              </div>

              {/* Form card */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                {/* Card header */}
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
                    {report && <StatusBadge status={report.status}/>}
                    {loadingReport && <RefreshCw size={14} className="animate-spin text-accent"/>}
                  </div>
                </div>

                <div className="p-6">
                  {/* Admin notes */}
                  {report?.admin_notes && (
                    <div className="mb-5 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">Admin Notes</p>
                      <p className="text-sm text-blue-800 dark:text-blue-200">{report.admin_notes}</p>
                    </div>
                  )}

                  {/* Submitted lock notice */}
                  {isLocked && (
                    <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400 text-sm font-medium">
                      <CheckCircle size={16}/>
                      {report?.status === 'reviewed' ? 'This report has been reviewed by admin.' : 'Report submitted — read-only.'}
                    </div>
                  )}

                  {/* Empty state */}
                  {!report && !loadingReport && (
                    <div className="mb-5 p-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400 text-center">
                      No report for this date yet. Fill in the fields below to create one.
                    </div>
                  )}

                  {/* Fields grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {typeSchema.fields.map(f => (
                      <div key={f.key} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                        <ReportField field={f} value={formData[f.key]} onChange={handleField} disabled={!canEdit}/>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  {canEdit && (
                    <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
                      <button onClick={() => handleSave('draft')} disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 dark:border-gray-600 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-60">
                        {savingAs === 'draft' && saving ? <RefreshCw size={14} className="animate-spin"/> : <Save size={14}/>}
                        Save Draft
                      </button>
                      <button onClick={() => handleSave('submitted')} disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1E3A5F] to-[#2563eb] text-white rounded-xl text-sm font-bold shadow-md shadow-blue-900/20 hover:opacity-90 transition-all disabled:opacity-60">
                        {savingAs === 'submitted' && saving ? <RefreshCw size={14} className="animate-spin"/> : <Send size={14}/>}
                        Submit Report
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Import Historical Data ── */}
              <ImportSection
                reportType={selType}
                schemaLabel={typeSchema.label}
                onDone={() => reportsApi.list({ report_type: selType }).then(r => setHistory(r.data.results || r.data || []))}
              />
            </>
          )}

          {/* ── History Table ── */}
          {history.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                <Clock size={14} className="text-gray-400"/>
                <p className="font-bold text-gray-700 dark:text-white text-sm">Submission History</p>
                <span className="ml-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full font-black">{history.length}</span>
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
                    {history.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => openEntry(r)}>
                        <td className="py-3 px-4 font-semibold text-gray-800 dark:text-white whitespace-nowrap">{fmtDate(r.report_date)}</td>
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">{r.report_type_label}</td>
                        <td className="py-3 px-4"><StatusBadge status={r.status}/></td>
                        <td className="py-3 px-4 text-gray-400 dark:text-gray-500 text-xs whitespace-nowrap">{fmtDate(r.updated_at)}</td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-semibold text-accent hover:text-amber-600 dark:text-amber-400">View</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
