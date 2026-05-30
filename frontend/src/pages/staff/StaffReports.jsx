import { useCallback, useEffect, useRef, useState } from 'react';
import { useConfirm } from '../../components/ConfirmDialog';
import {
  FileText, Send, CheckCircle, Edit3, AlertCircle,
  Calendar, ChevronLeft, ChevronRight, Upload, Download,
  BarChart2, Phone, TrendingUp, Megaphone,
  ChevronDown, ChevronUp, Loader2, Check, RefreshCw,
  TableProperties, ClipboardEdit,
} from 'lucide-react';
import { reportsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// ── Helpers ───────────────────────────────────────────────────────────────────
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtLong  = iso => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN',
  { weekday:'long', day:'numeric', month:'long', year:'numeric' });
const fmtShort = iso => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN',
  { day:'2-digit', month:'short', year:'numeric' });
const fmtMonthLabel = iso => new Date(iso + '-01').toLocaleDateString('en-IN',
  { month:'long', year:'numeric' });

const LEGACY_MAP = {
  sales_manager:'sm_bdm', bdm:'sm_bdm',
  sales_head:'vp_sales_head', vp:'vp_sales_head',
  telecallers_head:'telecallers',
};

const REPORT_META = {
  sm_bdm:        { icon: BarChart2,  color:'#1E3A5F', light:'#EEF2FF' },
  vp_sales_head: { icon: TrendingUp, color:'#4A0072', light:'#F5F3FF' },
  telecallers:   { icon: Phone,      color:'#14532D', light:'#ECFDF5' },
  marketing:     { icon: Megaphone,  color:'#7F1D1D', light:'#FFF1F2' },
};

