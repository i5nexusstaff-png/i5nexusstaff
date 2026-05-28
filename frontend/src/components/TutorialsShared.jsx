import { useState } from 'react';
import { X, Eye, Play, Search, ChevronDown, User, Calendar } from 'lucide-react';

// Inline YouTube logo SVG (not in this version of lucide-react)
function YTIcon({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── YouTube Video Card ─────────────────────────────────────────────────────────
export function VideoCard({ video, onPlay, onDelete, canDelete }) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <div className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:border-accent/30 transition-all overflow-hidden flex flex-col">

      {/* ── Thumbnail ── */}
      <div
        className="relative overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer"
        style={{ aspectRatio: '16/9' }}
        onClick={() => onPlay(video)}
      >
        {video.thumbnail_url && !imgErr ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-red-500/20 to-red-700/30 flex items-center justify-center">
            <YTIcon size={48} className="text-red-500/60" />
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-all duration-300" />

        {/* Red play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-2xl
                          scale-90 group-hover:scale-105 opacity-85 group-hover:opacity-100 transition-all duration-300">
            <Play size={22} fill="white" className="text-white ml-1" />
          </div>
        </div>

        {/* Delete button (admin only) */}
        {canDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(video); }}
            className="absolute top-2 right-2 w-7 h-7 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
            title="Delete video"
          >
            <X size={13} className="text-white" />
          </button>
        )}
      </div>

      {/* ── Info ── */}
      <div className="p-4 flex flex-col flex-1">
        <h3
          className="font-bold text-gray-800 dark:text-white text-sm leading-snug mb-1.5 line-clamp-2 cursor-pointer hover:text-accent transition-colors"
          onClick={() => onPlay(video)}
        >
          {video.title}
        </h3>

        {video.description && (
          <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 mb-3 leading-relaxed">
            {video.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
          <div className="flex items-center gap-1">
            <User size={11} />
            <span>{video.added_by_name || 'Admin'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Eye size={11} />{video.views}</span>
            <span className="flex items-center gap-1"><Calendar size={11} />{timeAgo(video.uploaded_at)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── YouTube Player Modal ───────────────────────────────────────────────────────
export function VideoModal({ video, onClose }) {
  if (!video) return null;

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative w-full max-w-4xl" onClick={e => e.stopPropagation()}>
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-medium transition-colors"
        >
          <X size={18} /> Close
        </button>

        {/* Title */}
        <div className="mb-3">
          <h2 className="text-white font-bold text-lg leading-tight">{video.title}</h2>
          {video.description && (
            <p className="text-white/60 text-sm mt-1 line-clamp-2">{video.description}</p>
          )}
        </div>

        {/* iframe */}
        <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9' }}>
          {video.embed_url ? (
            <iframe
              src={`${video.embed_url}?autoplay=1&rel=0&modestbranding=1`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 w-full h-full border-0"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 gap-3">
              <YTIcon size={48} />
              <p className="text-sm">Invalid YouTube URL</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 mt-3 text-white/50 text-xs flex-wrap">
          <span className="flex items-center gap-1"><User size={11} />{video.added_by_name || 'Admin'}</span>
          <span className="flex items-center gap-1"><Eye size={11} />{video.views} views</span>
          <span className="flex items-center gap-1"><Calendar size={11} />{timeAgo(video.uploaded_at)}</span>
          <a
            href={video.youtube_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 text-red-400 hover:text-red-300 font-semibold transition-colors"
          >
            <YTIcon size={13} /> Watch on YouTube
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Search + sort bar (no category chips) ─────────────────────────────────────
export function FilterBar({ search, setSearch, sort, setSort }) {
  return (
    <div className="flex gap-3 items-center flex-wrap mb-5">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search videos…"
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={13} />
          </button>
        )}
      </div>
      <div className="relative shrink-0">
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="pl-3 pr-8 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 appearance-none font-medium"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="popular">Most viewed</option>
        </select>
        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}
