import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, X, RefreshCw, AlertTriangle, ChevronDown } from 'lucide-react';
import { tutorialsApi } from '../../services/api';
import { VideoCard, VideoModal, FilterBar } from '../../components/TutorialsShared';

function YTIcon({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

function extractVideoId(url) {
  const patterns = [
    /youtu\.be\/([^?&/\s]+)/,
    /youtube\.com\/watch\?v=([^&/\s]+)/,
    /youtube\.com\/embed\/([^?&/\s]+)/,
    /youtube\.com\/shorts\/([^?&/\s]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

const EMPTY_FORM = { title: '', youtube_url: '', description: '' };

export default function AdminTutorials() {
  const [videos,    setVideos]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [sort,      setSort]      = useState('newest');
  const [playing,   setPlaying]   = useState(null);
  const [showAdd,   setShowAdd]   = useState(false);
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [formErr,   setFormErr]   = useState('');
  const [delTarget, setDelTarget] = useState(null);
  const [deleting,  setDeleting]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await tutorialsApi.list();
      setVideos(r.data.results || r.data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = videos
    .filter(v => !search || v.title.toLowerCase().includes(search.toLowerCase()) ||
                             v.description?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'oldest')  return new Date(a.uploaded_at) - new Date(b.uploaded_at);
      if (sort === 'popular') return b.views - a.views;
      return new Date(b.uploaded_at) - new Date(a.uploaded_at);
    });

  const handleAdd = async () => {
    setFormErr('');
    if (!form.title.trim())       return setFormErr('Title is required.');
    if (!form.youtube_url.trim()) return setFormErr('YouTube URL is required.');
    if (!extractVideoId(form.youtube_url)) return setFormErr('Please enter a valid YouTube URL.');
    setSaving(true);
    try {
      await tutorialsApi.create(form);
      setShowAdd(false); setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      setFormErr(e.response?.data?.youtube_url?.[0] || e.response?.data?.detail || 'Failed to add video.');
    } finally { setSaving(false); }
  };

  const handlePlay = async (video) => {
    setPlaying(video);
    try {
      await tutorialsApi.view(video.id);
      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, views: v.views + 1 } : v));
    } catch { /* ignore */ }
  };

  const confirmDelete = async () => {
    if (!delTarget) return;
    setDeleting(true);
    try {
      await tutorialsApi.delete(delTarget.id);
      setVideos(prev => prev.filter(v => v.id !== delTarget.id));
      setDelTarget(null);
    } catch { alert('Delete failed.'); }
    finally { setDeleting(false); }
  };

  const totalViews = videos.reduce((s, v) => s + v.views, 0);

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Tutorials</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Manage YouTube training videos for staff</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setForm(EMPTY_FORM); setFormErr(''); }}
          className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-red-500/20 hover:opacity-95 transition-all"
        >
          <Plus size={15} /> Add Video
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Total Videos', value: videos.length,  color: 'text-gray-800 dark:text-white' },
          { label: 'Total Views',  value: totalViews,     color: 'text-blue-600 dark:text-blue-400' },
          { label: 'This Month',   value: videos.filter(v => new Date(v.uploaded_at) > new Date(Date.now() - 30*24*60*60*1000)).length, color: 'text-emerald-600 dark:text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter bar ── */}
      <FilterBar search={search} setSearch={setSearch} sort={sort} setSort={setSort} />

      {/* ── Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-pulse">
              <div className="bg-gray-100 dark:bg-gray-800" style={{ aspectRatio: '16/9' }} />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-lg w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-lg w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <YTIcon size={40} className="mx-auto text-red-300 dark:text-red-700 mb-3" />
          <p className="font-bold text-gray-500 dark:text-gray-400">
            {videos.length === 0 ? 'No videos yet' : 'No videos match your search'}
          </p>
          {videos.length === 0 && (
            <button
              onClick={() => { setShowAdd(true); setForm(EMPTY_FORM); setFormErr(''); }}
              className="mt-4 flex items-center gap-2 mx-auto px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors"
            >
              <Plus size={14} /> Add your first video
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(video => (
            <VideoCard key={video.id} video={video} onPlay={handlePlay} onDelete={setDelTarget} canDelete />
          ))}
        </div>
      )}

      {playing && <VideoModal video={playing} onClose={() => setPlaying(null)} />}

      {/* ════ ADD VIDEO MODAL ════ */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg ring-1 ring-white/10">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-md">
                  <YTIcon size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-black text-gray-800 dark:text-white">Add YouTube Video</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Paste any YouTube link</p>
                </div>
              </div>
              <button onClick={() => setShowAdd(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors">
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* URL */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">YouTube URL *</label>
                <div className="relative">
                  <YTIcon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none" />
                  <input
                    value={form.youtube_url}
                    onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))}
                    placeholder="https://youtu.be/... or https://youtube.com/watch?v=..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  />
                </div>
                {/* Live preview */}
                {form.youtube_url && (() => {
                  const vid = extractVideoId(form.youtube_url);
                  return vid ? (
                    <div className="mt-2 flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                      <img src={`https://img.youtube.com/vi/${vid}/default.jpg`} className="w-16 h-10 object-cover rounded-lg" alt="" />
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">✓ Valid YouTube video</span>
                    </div>
                  ) : (
                    <p className="mt-1.5 text-xs text-red-500">⚠ Could not detect a YouTube video ID</p>
                  );
                })()}
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. How to use the CRM dashboard"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                  Description <span className="font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Brief description of what this video covers…"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
              </div>

              {formErr && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                  <AlertTriangle size={14} className="shrink-0" />{formErr}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowAdd(false)}
                  className="flex-1 py-2.5 text-sm border border-gray-200 dark:border-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium">
                  Cancel
                </button>
                <button onClick={handleAdd} disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-md shadow-red-500/20">
                  {saving ? <><RefreshCw size={14} className="animate-spin" /> Adding…</> : <><Plus size={14} /> Add Video</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ DELETE CONFIRM ════ */}
      {delTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm ring-1 ring-black/10 dark:ring-white/10">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="font-black text-gray-800 dark:text-white text-lg mb-2">Delete Video?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                "<span className="font-semibold text-gray-700 dark:text-gray-200">{delTarget.title}</span>" will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDelTarget(null)} disabled={deleting}
                  className="flex-1 py-2.5 text-sm border border-gray-200 dark:border-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium disabled:opacity-50">
                  Cancel
                </button>
                <button onClick={confirmDelete} disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all shadow-md shadow-red-500/20 disabled:opacity-60">
                  {deleting ? <><RefreshCw size={14} className="animate-spin" /> Deleting…</> : <><Trash2 size={14} /> Delete</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