const STATUS_CFG = {
  draft:     { label:'Draft',     icon:Edit3,       cls:'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800' },
  submitted: { label:'Submitted', icon:Send,        cls:'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
  reviewed:  { label:'Reviewed',  icon:CheckCircle, cls:'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' },
};

function StatusBadge({ status, size = 'sm' }) {
  const c = STATUS_CFG[status] || STATUS_CFG.draft;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold border ${c.cls} ${size==='xs' ? 'text-[10px]' : 'text-xs'}`}>
      <Icon size={size==='xs'?9:11}/>{c.label}
    </span>
  );
}

// ── Date nav ──────────────────────────────────────────────────────────────────
function DateNav({ value, onChange }) {
  const go = delta => {
    const d = new Date(value + 'T00:00:00'); d.setDate(d.getDate() + delta);
    const s = d.toISOString().slice(0,10);
    if (s <= todayISO()) onChange(s);
  };
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => go(-1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 text-white/80 transition-colors">
        <ChevronLeft size={16}/>
      </button>
      <input type="date" value={value} max={todayISO()}
        onChange={e => e.target.value && onChange(e.target.value)}
        className="text-sm font-bold text-white bg-transparent border-0 outline-none cursor-pointer w-36 text-center"/>
      <button onClick={() => go(1)} disabled={value >= todayISO()}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 text-white/80 disabled:opacity-30 transition-colors">
        <ChevronRight size={16}/>
      </button>
    </div>
  );
}

// ── Single field ──────────────────────────────────────────────────────────────
function ReportField({ field, value, onChange, disabled, color }) {
  const isNum = field.type === 'number';
  const isTxt = field.type === 'textarea';
  const ring  = `focus:ring-4 focus:ring-[${color}20] focus:border-[${color}]`;
  const base  = `w-full rounded-xl border text-sm transition-all outline-none px-4 py-3 ${
    disabled
      ? 'bg-gray-50 dark:bg-gray-800 border-transparent text-gray-500 dark:text-gray-400 cursor-default'
      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10'
  }`;
  return (
    <div className="group">
      <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 group-focus-within:text-blue-500 transition-colors">
        {field.label}
      </label>
      {isTxt ? (
        <textarea value={value||''} onChange={e => onChange(field.key, e.target.value)}
          disabled={disabled} rows={2} placeholder={disabled?'':field.label+'…'}
          className={`${base} resize-none`}/>
      ) : (
        <input type={isNum?'number':'text'}
          value={value||''} onChange={e => onChange(field.key, e.target.value)}
          disabled={disabled} min={isNum?'0':undefined}
          placeholder={disabled?'—':(isNum?'0':field.label+'…')}
          className={`${base} ${isNum?'text-right font-bold text-base':'text-left'}`}/>
      )}
    </div>
  );
}

// ── Data Table (Excel-like view of all submissions) ───────────────────────────
function DataTable({ history, fields, onRowClick, selDate }) {
  const MONTHS_OPT = Array.from({length:12},(_,i)=>{
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-i);
    return {value:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`, label:fmtMonthLabel(d.toISOString().slice(0,7))};
  });
  const [monthFilt, setMonthFilt] = useState(MONTHS_OPT[0].value);
  const [periodMode, setPeriodMode] = useState('monthly');
  const [weekStart, setWeekStart]  = useState(() => {
    const d=new Date(); d.setDate(d.getDate()-d.getDay()+1); return d.toISOString().slice(0,10);
  });

  const filtered = history.filter(r => {
    if (periodMode === 'monthly') return r.report_date.startsWith(monthFilt);
    // weekly
    const ws = new Date(weekStart+'T00:00:00');
    const we = new Date(ws); we.setDate(we.getDate()+6);
    const rd = new Date(r.report_date+'T00:00:00');
    return rd >= ws && rd <= we;
  });

  if (!fields || fields.length === 0) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {[['monthly','Monthly'],['weekly','Weekly']].map(([v,l])=>(
            <button key={v} onClick={()=>setPeriodMode(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${periodMode===v?'bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-white':'text-gray-500 dark:text-gray-400'}`}>{l}</button>
          ))}
        </div>
        {periodMode==='monthly'?(
          <select value={monthFilt} onChange={e=>setMonthFilt(e.target.value)}
            className="flex-1 min-w-[120px] border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none">
            {MONTHS_OPT.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ):(
          <input type="date" value={weekStart} onChange={e=>setWeekStart(e.target.value)}
            max={todayISO()}
            className="flex-1 min-w-[140px] border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none"/>
        )}
        <span className="text-[11px] text-gray-400 font-medium">{filtered.length} record{filtered.length!==1?'s':''}</span>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
          <TableProperties size={28} className="text-gray-300 dark:text-gray-600 mb-3"/>
          <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">No reports for this period</p>
          <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Fill the form and submit to see data here</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto rounded-xl border border-gray-100 dark:border-gray-700">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="text-left py-3 px-3 font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap min-w-[90px]">Date</th>
                {fields.map(f=>(
                  <th key={f.key} className="text-center py-3 px-3 font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap min-w-[80px]">
                    {f.label.split(' ').slice(0,3).join(' ')}
                  </th>
                ))}
                <th className="text-center py-3 px-3 font-black text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {filtered.sort((a,b)=>b.report_date.localeCompare(a.report_date)).map(r=>(
                <tr key={r.id}
                  onClick={()=>onRowClick(r)}
                  className={`cursor-pointer transition-colors hover:bg-blue-50/60 dark:hover:bg-blue-900/10 ${
                    r.report_date===selDate?'bg-blue-50 dark:bg-blue-900/20':''
                  }`}>
                  <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-gray-700 dark:text-gray-200">{fmtShort(r.report_date)}</td>
                  {fields.map(f=>{
                    const v = r.data?.[f.key];
                    const isNum = f.type==='number';
                    const isEmpty = v===undefined||v===null||v==='';
                    return (
                      <td key={f.key} className={`py-2.5 px-3 text-center ${
                        isEmpty ? 'text-gray-300 dark:text-gray-600' :
                        isNum ? 'font-bold text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-300'
                      }`}>
                        {isEmpty ? '—' : isNum ? Number(v).toLocaleString() : (String(v).length>20?String(v).slice(0,18)+'…':v)}
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-3 text-center"><StatusBadge status={r.status} size="xs"/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Download panel ────────────────────────────────────────────────────────────
function DownloadPanel({ reportType }) {
  const [open,setOpen]=useState(false);
  const [period,setPeriod]=useState('monthly');
  const [month,setMonth]=useState(new Date().toISOString().slice(0,7));
  const [weekStart,setWkStart]=useState(()=>{const d=new Date();d.setDate(d.getDate()-d.getDay()+1);return d.toISOString().slice(0,10);});
  const [loading,setLoading]=useState(false);
  const MONTHS=Array.from({length:12},(_,i)=>{const d=new Date(new Date().getFullYear(),new Date().getMonth()-i,1);return{value:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,label:fmtMonthLabel(d.toISOString().slice(0,7))};});
  const dl=async()=>{setLoading(true);try{const p={period,report_type:reportType};if(period==='weekly')p.week_start=weekStart;if(period==='monthly')p.month=month;const res=await reportsApi.download(p);const url=URL.createObjectURL(new Blob([res.data]));const a=document.createElement('a');a.href=url;a.download=`report_${period==='weekly'?weekStart:month}.xlsx`;a.click();URL.revokeObjectURL(url);}catch{}setLoading(false);};
  return(
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <button onClick={()=>setOpen(o=>!o)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shrink-0"><Download size={14} className="text-white"/></div>
        <div className="flex-1 text-left"><p className="font-bold text-gray-800 dark:text-white text-sm">Download Excel</p><p className="text-xs text-gray-400">Export submitted data</p></div>
        {open?<ChevronUp size={14} className="text-gray-400"/>:<ChevronDown size={14} className="text-gray-400"/>}
      </button>
      {open&&(<div className="px-4 pb-4 border-t border-gray-50 dark:border-gray-800"><div className="mt-3 flex flex-wrap gap-2 items-end">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">{[['monthly','Monthly'],['weekly','Weekly']].map(([v,l])=><button key={v} onClick={()=>setPeriod(v)} className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${period===v?'bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-white':'text-gray-500'}`}>{l}</button>)}</div>
        {period==='monthly'?<select value={month} onChange={e=>setMonth(e.target.value)} className="flex-1 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none">{MONTHS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>:<input type="date" value={weekStart} onChange={e=>setWkStart(e.target.value)} max={todayISO()} className="flex-1 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"/>}
        <button onClick={dl} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-60">{loading?<Loader2 size={11} className="animate-spin"/>:<Download size={11}/>}{loading?'Generating…':'Download'}</button>
      </div></div>)}
    </div>
  );
}

