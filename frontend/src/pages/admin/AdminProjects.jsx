import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Plus, X, MapPin, Search, Upload, Image as ImageIcon,
  FileSpreadsheet, CheckCircle, AlertCircle, Trash2,
  Maximize2, Download, ChevronDown, Building2, Layers,
  RefreshCw, FolderOpen, Pencil, Save, Camera,
} from 'lucide-react';
import { projectsApi, plotsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import ImageZoomViewer from '../../components/ImageZoomViewer';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUSES = ['available', 'booked', 'in_process', 'blocked', 'sold'];
const STATUS_CFG = {
  available:  { label: 'Available',  dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', select: 'bg-emerald-50 text-emerald-700' },
  booked:     { label: 'Booked',     dot: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',             select: 'bg-blue-50 text-blue-700' },
  in_process: { label: 'In Process', dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',         select: 'bg-amber-50 text-amber-700' },
  blocked:    { label: 'Blocked',    dot: 'bg-gray-400',    badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',                 select: 'bg-gray-100 text-gray-600' },
  sold:       { label: 'Sold',       dot: 'bg-red-500',     badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',                  select: 'bg-red-50 text-red-700' },
};

function fmtINR(n) {
  if (!n && n !== 0) return '—';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

// ── Inline status cell (admin row — auto-saves) ───────────────────────────────
function StatusSelect({ plot, onSaved }) {
  const [saving, setSaving] = useState(false);
  const cfg = STATUS_CFG[plot.status] || STATUS_CFG.available;
  const handleChange = async (e) => {
    setSaving(true);
    try {
      await plotsApi.update(plot.id, { status: e.target.value });
      onSaved(plot.id, e.target.value);
    } catch { alert('Failed to update status.'); }
    finally  { setSaving(false); }
  };
  return (
    <div className="relative">
      <select value={plot.status} onChange={handleChange} disabled={saving}
        className={`pl-6 pr-7 py-1 rounded-lg text-xs font-semibold border-0 cursor-pointer focus:ring-2 focus:ring-accent/30 focus:outline-none appearance-none transition-all disabled:opacity-60 ${cfg.select}`}>
        {STATUSES.map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
      </select>
      <span className={`absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${cfg.dot} ${saving ? 'animate-pulse' : ''}`} />
      <ChevronDown size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-60" />
    </div>
  );
}

// ── Plot field row inside modals ──────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const EMPTY_PLOT = { plot_no:'', area_sqft:'', facing:'', road_width:'', rate_per_sqft:'', total_cost:'', survey_no:'', status:'available', notes:'' };

// ════════════════════════════════════════════════════════════════════════════
export default function AdminProjects() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin      = user?.role === 'admin';
  const canManage    = isSuperAdmin || isAdmin;

  const [projects,     setProjects]     = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [plots,        setPlots]        = useState([]);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loadingPlots, setLoadingPlots] = useState(false);

  // New project modal
  const [showNewProj,  setShowNewProj]  = useState(false);
  const [projForm,     setProjForm]     = useState({ name:'', location:'', description:'' });
  const [projSaving,   setProjSaving]   = useState(false);

  // Layout
  const [layoutFile,   setLayoutFile]   = useState(null);
  const [layoutSaving, setLayoutSaving] = useState(false);
  const [zoomImg,      setZoomImg]      = useState(null);
  const layoutRef     = useRef();
  const logoRef       = useRef();
  const logoTargetRef = useRef(null);   // which project ID to upload logo for
  const [logoUploading, setLogoUploading] = useState(null);

  // Excel import
  const [showImport,   setShowImport]   = useState(false);
  const [importFile,   setImportFile]   = useState(null);
  const [importing,    setImporting]    = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importDrag,   setImportDrag]   = useState(false);
  const excelRef = useRef();

  // Delete project
  const [deletingProj, setDeletingProj] = useState(false);

  // ── Super-admin plot editing ──────────────────────────────────────────────
  const [editPlot,    setEditPlot]    = useState(null);   // plot object being edited
  const [editForm,    setEditForm]    = useState({});
  const [editSaving,  setEditSaving]  = useState(false);

  // Super-admin: delete individual plot
  const [deletePlot,     setDeletePlot]     = useState(null);  // plot object
  const [delPlotSaving,  setDelPlotSaving]  = useState(false);

  // Super-admin: add individual plot
  const [showAddPlot, setShowAddPlot] = useState(false);
  const [addForm,     setAddForm]     = useState(EMPTY_PLOT);
  const [addSaving,   setAddSaving]   = useState(false);

  // ── Data loaders ─────────────────────────────────────────────────────────
  const loadProjects = useCallback(() =>
    projectsApi.list().then(r => setProjects(r.data.results || r.data)), []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const openProject = async (p) => {
    setSelected(p); setSearch(''); setStatusFilter('all');
    setLoadingPlots(true);
    try {
      const r = await projectsApi.plots(p.id);
      setPlots(r.data);
    } finally { setLoadingPlots(false); }
  };

  const refreshProject = async () => {
    if (!selected) return;
    const [pr, plotsR] = await Promise.all([projectsApi.get(selected.id), projectsApi.plots(selected.id)]);
    setSelected(pr.data); setPlots(plotsR.data); loadProjects();
  };

  const handleStatusSaved = (plotId, newStatus) => {
    setPlots(prev => prev.map(p => p.id === plotId ? { ...p, status: newStatus } : p));
    loadProjects();
  };

  const filtered = plots.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !search || p.plot_no?.toLowerCase().includes(q) || p.facing?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCount = (s) => plots.filter(p => p.status === s).length;

  // ── Project CRUD ─────────────────────────────────────────────────────────
  const createProject = async () => {
    if (!projForm.name.trim()) return;
    setProjSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', projForm.name.trim());
      fd.append('location', projForm.location.trim());
      fd.append('description', projForm.description.trim());
      await api.post('/projects/', fd);
      loadProjects(); setShowNewProj(false);
      setProjForm({ name:'', location:'', description:'' });
    } finally { setProjSaving(false); }
  };

  const deleteProject = async (id) => {
    if (!confirm('Delete this project and ALL its plots? This cannot be undone.')) return;
    setDeletingProj(true);
    try { await projectsApi.delete(id); setSelected(null); loadProjects(); }
    finally { setDeletingProj(false); }
  };

  // ── Layout ───────────────────────────────────────────────────────────────
  const uploadLayout = async () => {
    if (!layoutFile || !selected) return;
    setLayoutSaving(true);
    try {
      const fd = new FormData(); fd.append('layout_image', layoutFile);
      await projectsApi.update(selected.id, fd);
      setLayoutFile(null); layoutRef.current.value = '';
      await refreshProject();
    } finally { setLayoutSaving(false); }
  };

  const removeLayout = async () => {
    if (!confirm('Remove the layout image?') || !selected) return;
    setLayoutSaving(true);
    try { await api.patch(`/projects/${selected.id}/`, { remove_layout: true }); await refreshProject(); }
    finally { setLayoutSaving(false); }
  };

  // ── Logo upload (project card list view) ─────────────────────────────────
  const uploadLogo = async (file) => {
    if (!file || !logoTargetRef.current) return;
    const projId = logoTargetRef.current;
    if (file.size > 5 * 1024 * 1024) {
      alert('Logo image must be under 5 MB. Please compress and try again.');
      if (logoRef.current) logoRef.current.value = '';
      logoTargetRef.current = null;
      return;
    }
    setLogoUploading(projId);
    try {
      const fd = new FormData();
      fd.append('image', file);
      await projectsApi.update(projId, fd);
      await loadProjects();
    } catch (e) {
      alert('Logo upload failed: ' + (e.response?.data?.error || e.message));
    } finally {
      setLogoUploading(null);
      logoTargetRef.current = null;
      if (logoRef.current) logoRef.current.value = '';
    }
  };

  // ── Excel import ─────────────────────────────────────────────────────────
  const downloadTemplate = async () => {
    try {
      const res  = await projectsApi.plotTemplate();
      const burl = URL.createObjectURL(new Blob([res.data]));
      const a    = document.createElement('a');
      a.href = burl; a.download = 'plots_template.xlsx'; a.click();
      URL.revokeObjectURL(burl);
    } catch { alert('Failed to download template.'); }
  };

  const handleImport = async () => {
    if (!importFile || !selected) return;
    setImporting(true); setImportResult(null);
    try {
      const fd = new FormData(); fd.append('file', importFile);
      const r = await projectsApi.importPlots(selected.id, fd);
      setImportResult({ ok: true, message: r.data.message });
      setImportFile(null);
      if (excelRef.current) excelRef.current.value = '';
      await refreshProject();
    } catch (e) {
      const msg = e.response?.data?.error || e.response?.data?.detail || 'Import failed. Check your file format.';
      setImportResult({ ok: false, message: msg });
    } finally { setImporting(false); }
  };

  const clearAllPlots = async () => {
    if (!selected) return;
    if (!confirm(`Delete ALL ${plots.length} plots from "${selected.name}"? This cannot be undone.`)) return;
    await projectsApi.clearPlots(selected.id);
    await refreshProject();
  };

  // ── Super-admin: edit plot ────────────────────────────────────────────────
  const openEditPlot = (plot) => {
    setEditPlot(plot);
    setEditForm({
      plot_no:       plot.plot_no       || '',
      area_sqft:     plot.area_sqft     || '',
      facing:        plot.facing        || '',
      road_width:    plot.road_width    || '',
      rate_per_sqft: plot.rate_per_sqft || '',
      total_cost:    plot.total_cost    || '',
      survey_no:     plot.survey_no     || '',
      status:        plot.status        || 'available',
      notes:         plot.notes         || '',
    });
  };

  const saveEditPlot = async () => {
    if (!editPlot) return;
    setEditSaving(true);
    try {
      const payload = { ...editForm };
      // Convert empty strings to null for numeric fields
      ['area_sqft','rate_per_sqft','total_cost'].forEach(k => {
        if (payload[k] === '' || payload[k] === null) payload[k] = null;
        else payload[k] = parseFloat(payload[k]);
      });
      await plotsApi.update(editPlot.id, payload);
      setPlots(prev => prev.map(p => p.id === editPlot.id ? { ...p, ...payload } : p));
      setEditPlot(null); setEditForm({});
      loadProjects();
    } catch (e) {
      alert('Save failed: ' + (e.response?.data?.plot_no?.[0] || e.response?.data?.detail || e.message));
    } finally { setEditSaving(false); }
  };

  // ── Super-admin: delete individual plot ──────────────────────────────────
  const confirmDeletePlot = async () => {
    if (!deletePlot) return;
    setDelPlotSaving(true);
    try {
      await plotsApi.delete(deletePlot.id);
      setPlots(prev => prev.filter(p => p.id !== deletePlot.id));
      setDeletePlot(null); loadProjects();
    } catch (e) {
      alert('Delete failed: ' + (e.response?.data?.detail || e.message));
    } finally { setDelPlotSaving(false); }
  };

  // ── Super-admin: add individual plot ─────────────────────────────────────
  const saveAddPlot = async () => {
    if (!addForm.plot_no.trim() || !selected) return;
    setAddSaving(true);
    try {
      const payload = { ...addForm, project: selected.id };
      ['area_sqft','rate_per_sqft','total_cost'].forEach(k => {
        payload[k] = payload[k] === '' ? null : parseFloat(payload[k]) || null;
      });
      const r = await plotsApi.create(payload);
      setPlots(prev => [...prev, r.data]);
      setShowAddPlot(false); setAddForm(EMPTY_PLOT);
      loadProjects();
    } catch (e) {
      alert('Add failed: ' + (e.response?.data?.plot_no?.[0] || e.response?.data?.detail || e.message));
    } finally { setAddSaving(false); }
  };

  /* ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div>
      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Projects</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Manage projects, layouts and plot statuses</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2.5 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-sm font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors">
            <Download size={15} /> Download Template
          </button>
          <button onClick={() => { setShowNewProj(true); setProjForm({ name:'', location:'', description:'' }); }}
            className="flex items-center gap-2 bg-gradient-to-r from-accent to-amber-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-accent/20 hover:opacity-95 transition-all">
            <Plus size={15} /> New Project
          </button>
        </div>
      </div>

      {/* ════ PROJECT LIST ════ */}
      {!selected ? (
        <>
          {projects.length === 0 ? (
            <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <Building2 size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="font-bold text-gray-500 dark:text-gray-400">No projects yet</p>
              <p className="text-sm text-gray-400 mt-1">Create your first project to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {projects.map(p => (
                <div key={p.id} onClick={() => openProject(p)}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-accent/40 transition-all cursor-pointer overflow-hidden group">
                  {/* Card header — project logo (object-cover) or gradient placeholder */}
                  <div className="relative h-36 overflow-hidden bg-gray-100 dark:bg-gray-800">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-accent/10 to-amber-400/10 flex items-center justify-center">
                        <Building2 size={32} className="text-accent/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                    <span className="absolute bottom-2 left-3 text-white font-bold text-sm drop-shadow">{p.name}</span>
                    {/* Logo upload button — visible on card hover */}
                    {canManage && (
                      <button
                        onClick={e => { e.stopPropagation(); logoTargetRef.current = p.id; logoRef.current?.click(); }}
                        title="Update project logo"
                        className="absolute top-2 right-2 w-8 h-8 bg-black/40 hover:bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                        <Camera size={13} className="text-white"/>
                      </button>
                    )}
                    {logoUploading === p.id && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <RefreshCw size={20} className="text-white animate-spin"/>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    {p.location && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mb-3">
                        <MapPin size={11}/>{p.location}
                      </p>
                    )}
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mb-3">
                      <div className="bg-gradient-to-r from-accent to-amber-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${p.sold_percentage}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                      <span>{p.sold_percentage}% sold</span>
                      <span>{p.total_plots} plots total</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl py-2">
                        <p className="font-black text-gray-800 dark:text-white text-base">{p.total_plots}</p>
                        <p className="text-[10px] text-gray-400 font-medium">Total</p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl py-2">
                        <p className="font-black text-red-600 dark:text-red-400 text-base">{p.sold_plots}</p>
                        <p className="text-[10px] text-red-400 font-medium">Sold</p>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl py-2">
                        <p className="font-black text-emerald-600 dark:text-emerald-400 text-base">{p.available_plots}</p>
                        <p className="text-[10px] text-emerald-400 font-medium">Available</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (

        /* ════ PROJECT DETAIL ════ */
        <div>
          {/* Breadcrumb + title */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <button onClick={() => setSelected(null)}
              className="text-sm text-gray-400 hover:text-gray-800 dark:hover:text-white flex items-center gap-1 transition-colors">
              ‹ Projects
            </button>
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <div className="flex-1">
              <h2 className="font-black text-gray-800 dark:text-white text-lg">{selected.name}</h2>
              {selected.location && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={10}/>{selected.location}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Add Plot — admin & super admin */}
              {canManage && (
                <button onClick={() => { setShowAddPlot(true); setAddForm(EMPTY_PLOT); }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-accent to-amber-500 text-white rounded-xl text-xs font-bold shadow-md shadow-accent/20 hover:opacity-95 transition-all">
                  <Plus size={13}/> Add Plot
                </button>
              )}
              <button onClick={() => { setShowImport(true); setImportResult(null); setImportFile(null); }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-colors">
                <Upload size={13}/> Import Plots
              </button>
              <button onClick={() => deleteProject(selected.id)} disabled={deletingProj}
                className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-50"
                title="Delete project">
                <Trash2 size={15}/>
              </button>
            </div>
          </div>

          {/* ── Layout image section ── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <ImageIcon size={14} className="text-white"/>
                </div>
                <p className="font-bold text-gray-700 dark:text-white text-sm">Project Layout Image</p>
              </div>
              {(selected.layout_image_url || selected.layout_image) && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setZoomImg(selected.layout_image_url)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 transition-colors font-medium">
                    <Maximize2 size={12}/> Zoom
                  </button>
                  <button onClick={removeLayout} disabled={layoutSaving}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-xl hover:bg-red-100 transition-colors font-medium disabled:opacity-50">
                    <Trash2 size={12}/> Remove
                  </button>
                </div>
              )}
            </div>
            {(selected.layout_image_url || selected.layout_image) ? (
              <img src={selected.layout_image_url} alt="layout"
                className="w-full max-h-72 object-contain rounded-xl bg-gray-50 dark:bg-gray-800 mb-4 cursor-zoom-in border border-gray-100 dark:border-gray-700"
                onClick={() => setZoomImg(selected.layout_image_url)} />
            ) : (
              <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl mb-4 text-gray-400 text-sm">
                <ImageIcon size={20}/><span>No layout uploaded yet — high-quality images recommended</span>
              </div>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <input ref={layoutRef} type="file" accept="image/*" className="hidden"
                onChange={e => {
                  const f = e.target.files[0];
                  if (!f) return;
                  if (f.size > 5 * 1024 * 1024) {
                    alert('Layout image must be under 5 MB. Please compress and try again.');
                    e.target.value = '';
                    return;
                  }
                  setLayoutFile(f);
                }}/>
              <button onClick={() => layoutRef.current?.click()}
                className="flex items-center gap-2 text-sm px-4 py-2 border border-gray-200 dark:border-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium">
                <Upload size={14}/>
                {layoutFile ? layoutFile.name : (selected.layout_image_url ? 'Replace Image' : 'Choose Image')}
              </button>
              {layoutFile && (
                <>
                  <button onClick={uploadLayout} disabled={layoutSaving}
                    className="px-4 py-2 bg-gradient-to-r from-accent to-amber-500 text-white rounded-xl text-sm font-bold shadow-md disabled:opacity-60 hover:opacity-90 transition-all">
                    {layoutSaving ? 'Uploading…' : 'Upload Layout'}
                  </button>
                  <button onClick={() => { setLayoutFile(null); layoutRef.current.value = ''; }}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                    <X size={14}/>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* ── Status summary chips ── */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  statusFilter === s
                    ? STATUS_CFG[s].badge + ' ring-1 ring-current ring-offset-1'
                    : STATUS_CFG[s].badge + ' opacity-80 hover:opacity-100'
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CFG[s].dot}`}/>
                {STATUS_CFG[s].label}: {statusCount(s)}
              </button>
            ))}
            {statusFilter !== 'all' && (
              <button onClick={() => setStatusFilter('all')}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 transition-colors">
                × Clear filter
              </button>
            )}
          </div>

          {/* ── Search + controls ── */}
          <div className="flex gap-3 mb-4 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search plot no, facing…"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"/>
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={13}/>
                </button>
              )}
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
              {filtered.length} of {plots.length} plots
            </span>
            {plots.length > 0 && (
              <button onClick={clearAllPlots}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-red-200 dark:border-red-800">
                <Trash2 size={12}/> Clear All Plots
              </button>
            )}
          </div>

          {/* ── Plots table ── */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {loadingPlots ? (
              <div className="text-center py-16 text-gray-400">
                <RefreshCw size={24} className="mx-auto mb-2 animate-spin"/> Loading plots…
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                {plots.length === 0 ? (
                  <div>
                    <FolderOpen size={36} className="mx-auto mb-3 text-gray-300 dark:text-gray-600"/>
                    <p className="font-semibold">No plots yet</p>
                    <p className="text-sm mt-1">Download the template, fill it in, then import</p>
                    <div className="flex gap-3 justify-center mt-4 flex-wrap">
                      <button onClick={downloadTemplate}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-colors">
                        <Download size={14}/> Download Template
                      </button>
                      <button onClick={() => { setShowImport(true); setImportResult(null); setImportFile(null); }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-400 rounded-xl text-sm font-semibold hover:bg-blue-100 transition-colors">
                        <Upload size={14}/> Import Plots
                      </button>
                    </div>
                  </div>
                ) : <p>No plots match your search</p>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      {['Plot No','Area (sq.ft)','Facing','Road Width','Rate/sq.ft','Total Cost','Survey No','Status',
                        ...(canManage ? ['Actions'] : [])
                      ].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {filtered.map(plot => (
                      <tr key={plot.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-3 px-4 font-black text-gray-800 dark:text-white">{plot.plot_no}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300 tabular-nums">{plot.area_sqft ? Number(plot.area_sqft).toLocaleString('en-IN') : '—'}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300 capitalize">{plot.facing || '—'}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">{plot.road_width || '—'}</td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300 tabular-nums">{plot.rate_per_sqft ? `₹${Number(plot.rate_per_sqft).toLocaleString('en-IN')}` : '—'}</td>
                        <td className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 tabular-nums">{fmtINR(plot.total_cost)}</td>
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-xs">{plot.survey_no || '—'}</td>
                        <td className="py-3 px-4">
                          <StatusSelect plot={plot} onSaved={handleStatusSaved}/>
                        </td>
                        {canManage && (
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => openEditPlot(plot)} title="Edit plot"
                                className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-colors">
                                <Pencil size={13}/>
                              </button>
                              <button onClick={() => setDeletePlot(plot)} title="Delete plot"
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors">
                                <Trash2 size={13}/>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════ NEW PROJECT MODAL ════ */}
      {showNewProj && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md ring-1 ring-white/10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-accent to-amber-500 rounded-lg flex items-center justify-center">
                  <Plus size={14} className="text-white"/>
                </div>
                <h3 className="font-black text-gray-800 dark:text-white">Create New Project</h3>
              </div>
              <button onClick={() => setShowNewProj(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
                <X size={16} className="text-gray-400"/>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {[['name','Project Name *','e.g. i5 Global City'],['location','Location','e.g. Chengalpattu, Tamil Nadu']].map(([k,label,ph]) => (
                <div key={k}>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">{label}</label>
                  <input value={projForm[k]} onChange={e => setProjForm(f => ({ ...f, [k]: e.target.value }))}
                    placeholder={ph}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"/>
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Description</label>
                <textarea value={projForm.description} onChange={e => setProjForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Brief project description (optional)"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"/>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowNewProj(false)}
                  className="flex-1 py-2.5 text-sm border border-gray-200 dark:border-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium">
                  Cancel
                </button>
                <button onClick={createProject} disabled={projSaving || !projForm.name.trim()}
                  className="flex-1 py-2.5 text-sm font-bold bg-gradient-to-r from-accent to-amber-500 text-white rounded-xl hover:opacity-90 disabled:opacity-40 transition-all shadow-md shadow-accent/20">
                  {projSaving ? 'Creating…' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ EDIT PLOT MODAL (super admin only) ════ */}
      {editPlot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg ring-1 ring-white/10 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Pencil size={14} className="text-white"/>
                </div>
                <div>
                  <h3 className="font-black text-gray-800 dark:text-white">Edit Plot</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Plot {editPlot.plot_no} · {selected?.name}</p>
                </div>
              </div>
              <button onClick={() => { setEditPlot(null); setEditForm({}); }}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
                <X size={16} className="text-gray-400"/>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Plot No *">
                  <input value={editForm.plot_no} onChange={e => setEditForm(f => ({ ...f, plot_no: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
                </Field>
                <Field label="Status">
                  <div className="relative">
                    <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full pl-4 pr-8 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none">
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                  </div>
                </Field>
                <Field label="Area (sq.ft)">
                  <input type="number" value={editForm.area_sqft} onChange={e => setEditForm(f => ({ ...f, area_sqft: e.target.value }))}
                    placeholder="e.g. 1200"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
                </Field>
                <Field label="Facing">
                  <input value={editForm.facing} onChange={e => setEditForm(f => ({ ...f, facing: e.target.value }))}
                    placeholder="e.g. East, North-East"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
                </Field>
                <Field label="Road Width">
                  <input value={editForm.road_width} onChange={e => setEditForm(f => ({ ...f, road_width: e.target.value }))}
                    placeholder="e.g. 30 ft"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
                </Field>
                <Field label="Survey No">
                  <input value={editForm.survey_no} onChange={e => setEditForm(f => ({ ...f, survey_no: e.target.value }))}
                    placeholder="e.g. 123/4A"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
                </Field>
                <Field label="Rate / sq.ft (₹)">
                  <input type="number" value={editForm.rate_per_sqft} onChange={e => setEditForm(f => ({ ...f, rate_per_sqft: e.target.value }))}
                    placeholder="e.g. 3500"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
                </Field>
                <Field label="Total Cost (₹)">
                  <input type="number" value={editForm.total_cost} onChange={e => setEditForm(f => ({ ...f, total_cost: e.target.value }))}
                    placeholder="Auto-calc if blank"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
                </Field>
              </div>
              <Field label="Notes">
                <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Any additional notes…"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"/>
              </Field>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
              <button onClick={() => { setEditPlot(null); setEditForm({}); }}
                disabled={editSaving}
                className="flex-1 py-2.5 text-sm border border-gray-200 dark:border-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium disabled:opacity-50">
                Cancel
              </button>
              <button onClick={saveEditPlot} disabled={editSaving || !editForm.plot_no?.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:opacity-90 disabled:opacity-40 transition-all shadow-md shadow-blue-500/20">
                {editSaving
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Saving…</>
                  : <><Save size={14}/>Save Changes</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ ADD PLOT MODAL (super admin only) ════ */}
      {showAddPlot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg ring-1 ring-white/10 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-accent to-amber-500 rounded-lg flex items-center justify-center">
                  <Plus size={14} className="text-white"/>
                </div>
                <div>
                  <h3 className="font-black text-gray-800 dark:text-white">Add New Plot</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{selected?.name}</p>
                </div>
              </div>
              <button onClick={() => setShowAddPlot(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
                <X size={16} className="text-gray-400"/>
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Plot No *">
                  <input value={addForm.plot_no} onChange={e => setAddForm(f => ({ ...f, plot_no: e.target.value }))}
                    placeholder="e.g. A-101"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"/>
                </Field>
                <Field label="Status">
                  <div className="relative">
                    <select value={addForm.status} onChange={e => setAddForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full pl-4 pr-8 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 appearance-none">
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_CFG[s].label}</option>)}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                  </div>
                </Field>
                <Field label="Area (sq.ft)">
                  <input type="number" value={addForm.area_sqft} onChange={e => setAddForm(f => ({ ...f, area_sqft: e.target.value }))}
                    placeholder="e.g. 1200"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"/>
                </Field>
                <Field label="Facing">
                  <input value={addForm.facing} onChange={e => setAddForm(f => ({ ...f, facing: e.target.value }))}
                    placeholder="e.g. East, North-East"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"/>
                </Field>
                <Field label="Road Width">
                  <input value={addForm.road_width} onChange={e => setAddForm(f => ({ ...f, road_width: e.target.value }))}
                    placeholder="e.g. 30 ft"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"/>
                </Field>
                <Field label="Survey No">
                  <input value={addForm.survey_no} onChange={e => setAddForm(f => ({ ...f, survey_no: e.target.value }))}
                    placeholder="e.g. 123/4A"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"/>
                </Field>
                <Field label="Rate / sq.ft (₹)">
                  <input type="number" value={addForm.rate_per_sqft} onChange={e => setAddForm(f => ({ ...f, rate_per_sqft: e.target.value }))}
                    placeholder="e.g. 3500"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"/>
                </Field>
                <Field label="Total Cost (₹)">
                  <input type="number" value={addForm.total_cost} onChange={e => setAddForm(f => ({ ...f, total_cost: e.target.value }))}
                    placeholder="Auto-calc if blank"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"/>
                </Field>
              </div>
              <Field label="Notes">
                <textarea value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Any additional notes…"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"/>
              </Field>
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
              <button onClick={() => setShowAddPlot(false)} disabled={addSaving}
                className="flex-1 py-2.5 text-sm border border-gray-200 dark:border-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium disabled:opacity-50">
                Cancel
              </button>
              <button onClick={saveAddPlot} disabled={addSaving || !addForm.plot_no.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold bg-gradient-to-r from-accent to-amber-500 text-white rounded-xl hover:opacity-90 disabled:opacity-40 transition-all shadow-md shadow-accent/20">
                {addSaving
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Adding…</>
                  : <><Plus size={14}/>Add Plot</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ DELETE PLOT CONFIRMATION (super admin only) ════ */}
      {deletePlot && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm ring-1 ring-black/10 dark:ring-white/10">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-500"/>
              </div>
              <h3 className="font-black text-gray-800 dark:text-white text-lg mb-2">Delete Plot?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">You are about to permanently delete:</p>
              <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-5">
                Plot <span className="text-red-500">{deletePlot.plot_no}</span> from {selected?.name}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeletePlot(null)} disabled={delPlotSaving}
                  className="flex-1 py-2.5 text-sm border border-gray-200 dark:border-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={confirmDeletePlot} disabled={delPlotSaving}
                  className="flex-1 py-2.5 text-sm font-bold bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all shadow-md shadow-red-500/20 disabled:opacity-60 flex items-center justify-center gap-2">
                  {delPlotSaving
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Deleting…</>
                    : <><Trash2 size={14}/>Delete</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ EXCEL IMPORT MODAL ════ */}
      {showImport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg ring-1 ring-white/10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <FileSpreadsheet size={14} className="text-white"/>
                </div>
                <div>
                  <h3 className="font-black text-gray-800 dark:text-white">Import Plots</h3>
                  {selected && <p className="text-xs text-gray-400 mt-0.5">→ {selected.name}</p>}
                </div>
              </div>
              <button onClick={() => { setShowImport(false); setImportResult(null); setImportFile(null); }}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
                <X size={16} className="text-gray-400"/>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-2.5">Required columns</p>
                <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                  {[['S.No','Reference only — ignored on import'],['Plot No','Plot number or ID (required)'],['Facing','Direction (East, West…)'],['Area (sq.ft)','Area in square feet'],['Rate per sq.ft','Rate per square foot'],['Total Cost','Auto-calculated if blank'],['Status','available / booked / in process / blocked / sold']].map(([col,desc]) => (
                    <div key={col} className="text-xs">
                      <span className="font-bold text-blue-700 dark:text-blue-300">{col}</span>
                      <span className="text-blue-500 dark:text-blue-400 ml-1">— {desc}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                  <button onClick={downloadTemplate}
                    className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 transition-colors">
                    <Download size={12}/> Download Template
                  </button>
                  <span className="text-blue-300">·</span>
                  <span className="text-xs text-blue-500">Importing will replace all existing plots</span>
                </div>
              </div>
              <input ref={excelRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                onChange={e => { setImportFile(e.target.files[0]); setImportResult(null); }}/>
              <div onClick={() => excelRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setImportDrag(true); }}
                onDragLeave={() => setImportDrag(false)}
                onDrop={e => { e.preventDefault(); setImportDrag(false); setImportFile(e.dataTransfer.files[0]); setImportResult(null); }}
                className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all ${
                  importDrag ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 scale-[1.01]' :
                  importFile ? 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/10' :
                  'border-gray-200 dark:border-gray-700 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/10'
                }`}>
                <FileSpreadsheet size={28} className={`mx-auto mb-2 ${importFile ? 'text-emerald-500' : 'text-gray-300 dark:text-gray-600'}`}/>
                {importFile ? (
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{importFile.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Drag & drop or <span className="text-emerald-600 dark:text-emerald-400 font-bold">click to select</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">.xlsx, .xls, or .csv</p>
                  </>
                )}
              </div>
              {importResult && (
                <div className={`flex items-start gap-2.5 p-3.5 rounded-xl text-sm ${importResult.ok ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'}`}>
                  {importResult.ok ? <CheckCircle size={16} className="shrink-0 mt-0.5"/> : <AlertCircle size={16} className="shrink-0 mt-0.5"/>}
                  <p>{importResult.message}</p>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => { setShowImport(false); setImportResult(null); setImportFile(null); }}
                  className="flex-1 py-2.5 text-sm border border-gray-200 dark:border-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium">
                  {importResult?.ok ? 'Close' : 'Cancel'}
                </button>
                {!importResult?.ok && (
                  <button onClick={handleImport} disabled={!importFile || importing}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:opacity-90 disabled:opacity-40 transition-all shadow-md shadow-emerald-500/20">
                    {importing ? <><RefreshCw size={14} className="animate-spin"/>Importing…</> : <><Upload size={14}/>Import Plots</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Layout zoom viewer ── */}
      {zoomImg && (
        <ImageZoomViewer src={zoomImg} title={`${selected?.name || 'Project'} — Layout`} onClose={() => setZoomImg(null)}/>
      )}

      {/* ── Hidden logo file input (shared across all project cards) ── */}
      <input ref={logoRef} type="file" accept="image/*" className="hidden"
        onChange={e => { if (e.target.files[0]) uploadLogo(e.target.files[0]); }}/>
    </div>
  );
}
