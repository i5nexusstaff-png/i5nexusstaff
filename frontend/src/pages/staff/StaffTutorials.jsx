import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen, Eye, Download, Film, File, FileText,
  Image as ImageIcon, HardDrive, Layers, Play,
} from 'lucide-react';
import {
  TYPE_META, FILTERS, relativeTime,
  CardThumbnail, SkeletonCard, FilterBar, FileViewer,
} from '../../components/TutorialsShared';
import { tutorialsApi } from '../../services/api';

// ── Tutorial card (staff — no delete button) ──────────────────────────────────
function TutorialCard({ t, onOpen, onDownload }) {
  const m = TYPE_META[t.file_type] || TYPE_META.other;

  return (
    <div className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden flex flex-col">

      {/* Thumbnail */}
      <CardThumbnail t={t} m={m} onOpen={() => onOpen(t)}/>

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

        {/* Meta footer */}
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
            title="Save">
            <Download size={13}/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Stats strip ───────────────────────────────────────────────────────────────
function StatsStrip({ items }) {
  const counts = items.reduce((a, t) => { a[t.file_type] = (a[t.file_type] || 0) + 1; return a; }, {});
  const stats = [
    { label: 'All',       value: items.length,         icon: Layers,    color: '#2563eb' },
    { label: 'Videos',    value: counts.video    || 0,  icon: Film,      color: '#2563eb' },
    { label: 'Documents', value: counts.document || 0,  icon: FileText,  color: '#475569' },
    { label: 'Images',    value: counts.image    || 0,  icon: ImageIcon, color: '#64748b' },
    { label: 'Other',     value: counts.other    || 0,  icon: File,      color: '#94a3b8' },
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
              <p className="text-xl font-black text-gray-800 dark:text-white leading-none">{s.value}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium mt-0.5">{s.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function StaffTutorials() {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');
  const [sort,    setSort]    = useState('newest');
  const [viewing, setViewing] = useState(null);

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

  const openViewer = (t) => {
    tutorialsApi.view(t.id).catch(() => {});
    setViewing(t);
  };

  const handleDownload = async (t) => {
    try {
      const res  = await tutorialsApi.download(t.id);
      const blob = new Blob([res.data]);
      const burl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = burl; a.download = t.file_name || t.title; a.click();
      URL.revokeObjectURL(burl);
    } catch { window.open(t.file_url, '_blank'); }
  };

  /* ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Tutorials</h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Training materials and resources</p>
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
              <p className="font-bold text-gray-600 dark:text-gray-300 text-lg">No tutorials available yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Check back soon for training materials</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {displayed.map(t => (
            <TutorialCard key={t.id} t={t} onOpen={openViewer} onDownload={handleDownload}/>
          ))}
        </div>
      )}

      {viewing && <FileViewer item={viewing} onClose={() => setViewing(null)}/>}
    </div>
  );
}
