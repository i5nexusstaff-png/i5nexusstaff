/**
 * TutorialsShared.jsx
 * Shared building blocks used by both StaffTutorials and AdminTutorials.
 */
import { useEffect, useState } from 'react';
import {
  Film, File, FileText, Image as ImageIcon,
  Play, Eye, Download, ExternalLink, X, Search,
} from 'lucide-react';
import { tutorialsApi } from '../services/api';

// ── Type metadata ──────────────────────────────────────────────────────────────
export const TYPE_META = {
  video:    {
    icon: Film,      label: 'Video',
    color: '#2563eb', gradient: 'from-[#1E3A5F] to-[#2563eb]',
    bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-600',
  },
  document: {
    icon: FileText,  label: 'Document',
    color: '#475569', gradient: 'from-slate-600 to-slate-700',
    bg: 'bg-slate-100 dark:bg-slate-800/40', text: 'text-slate-600 dark:text-slate-400',
    badgeBg: 'bg-slate-500',
  },
  image:    {
    icon: ImageIcon, label: 'Image',
    color: '#64748b', gradient: 'from-slate-500 to-slate-600',
    bg: 'bg-slate-50 dark:bg-slate-800/40', text: 'text-slate-500 dark:text-slate-400',
    badgeBg: 'bg-slate-400',
  },
  other:    {
    icon: File,      label: 'Other',
    color: '#334155', gradient: 'from-slate-700 to-slate-800',
    bg: 'bg-slate-50 dark:bg-slate-800/40', text: 'text-slate-500 dark:text-slate-400',
    badgeBg: 'bg-slate-600',
  },
};

export const FILTERS = ['all', 'video', 'document', 'image', 'other'];
export const OFFICE_EXTS = new Set(['doc','docx','ppt','pptx','xls','xlsx','odt','odp','ods']);

// ── Helpers ───────────────────────────────────────────────────────────────────
export function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 7)   return `${d}d ago`;
  if (d < 30)  return `${Math.floor(d / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

export function detectType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (['mp4','avi','mov','mkv','webm','m4v','flv','wmv'].includes(ext))           return 'video';
  if (['jpg','jpeg','png','gif','webp','svg','bmp','tiff'].includes(ext))         return 'image';
  if (['pdf','doc','docx','ppt','pptx','xls','xlsx','txt','csv','odt','odp','ods'].includes(ext)) return 'document';
  return 'other';
}

export function fmtBytes(b) {
  if (!b) return '';
  if (b < 1024)    return `${b} B`;
  if (b < 1024**2) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1024**2).toFixed(1)} MB`;
}

