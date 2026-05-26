import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload, Trash2, BookOpen, X, Eye, Download, RefreshCw,
  Film, File, FileText, Image as ImageIcon, AlertTriangle,
  HardDrive, Layers, Play,
} from 'lucide-react';
import {
  TYPE_META, relativeTime, fmtBytes, detectType,
  CardThumbnail, SkeletonCard, FilterBar, FileViewer,
} from '../../components/TutorialsShared';
import { tutorialsApi } from '../../services/api';

// ── Size limits ────────────────────────────────────────────────────────────────
const SIZE_LIMITS = { image: '10 MB', document: '50 MB', video: '500 MB', other: '50 MB' };
const SIZE_BYTES  = { image: 10*1024*1024, document: 50*1024*1024, video: 500*1024*1024, other: 50*1024*1024 };

// ── Stats strip ───────────────────────────────────────────────────────────────
function StatsStrip({ items }) {
  const counts = items.reduce((a, t) => { a[t.file_type] = (a[t.file_type] || 0) + 1; return a; }, {});
  const totalViews = items.reduce((s, t) => s + (t.views || 0), 0);
  const stats = [
    { label: 'Total',     value: items.length,           icon: Layers,    color: '#2563eb' },
    { label: 'Videos',    value: counts.video    || 0,    icon: Film,      color: '#2563eb' },
    { label: 'Documents', value: counts.document || 0,    icon: FileText,  color: '#475569' },
    { label: 'Images',    value: counts.image    || 0,    icon: ImageIcon, color: '#64748b' },
    { label: 'Other',     value: counts.other    || 0,    icon: File,      color: '#94a3b8' },
    { label: 'Views',     value: totalViews,              icon: Eye,       color: '#2563eb' },
  ];
  return (
    <div className="flex gap-3 mb-6 overflow-x-auto pb-1 scrollbar-hide">
      {stats.map(s => {
        const Icon = s.icon;
        return (
          <div key={s.label}
            className="flex items-center gap-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3 shadow-sm shrink-0 min-w-[110px]">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${s.color}18` }}>
              <Icon size={14} style={{ color: s.color }}/>
            </div>
            <div>
              <p className="text-xl font-black text-gray-800 dark:text-white leading-none">{s.value.toLocaleString('en-IN')}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">{s.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tutorial card (admin — with delete) ───────────────────────────────────────
function TutorialCard({ t, onOpen, onDownload, onDelete }) {
  const m = TYPE_META[t.file_type] || TYPE_META.other;

  return (
    <div className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col">

      {/* Thumbnail — delete button revealed on hover */}
      <div className="relative">
        <CardThumbnail t={t} m={m} onOpen={() => onOpen(t)}/>
        <button
          onClick={e => { e.stopPropagation(); onDelete(t); }}
          className="absolute top-2.5 left-2.5 w-8 h-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow"
          style={{ background: 'rgba(239,68,68,0.85)', backdropFilter: 'blur(8px)' }}
          title="Delete tutorial">
          <Trash2 size={13} className="text-white"/>
        </button>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col">

        {/* Type badge + date */}
        <div className="flex items-center gap-2 mb-2.5">
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${m.bg} ${m.text}`}>
            <m.icon size={9}/>{m.label}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
            {relativeTime(t.uploaded_at)}
          </span>
        </div>

        {/* Title */}
        <p className="font-semibold text-gray-800 dark:text-white text-sm leading-snug line-clamp-2 mb-2">{t.title}</p>

        {/* Description */}
        {t.description && (
          <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 leading-relaxed mb-3">{t.description}</p>
        )}

        {/* Meta */}
        <div className="flex items-center text-[10px] text-gray-400 dark:text-gray-500 mt-auto pt-2.5 border-t border-gray-50 dark:border-gray-800">
          {t.file_size_display && (
            <span className="flex items-center gap-1"><HardDrive size={9}/>{t.file_size_display}</span>
          )}
          <span className="flex items-center gap-1 ml-auto"><Eye size={9}/>{t.views ?? 0} views</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button onClick={() => onOpen(t)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold bg-[#2563eb] hover:bg-[#1d4ed8] text-white transition-colors active:scale-95">
            {t.file_type === 'video'
              ? <><Play size={12} fill="currentColor"/>Watch</>
              : t.file_type === 'image'
              ? <><Eye size={12}/>View</>
              : <><Eye size={12}/>Open</>}
          </button>
          <button onClick={() => onDownload(t)}
            className="w-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-95"
            title="Download">
            <Download size={13}/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Upload Modal ───────────────────────────────────────────────────────────────
function UploadModal({ onClose, onSuccess }) {
  const [form,      setForm]      = useState({ title: '', description: '', file_type: 'document' });
  const [file,      setFile]      = useState(null);
  const [sizeError, setSizeError] = useState('');
  const [dragOver,  setDragOver]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);
  const fileRef = useRef();

  const handleFileSelect = (f) => {
    if (!f) return;
    setFile(f); setSizeError('');
    const dt = detectType(f.name);
    setForm(p => ({ ...p, file_type: dt }));
    if (f.size > (SIZE_BYTES[dt] || SIZE_BYTES.other)) {
      setSizeError(`Too large (${fmtBytes(f.size)}). Max for ${dt}: ${SIZE_LIMITS[dt]}.`);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  };

  const handleUpload = async () => {
    if (!file || !form.title.trim()) return;
    if (sizeError) return;
    setUploading(true); setProgress(10);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append('file', file);
    try {
      setProgress(40);
      await tutorialsApi.upload(fd);
      setProgress(100);
      setTimeout(() => { onSuccess(); onClose(); }, 400);
    } catch (e) {
      const d = e.response?.data;
      alert('Upload failed: ' + (d?.file?.[0] || d?.title?.[0] || JSON.stringify(d) || e.message));
    } finally { setUploading(false); }
  };

  const selType = form.file_type;
  const m       = TYPE_META[selType] || TYPE_META.other;
  const Icon    = m.icon;
  const canSubmit = file && form.title.trim() && !sizeError;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/5">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] to-[#2563eb]">
              <Upload size={15} className="text-white"/>
            </div>
            <div>
              <h3 className="font-black text-gray-800 dark:text-white leading-tight">Upload Tutorial</h3>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Add training material for staff</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors">
            <X size={15} className="text-gray-400"/>
          </button>
        </div>

        {/* Progress bar */}
        {uploading && (
          <div className="h-0.5 bg-gray-100 dark:bg-gray-800">
            <div className="h-full transition-all duration-500 rounded-full bg-[#2563eb]"
              style={{ width: `${progress}%` }}/>
          </div>
        )}

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* Type pills */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Type</p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(TYPE_META).map(([key, meta]) => {
                const Ic = meta.icon;
                const active = form.file_type === key;
                return (
                  <button key={key} onClick={() => setForm(f => ({ ...f, file_type: key }))}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      active ? 'bg-[#2563eb] text-white shadow-md shadow-blue-500/25' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}>
                    <Ic size={12}/>{meta.label}
                  </button>
                );
              })}
              <p className="self-center text-[10px] text-gray-400 dark:text-gray-500 italic ml-1">(auto-detected on upload)</p>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. New Employee Onboarding"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-shadow placeholder-gray-300 dark:placeholder-gray-600"/>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} placeholder="Brief description (optional)"
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none transition-shadow placeholder-gray-300 dark:placeholder-gray-600"/>
          </div>

          {/* Drop zone */}
          <div>
            <label className="block text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-1.5">
              File <span className="text-red-400">*</span>
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                dragOver  ? 'scale-[1.01]' :
                sizeError ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10' :
                file      ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/10' :
                'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-gray-50/50 dark:bg-gray-800/30'
              }`}
              style={dragOver ? { borderColor: '#2563eb', background: '#2563eb08' } : {}}>
              <input ref={fileRef} type="file" className="hidden"
                onChange={e => handleFileSelect(e.target.files?.[0])}/>

              {file ? (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                    style={{ background: `${m.color}20` }}>
                    <Icon size={22} style={{ color: m.color }}/>
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{file.name}</p>
                    <p className={`text-xs mt-0.5 ${sizeError ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
                      {fmtBytes(file.size)}{sizeError ? ' — exceeds limit' : ' · ready to upload'}
                    </p>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setFile(null); setSizeError(''); }}
                    className="ml-auto w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors shrink-0">
                    <X size={12} className="text-gray-400"/>
                  </button>
                </div>
              ) : (
                <div className="py-2">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                    <Upload size={20} className="text-gray-400"/>
                  </div>
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    Drag & drop or <span className="font-bold text-[#2563eb]">click to choose</span>
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                    Video up to {SIZE_LIMITS.video} · Document {SIZE_LIMITS.document} · Image {SIZE_LIMITS.image}
                  </p>
                </div>
              )}
            </div>

            {sizeError && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3.5 py-2.5 rounded-xl">
                <AlertTriangle size={12} className="shrink-0 mt-0.5"/>
                {sizeError}
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-3 text-sm border border-gray-200 dark:border-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-semibold">
              Cancel
            </button>
            <button onClick={handleUpload} disabled={uploading || !canSubmit}
              className="flex-1 py-3 text-sm font-bold text-white rounded-xl transition-all shadow-lg disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: canSubmit ? 'linear-gradient(135deg, #1E3A5F, #2563eb)' : undefined, boxShadow: canSubmit ? '0 4px 16px rgba(37,99,235,0.35)' : undefined }}>
              {uploading
                ? <><RefreshCw size={14} className="animate-spin"/>Uploading…</>
                : <><Upload size={14}/>Upload</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────────
function DeleteModal({ item, onCancel, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm ring-1 ring-black/5 dark:ring-white/5">
        <div className="p-6 text-center">
          <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Trash2 size={24} className="text-red-500"/>
          </div>
          <h3 className="font-black text-gray-800 dark:text-white text-lg mb-2">Delete Tutorial?</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1.5">You are about to permanently delete:</p>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-2.5 mb-2">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 line-clamp-2">"{item.title}"</p>
          </div>
          <p className="text-xs text-red-500 dark:text-red-400 mb-6 flex items-center justify-center gap-1.5">
            <AlertTriangle size={11}/>This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={onCancel} disabled={loading}
              className="flex-1 py-2.5 text-sm border border-gray-200 dark:border-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium disabled:opacity-50">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={loading}
              className="flex-1 py-2.5 text-sm font-bold bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all shadow-lg shadow-red-500/25 disabled:opacity-60 flex items-center justify-center gap-2">
              {loading
                ? <><RefreshCw size={14} className="animate-spin"/>Deleting…</>
                : <><Trash2 size={14}/>Delete</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function AdminTutorials() {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState('all');
  const [sort,       setSort]       = useState('newest');
  const [showUpload, setShowUpload] = useState(false);
  const [viewing,    setViewing]    = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [deleting,   setDeleting]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    tutorialsApi.list()
      .then(r => setItems(r.data.results || r.data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = items.reduce((a, t) => { a[t.file_type] = (a[t.file_type] || 0) + 1; return a; }, {});

  const displayed = items
    .filter(t => filter === 'all' || t.file_type === filter)
    .filter(t => {
      if (!search) return true;
      const q = search.toLowerCase();
      return t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sort === 'newest') return new Date(b.uploaded_at) - new Date(a.uploaded_at);
      if (sort === 'oldest') return new Date(a.uploaded_at) - new Date(b.uploaded_at);
      return (b.views || 0) - (a.views || 0);
    });

  const openViewer = (t) => { tutorialsApi.view(t.id).catch(() => {}); setViewing(t); };

  const handleDownload = async (t) => {
    try {
      const res  = await tutorialsApi.download(t.id);
      const blob = new Blob([res.data]);
      const burl = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = burl; a.download = t.file_name || t.title; a.click();
      URL.revokeObjectURL(burl);
    } catch { window.open(t.file_url, '_blank'); }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      await tutorialsApi.delete(confirmDel.id);
      setConfirmDel(null); load();
    } catch (e) {
      alert('Delete failed: ' + (e.response?.data?.detail || e.message));
    } finally { setDeleting(false); }
  };

  /* ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Tutorials</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Manage training materials for staff</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-[#1E3A5F] to-[#2563eb] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-900/25 hover:opacity-90 hover:shadow-blue-900/40 transition-all">
          <Upload size={15}/> Upload Tutorial
        </button>
      </div>

      {/* Stats */}
      {!loading && items.length > 0 && <StatsStrip items={items}/>}

      {/* Filter bar */}
      <FilterBar
        filter={filter} setFilter={setFilter}
        search={search} setSearch={setSearch}
        sort={sort}     setSort={setSort}
        counts={counts} total={items.length}
      />

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i}/>)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          {search ? (
            <>
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                <BookOpen size={28} className="text-gray-300 dark:text-gray-600"/>
              </div>
              <p className="font-bold text-gray-600 dark:text-gray-300 text-lg">No results for "{search}"</p>
              <button onClick={() => setSearch('')} className="mt-3 text-sm text-blue-500 hover:text-blue-600 font-semibold transition-colors">Clear search</button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                <BookOpen size={28} className="text-gray-300 dark:text-gray-600"/>
              </div>
              <p className="font-bold text-gray-600 dark:text-gray-300 text-lg">No tutorials yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-5">Upload the first training material for your team</p>
              <button onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-[#1E3A5F] to-[#2563eb] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-900/25 hover:opacity-90 transition-all">
                <Upload size={14}/> Upload First Tutorial
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {displayed.map(t => (
            <TutorialCard
              key={t.id} t={t}
              onOpen={openViewer}
              onDownload={handleDownload}
              onDelete={setConfirmDel}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showUpload && (
        <UploadModal onClose={() => setShowUpload(false)} onSuccess={load}/>
      )}
      {confirmDel && (
        <DeleteModal item={confirmDel} loading={deleting} onCancel={() => setConfirmDel(null)} onConfirm={handleDelete}/>
      )}
      {viewing && (
        <FileViewer item={viewing} onClose={() => setViewing(null)}/>
      )}
    </div>
  );
}
