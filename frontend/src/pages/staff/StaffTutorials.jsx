import { useEffect, useState, useCallback } from 'react';
import { BookOpen } from 'lucide-react';
import { tutorialsApi } from '../../services/api';
import { VideoCard, VideoModal, FilterBar } from '../../components/TutorialsShared';

export default function StaffTutorials() {
  const [videos,  setVideos]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [sort,    setSort]    = useState('newest');
  const [playing, setPlaying] = useState(null);

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

  const handlePlay = async (video) => {
    setPlaying(video);
    try {
      await tutorialsApi.view(video.id);
      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, views: v.views + 1 } : v));
    } catch { /* ignore */ }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Tutorials</h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Watch training and walkthrough videos</p>
      </div>

      <FilterBar search={search} setSearch={setSearch} sort={sort} setSort={setSort} />

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
          <BookOpen size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="font-bold text-gray-500 dark:text-gray-400">
            {videos.length === 0 ? 'No tutorials available yet' : 'No videos match your search'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(video => (
              <VideoCard key={video.id} video={video} onPlay={handlePlay} canDelete={false} />
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-right">
            {filtered.length} of {videos.length} videos
          </p>
        </>
      )}

      {playing && <VideoModal video={playing} onClose={() => setPlaying(null)} />}
    </div>
  );
}
