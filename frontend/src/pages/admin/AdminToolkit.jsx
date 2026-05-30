/**
 * AdminToolkit — shared by admin (full CRUD) and staff (read-only view).
 * Role is inferred from useAuth().user.role
 */
import { useEffect, useRef, useState } from 'react';
import { useConfirm } from '../../components/ConfirmDialog';
import {
  Upload, Trash2, Edit2, Download, Eye, X, Search,
  FileText, Image, Film, Music, File, Loader2, Plus,
  FolderOpen, Tag, Save,
} from 'lucide-react';
import { toolkitApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// ── File type helpers ──────────────────────────────────────────────────────────
const TYPE_CFG = {
  image:    { icon: Image,    color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20',    label: 'Image'    },
  document: { icon: FileText, color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-900/20',  label: 'Document' },
  video:    { icon: Film,     color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20',label: 'Video'    },
  audio:    { icon: Music,    color: 'text-green-500',  bg: 'bg-green-50 dark:bg-green-900/20',  label: 'Audio'    },
  other:    { icon: File,     color: 'text-gray-500',   bg: 'bg-gray-50 dark:bg-gray-800',       label: 'File'     },
};
const typeOf = (t) => TYPE_CFG[t] || TYPE_CFG.other;

function fmtSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Upload / Edit modal (admin only) ──────────────────────────────────────────
function UploadModal({ item, onClose, onSaved }) {
  const isEdit = !!item;
  const [title, setTitle]       = useState(item?.title || '');
  const [desc,  setDesc]        = useState(item?.description || '');
  const [cat,   setCat]         = useState(item?.category || '');
  const [file,  setFile]        = useState(null);
  const [saving, setSaving]     = useState(false);
  const [error,  setError]      = useState('');
  const fileRef = useRef();

  const handleSave = async () => {
    if (!isEdit && !file) { setError('Please select a file.'); return; }
    if (!title.trim())    { setError('Title is required.');    return; }
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      fd.append('description', desc.trim());
      fd.append('category', cat.trim());
      if (file) fd.append('file', file);

      if (isEdit) await toolkitApi.update(item.id, fd);
      else        await toolkitApi.create(fd);
      onSaved();
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to save. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-gray-800 dark:text-white">{isEdit ? 'Edit File' : 'Upload File'}</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X size={16}/>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* File picker */}
          <div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              {isEdit ? 'Replace File (optional)' : 'File *'}
            </p>
            <div
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${
                file ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
              }`}>
              {file ? (
                <div>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 truncate">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{fmtSize(file.size)}</p>
                </div>
              ) : (
                <div>
                  <Upload size={20} className="mx-auto text-gray-300 dark:text-gray-600 mb-2"/>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Click to choose any file</p>
                  <p className="text-[11px] text-gray-300 dark:text-gray-600 mt-1">Photos, PDFs, Word, Excel, Videos…</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden"
              onChange={e => { setFile(e.target.files?.[0] || null); e.target.value = ''; }}/>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Sales Brochure Q2 2026"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Category</label>
            <input value={cat} onChange={e => setCat(e.target.value)}
              placeholder="e.g. Brochures, Policies, Templates…"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              rows={2} placeholder="Brief description (optional)"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"/>
          </div>

          {error && <p className="text-xs text-red-500 dark:text-red-400 font-medium">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2 text-sm font-bold text-white rounded-xl transition disabled:opacity-40 flex items-center justify-center gap-1.5"
              style={{ background: 'linear-gradient(135deg,#1E3A5F,#2563eb)' }}>
              {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Upload'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Toolkit Item Card ──────────────────────────────────────────────────────────
function ToolkitCard({ item, isAdmin, onEdit, onDelete }) {
  const tc  = typeOf(item.file_type);
  const Icon = tc.icon;
  const isPdf = item.file_name?.toLowerCase().endsWith('.pdf');
  const isImg = item.file_type === 'image';

  const handleOpen = () => {
    if (item.file_url) window.open(item.file_url, '_blank');
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col">
      {/* Thumbnail / preview area */}
      <div
        onClick={handleOpen}
        className={`h-36 flex items-center justify-center cursor-pointer ${tc.bg} relative group`}>
        {isImg ? (
          <img src={item.file_url} alt={item.title}
            className="w-full h-full object-cover" onError={e => e.currentTarget.style.display='none'}/>
        ) : (
          <Icon size={40} className={tc.color}/>
        )}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Eye size={20} className="text-white"/>
          <span className="text-white text-xs font-semibold">Open</span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="font-bold text-gray-800 dark:text-white text-sm leading-tight line-clamp-2 flex-1">{item.title}</p>
          {isAdmin && (
            <div className="flex gap-1 shrink-0">
              <button onClick={() => onEdit(item)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                <Edit2 size={13}/>
              </button>
              <button onClick={() => onDelete(item)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <Trash2 size={13}/>
              </button>
            </div>
          )}
        </div>

        {item.description && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{item.description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap mt-auto pt-2 border-t border-gray-50 dark:border-gray-800">
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${tc.bg} ${tc.color}`}>
            <Icon size={9}/>{tc.label}
          </span>
          {item.category && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              <Tag size={9}/>{item.category}
            </span>
          )}
          <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">{fmtSize(item.file_size)}</span>
        </div>

        {/* Download */}
        <a href={item.file_url} download={item.file_name} target="_blank" rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <Download size={12}/>Download
        </a>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function AdminToolkit() {
  const { user } = useAuth();
  const confirm  = useConfirm();
  const isAdmin  = user?.role === 'admin' || user?.role === 'super_admin';

  const [items,     setItems]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [typeFilter,setTypeFilter]= useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);

  const load = () => {
    setLoading(true);
    toolkitApi.list()
      .then(r => setItems(r.data.results || r.data || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const allCategories = [...new Set(items.map(i => i.category).filter(Boolean))].sort();

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    const matchQ   = !search || i.title.toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q);
    const matchType= !typeFilter || i.file_type === typeFilter;
    const matchCat = !catFilter  || i.category === catFilter;
    return matchQ && matchType && matchCat;
  });

  const handleDelete = async (item) => {
    const ok = await confirm({
      title: `Delete "${item.title}"?`,
      message: 'This file will be permanently removed from the toolkit and database.',
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!ok) return;
    await toolkitApi.delete(item.id);
    load();
  };

  const openEdit = (item) => { setEditing(item); setShowModal(true); };
  const openAdd  = ()     => { setEditing(null);  setShowModal(true); };

  return (
    <div className="flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Toolkit</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">
            Shared resources — {items.length} file{items.length !== 1 ? 's' : ''}
            {isAdmin ? ' · Admin can upload & edit' : ' · View & download'}
          </p>
        </div>
        {isAdmin && (
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
            style={{ background: 'linear-gradient(135deg,#1E3A5F,#2563eb)' }}>
            <Plus size={16}/> Upload File
          </button>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search toolkit…"
            className="w-full pl-8 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white shadow-sm"/>
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={12}/>
            </button>
          )}
        </div>

        {/* Type filter */}
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none shadow-sm">
          <option value="">All Types</option>
          <option value="image">📷 Images</option>
          <option value="document">📄 Documents</option>
          <option value="video">🎬 Videos</option>
          <option value="audio">🎵 Audio</option>
          <option value="other">📁 Other</option>
        </select>

        {/* Category filter */}
        {allCategories.length > 0 && (
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none shadow-sm">
            <option value="">All Categories</option>
            {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-blue-500"/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
            <FolderOpen size={28} className="text-gray-300 dark:text-gray-600"/>
          </div>
          <p className="font-semibold text-gray-500 dark:text-gray-400">
            {items.length === 0 ? 'Toolkit is empty' : 'No files match your filters'}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">
            {items.length === 0 && isAdmin ? 'Click "Upload File" to add your first resource.' : ''}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(item => (
            <ToolkitCard
              key={item.id}
              item={item}
              isAdmin={isAdmin}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <UploadModal
          item={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={() => { setShowModal(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}