// ── Thumbnail area ─────────────────────────────────────────────────────────────
export function CardThumbnail({ t, m, onOpen }) {
  const Icon = m.icon;
  const ext  = (t.file_extension || '').toUpperCase();

  // Image preview
  if (t.file_type === 'image' && (t.thumbnail_url || t.file_url)) {
    return (
      <div className="relative h-48 overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 cursor-pointer" onClick={onOpen}>
        <img src={t.thumbnail_url || t.file_url} alt={t.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg">
            <Eye size={16} className="text-gray-700"/>
          </div>
        </div>
        {ext && <TypeBadge ext={ext} color={m.badgeBg}/>}
      </div>
    );
  }

  // Video — brand blue/navy gradient
  if (t.file_type === 'video') {
    return (
      <div className={`relative h-48 bg-gradient-to-br ${m.gradient} overflow-hidden shrink-0 cursor-pointer`} onClick={onOpen}>
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5"/>
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-black/10"/>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-2xl border border-white/25 group-hover:scale-110 transition-transform duration-300">
            <Play size={22} className="text-white ml-1" fill="white"/>
          </div>
        </div>
        {ext && <TypeBadge ext={ext} color={m.badgeBg}/>}
      </div>
    );
  }

  // Document / Other — slate gradient with icon
  return (
    <div className={`relative h-40 bg-gradient-to-br ${m.gradient} overflow-hidden shrink-0 cursor-pointer`} onClick={onOpen}>
      <div className="absolute inset-0 opacity-[0.07]" style={{
        backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}/>
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/5"/>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg border border-white/20 group-hover:scale-105 transition-transform duration-300">
          <Icon size={24} className="text-white"/>
        </div>
        {ext && <span className="text-[10px] font-bold text-white/70 tracking-widest uppercase">.{ext}</span>}
      </div>
    </div>
  );
}

function TypeBadge({ ext, color }) {
  return (
    <span className={`absolute top-2.5 right-2.5 ${color} text-[9px] font-bold text-white px-1.5 py-0.5 rounded uppercase tracking-wide shadow`}>
      {ext}
    </span>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-100 dark:bg-gray-800"/>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-lg w-4/5"/>
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-lg w-3/5"/>
        <div className="flex gap-2 pt-1">
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-14"/>
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-10"/>
        </div>
        <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl mt-1"/>
      </div>
    </div>
  );
}

// ── Filter tabs bar ────────────────────────────────────────────────────────────
export function FilterBar({ filter, setFilter, search, setSearch, sort, setSort, counts, total }) {
  const tabs = [
    { key: 'all',      label: 'All',       icon: null,     count: total },
    { key: 'video',    label: 'Videos',    icon: Film,     count: counts.video    || 0 },
    { key: 'document', label: 'Documents', icon: FileText, count: counts.document || 0 },
    { key: 'image',    label: 'Images',    icon: ImageIcon,count: counts.image    || 0 },
    { key: 'other',    label: 'Other',     icon: File,     count: counts.other    || 0 },
  ];

  return (
    <div className="space-y-3 mb-6">
      {/* Search + sort row */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tutorials…"
            className="w-full pl-9 pr-9 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white dark:placeholder-gray-500 transition-shadow"/>
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={13}/>
            </button>
          )}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)}
          className="px-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none cursor-pointer dark:text-white text-gray-700 font-medium transition-shadow hover:border-gray-300 dark:hover:border-gray-600">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="views">Most viewed</option>
        </select>
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(tab => {
          const Icon   = tab.icon;
          const active = filter === tab.key;
          const m      = TYPE_META[tab.key];
          return (
            <button key={tab.key} onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                active
                  ? 'bg-[#2563eb] text-white shadow-md shadow-blue-500/25'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-blue-200 dark:hover:border-gray-600 hover:text-blue-600 dark:hover:text-gray-200'
              }`}>
              {Icon && <Icon size={12}/>}
              {tab.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                active ? 'bg-white/25 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
              }`}>{tab.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Full-screen file viewer ────────────────────────────────────────────────────
export function FileViewer({ item, onClose }) {
  const url  = item.file_url;
  const type = item.file_type;
  const ext  = (item.file_extension || '').toLowerCase();
  const m    = TYPE_META[type] || TYPE_META.other;
  const Icon = m.icon;

  const [txtContent, setTxtContent] = useState(null);
  const [dlLoading,  setDlLoading]  = useState(false);

  useEffect(() => {
    if (ext === 'txt' && url) {
      fetch(url).then(r => r.text()).then(setTxtContent).catch(() => setTxtContent('[Could not load text]'));
    }
  }, [ext, url]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleDownload = async () => {
    setDlLoading(true);
    try {
      const res  = await tutorialsApi.download(item.id);
      const blob = new Blob([res.data]);
      const burl = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = burl; a.download = item.file_name || item.title; a.click();
      URL.revokeObjectURL(burl);
    } catch { window.open(url, '_blank'); }
    finally { setDlLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: '#050a14' }}
      onClick={onClose}>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 shrink-0"
        style={{ background: 'rgba(5,10,20,0.98)', backdropFilter: 'blur(20px)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 min-w-0">
          {/* Type icon */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
            style={{ background: `linear-gradient(135deg, ${m.color}cc, ${m.color}88)` }}>
            <Icon size={17} className="text-white"/>
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-[15px] truncate max-w-[200px] sm:max-w-md leading-tight">{item.title}</p>
            <div className="flex items-center gap-2 mt-0.5 text-white/35 text-xs">
              {item.file_extension && <span className="uppercase font-bold tracking-wider">{item.file_extension}</span>}
              {item.file_size_display && <><span>·</span><span>{item.file_size_display}</span></>}
              {item.views > 0 && <><span>·</span><span className="flex items-center gap-1"><Eye size={10}/>{item.views}</span></>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleDownload} disabled={dlLoading}
            className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}>
            <Download size={13}/>{dlLoading ? 'Saving…' : 'Download'}
          </button>
          <a href={url} target="_blank" rel="noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-xl transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>
            <ExternalLink size={13}/> New tab
          </a>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,255,255,0.08)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.5)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>
            <X size={16} className="text-white"/>
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 flex items-center justify-center p-5 overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {type === 'image' && (
          <img src={url} alt={item.title}
            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            style={{ maxHeight: 'calc(100vh - 90px)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}/>
        )}

        {type === 'video' && (
          <video src={url} controls autoPlay
            className="max-w-full rounded-2xl"
            style={{ maxHeight: 'calc(100vh - 90px)', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}>
            Your browser does not support video playback.
          </video>
        )}

        {type === 'document' && ext === 'txt' && (
          <div className="w-full max-h-full overflow-auto rounded-2xl p-7 shadow-2xl"
            style={{ maxHeight: 'calc(100vh - 90px)', maxWidth: 860, background: 'rgba(15,20,35,0.98)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <pre className="text-white/70 text-sm whitespace-pre-wrap font-mono leading-7">
              {txtContent ?? 'Loading…'}
            </pre>
          </div>
        )}

        {type === 'document' && ext === 'pdf' && (
          <div className="w-full flex flex-col" style={{ maxHeight: 'calc(100vh - 90px)', height: '100%' }}>
            <iframe src={url} title={item.title} className="w-full flex-1 rounded-2xl border-0"
              style={{ minHeight: '70vh', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}/>
            <p className="text-white/25 text-xs text-center mt-2.5">
              Not loading? {' '}
              <button onClick={handleDownload} className="text-blue-400 hover:text-blue-300 underline transition-colors">Download</button>
              {' '}or{' '}
              <a href={url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 underline transition-colors">open in new tab</a>
            </p>
          </div>
        )}

        {(type === 'document' && ext !== 'pdf' && ext !== 'txt') || type === 'other' ? (
          <div className="text-center max-w-sm">
            <div className="w-28 h-28 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl"
              style={{ background: `${m.color}18`, border: `1px solid ${m.color}30` }}>
              <Icon size={44} style={{ color: m.color }}/>
            </div>
            <p className="text-white font-black text-xl mb-1.5 tracking-tight">{item.title}</p>
            {item.file_extension && (
              <span className="inline-block text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg mb-2"
                style={{ background: `${m.color}20`, color: m.color }}>
                .{item.file_extension}
              </span>
            )}
            {item.file_size_display && <p className="text-white/30 text-xs mb-2">{item.file_size_display}</p>}
            <p className="text-white/35 text-sm mb-8 leading-relaxed">
              {OFFICE_EXTS.has(ext)
                ? 'Office documents cannot be previewed in the browser. Download to open with Office or LibreOffice.'
                : 'This file type cannot be previewed here. Download it to open on your device.'}
            </p>
            <button onClick={handleDownload} disabled={dlLoading}
              className="inline-flex items-center gap-2.5 text-white font-bold px-8 py-3.5 rounded-2xl transition-all shadow-xl disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${m.color}, ${m.color}bb)`, boxShadow: `0 8px 24px ${m.color}40` }}>
              <Download size={17}/>{dlLoading ? 'Downloading…' : 'Download File'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