// ── Upload panel ──────────────────────────────────────────────────────────────
function UploadPanel({ reportType, schemaLabel, onDone }) {
  const [open,setOpen]=useState(false);
  const [dlLoad,setDlLoad]=useState(false);
  const [uploading,setUpl]=useState(false);
  const [result,setResult]=useState(null);
  const fileRef=useRef();
  const dlTemplate=async()=>{setDlLoad(true);try{const res=await reportsApi.template(reportType);const url=URL.createObjectURL(new Blob([res.data]));const a=document.createElement('a');a.href=url;a.download=`${schemaLabel.replace(/\s+/g,'_').toLowerCase()}_template.xlsx`;a.click();URL.revokeObjectURL(url);}catch{}setDlLoad(false);};
  const upload=async e=>{const file=e.target.files?.[0];if(!file)return;setUpl(true);setResult(null);try{const res=await reportsApi.importData(reportType,file);setResult({ok:true,...res.data});onDone?.();}catch(err){setResult({ok:false,msg:err.response?.data?.detail||'Upload failed.'});}setUpl(false);if(fileRef.current)fileRef.current.value='';};
  return(
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <button onClick={()=>setOpen(o=>!o)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
        <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center shrink-0"><Upload size={14} className="text-white"/></div>
        <div className="flex-1 text-left"><p className="font-bold text-gray-800 dark:text-white text-sm">Import from Excel</p><p className="text-xs text-gray-400">Upload filled template to update database</p></div>
        {open?<ChevronUp size={14} className="text-gray-400"/>:<ChevronDown size={14} className="text-gray-400"/>}
      </button>
      {open&&(<div className="px-4 pb-4 border-t border-gray-50 dark:border-gray-800"><div className="mt-3 grid sm:grid-cols-2 gap-3">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800"><p className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-1.5">Step 1 — Template</p><p className="text-xs text-gray-500 dark:text-gray-400 mb-2.5">Download blank Excel, fill your historical data.</p><button onClick={dlTemplate} disabled={dlLoad} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-60">{dlLoad?<RefreshCw size={10} className="animate-spin"/>:<Download size={10}/>}Get Template</button></div>
        <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-100 dark:border-violet-800"><p className="text-[10px] font-black text-violet-700 dark:text-violet-400 uppercase tracking-wide mb-1.5">Step 2 — Upload</p><p className="text-xs text-gray-500 dark:text-gray-400 mb-2.5">Upload filled .xlsx — existing entries are updated.</p><label className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 cursor-pointer">{uploading?<RefreshCw size={10} className="animate-spin"/>:<Upload size={10}/>}{uploading?'Uploading…':'Upload File'}<input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={upload} className="hidden"/></label></div>
      </div>{result&&<div className={`mt-2 p-2.5 rounded-lg text-xs font-medium ${result.ok?'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200':'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200'}`}>{result.ok?`✓ ${result.message}`:result.msg}</div>}</div>)}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function StaffReports() {
  const confirm    = useConfirm();
  const { user }   = useAuth();
  const [schema,        setSchema]        = useState(null);
  const [selType,       setSelType]       = useState('');
  const [selDate,       setSelDate]       = useState(todayISO());
  const [report,        setReport]        = useState(null);
  const [formData,      setFormData]      = useState({});
  const [history,       setHistory]       = useState([]);
  const [loadingSchema, setLoadingSchema] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [autoSaving,    setAutoSaving]    = useState(false);
  const [saveStatus,    setSaveStatus]    = useState(null);
  const [submitting,    setSubmitting]    = useState(false);
  const [mobileTab,     setMobileTab]     = useState('fill'); // 'fill' | 'view'

  const autoSaveTimer  = useRef();
  const saveStatusTimer= useRef();

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

  // ── Load report ───────────────────────────────────────────────────────────
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
      const found = (rptRes.data.results || rptRes.data || [])[0] || null;
      setReport(found);
      setFormData(found?.data || {});
      setHistory(histRes.data.results || histRes.data || []);
    } finally { setLoadingReport(false); }
  }, []);

  useEffect(() => { if (selType) loadReport(selType, selDate); }, [selType, selDate, loadReport]);

  const typeSchema  = schema?.[selType];
  const isSubmitted = report?.status === 'submitted' || report?.status === 'reviewed';
  const meta        = REPORT_META[selType] || REPORT_META.sm_bdm;
  const IconComp    = meta.icon;

  // ── Auto-save ─────────────────────────────────────────────────────────────
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
      const res = report?.id
        ? await reportsApi.update(report.id, payload)
        : await reportsApi.save(payload);
      setReport(res.data);
      setSaveStatus('saved');
      clearTimeout(saveStatusTimer.current);
      saveStatusTimer.current = setTimeout(() => setSaveStatus(null), 2500);
      // Refresh history silently
      reportsApi.list({ report_type: selType }).then(r => setHistory(r.data.results || r.data || []));
    } catch { setSaveStatus('error'); }
    finally { setAutoSaving(false); }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!typeSchema) return;
    const ok = await confirm({
      title: 'Submit Report?',
      message: 'Once submitted, the report is locked and sent to your admin for review.',
      variant: 'confirm', confirmText: 'Submit Report',
    });
    if (!ok) return;
    setSubmitting(true);
    clearTimeout(autoSaveTimer.current);
    try {
      const payload = { report_date: selDate, report_type: selType, data: formData, status: 'submitted' };
      const res = report?.id
        ? await reportsApi.update(report.id, payload)
        : await reportsApi.save(payload);
      setReport(res.data);
      setFormData(res.data.data || {});
      setSaveStatus(null);
      reportsApi.list({ report_type: selType }).then(r => setHistory(r.data.results || r.data || []));
    } catch (e) {
      alert(e.response?.data?.detail || 'Submit failed.');
    } finally { setSubmitting(false); }
  };

  if (loadingSchema) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 size={28} className="animate-spin text-blue-500"/>
    </div>
  );
  if (!schema || !selType) return (
    <div className="flex items-center justify-center min-h-[60vh] text-center">
      <div><FileText size={40} className="text-gray-300 mx-auto mb-3"/>
        <p className="text-gray-500 font-semibold">No report type assigned</p>
        <p className="text-sm text-gray-400 mt-1">Ask your admin to assign a report type to your profile.</p>
      </div>
    </div>
  );

  // ── FILL PANEL ─────────────────────────────────────────────────────────────
  const FillPanel = () => (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-full">
      {/* Gradient header */}
      <div style={{ background:`linear-gradient(135deg, ${meta.color}, ${meta.color}cc)` }} className="px-5 py-4 flex-shrink-0">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <IconComp size={18} className="text-white"/>
            </div>
            <div>
              <p className="font-black text-white leading-tight">{typeSchema?.label}</p>
              <p className="text-white/60 text-xs mt-0.5">Daily Report</p>
            </div>
          </div>
          {report && <StatusBadge status={report.status}/>}
        </div>
        {/* Date nav + save indicator */}
        <div className="flex items-center justify-between bg-black/10 rounded-xl px-3 py-2">
          <DateNav value={selDate} onChange={setSelDate}/>
          <div className="text-[11px] font-semibold text-white/70 flex items-center gap-1">
            {saveStatus==='saving' && <><RefreshCw size={10} className="animate-spin"/>Saving…</>}
            {saveStatus==='saved'  && <><Check size={10} className="text-emerald-300"/>Saved</>}
            {saveStatus==='error'  && <><AlertCircle size={10} className="text-red-300"/>Error</>}
            {!saveStatus && selDate===todayISO() && <span className="bg-white/20 text-white px-2 py-0.5 rounded-md text-[10px] font-black">TODAY</span>}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto p-5">
        {loadingReport ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-blue-500"/></div>
        ) : (
          <>
            {isSubmitted && (
              <div className="mb-4 flex items-start gap-3 p-3.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                <Send size={14} className="text-blue-500 shrink-0 mt-0.5"/>
                <div>
                  <p className="text-sm font-bold text-blue-700 dark:text-blue-400">Report Submitted & Locked</p>
                  <p className="text-xs text-blue-600/70 dark:text-blue-400/60 mt-0.5">This report has been sent to your admin. Click the date to view or fill other days.</p>
                </div>
              </div>
            )}
            {/* 2-col for pure-number reports, 1-col for mixed */}
            <div className={`grid gap-3.5 ${
              typeSchema?.fields?.every(f=>f.type==='number') ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
            }`}>
              {typeSchema?.fields?.map(field => (
                <ReportField key={field.key} field={field}
                  value={formData[field.key]} onChange={handleField}
                  disabled={isSubmitted} color={meta.color}/>
              ))}
            </div>
            {!isSubmitted && (
              <button onClick={handleSubmit} disabled={submitting||autoSaving}
                className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black text-white shadow-lg transition-all active:scale-[.98] disabled:opacity-60"
                style={{ background:`linear-gradient(135deg, ${meta.color}, ${meta.color}cc)` }}>
                {submitting?<><Loader2 size={15} className="animate-spin"/>Submitting…</>:<><Send size={15}/>Submit Report</>}
              </button>
            )}
            {report?.admin_notes && (
              <div className="mt-4 p-3.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-1">Admin Notes</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{report.admin_notes}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // ── VIEW PANEL ─────────────────────────────────────────────────────────────
  const ViewPanel = () => (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col h-full">
      <div className="px-5 py-4 border-b border-gray-50 dark:border-gray-800 flex-shrink-0">
        <p className="font-black text-gray-800 dark:text-white">My Submitted Reports</p>
        <p className="text-xs text-gray-400 mt-0.5">All your {typeSchema?.label} entries · click a row to edit</p>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        <DataTable
          history={history}
          fields={typeSchema?.fields || []}
          onRowClick={r => setSelDate(r.report_date)}
          selDate={selDate}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">

      {/* ── Report type selector ── */}
      {schema && Object.keys(schema).length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {Object.entries(schema).map(([key, s]) => {
            const m = REPORT_META[key] || REPORT_META.sm_bdm;
            const Icon = m.icon;
            const active = key === selType;
            return (
              <button key={key} onClick={() => setSelType(key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                  active ? 'text-white shadow-md' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                }`}
                style={active ? { background:`linear-gradient(135deg, ${m.color}, ${m.color}bb)` } : {}}>
                <Icon size={13}/>{s.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Mobile tab switcher (hidden on desktop) ── */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl lg:hidden">
        {[['fill', <ClipboardEdit size={13}/>, 'Fill Report'], ['view', <TableProperties size={13}/>, 'My Reports']].map(([v,icon,l]) => (
          <button key={v} onClick={() => setMobileTab(v)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
              mobileTab===v ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'
            }`}>
            {icon}{l}
          </button>
        ))}
      </div>

      {/* ── Desktop: side-by-side | Mobile: single tab ── */}
      <div className="hidden lg:grid lg:grid-cols-2 gap-4" style={{height:'calc(100vh - 200px)', minHeight:'600px'}}>
        <FillPanel/>
        <ViewPanel/>
      </div>

      {/* Mobile single panel */}
      <div className="lg:hidden">
        {mobileTab === 'fill' ? (
          <div style={{minHeight:'500px'}}><FillPanel/></div>
        ) : (
          <div style={{minHeight:'400px'}}><ViewPanel/></div>
        )}
      </div>

      {/* ── Utility panels (always below, full width) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <DownloadPanel reportType={selType}/>
        <UploadPanel reportType={selType} schemaLabel={typeSchema?.label || ''} onDone={() => loadReport(selType, selDate)}/>
      </div>
    </div>
  );
}
