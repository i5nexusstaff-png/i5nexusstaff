import { useEffect, useState } from 'react';
import { MapPin, Search, Maximize2, Building2, X, RefreshCw } from 'lucide-react';
import { projectsApi } from '../../services/api';
import ImageZoomViewer from '../../components/ImageZoomViewer';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  available:  { label: 'Available',  dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  booked:     { label: 'Booked',     dot: 'bg-blue-500',    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  in_process: { label: 'In Process', dot: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  blocked:    { label: 'Blocked',    dot: 'bg-gray-400',    badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
  sold:       { label: 'Sold',       dot: 'bg-red-500',     badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};
const STATUSES = Object.keys(STATUS_CFG);

function fmtINR(n) {
  if (!n && n !== 0) return '—';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

export default function StaffProjects() {
  const [projects,     setProjects]     = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [plots,        setPlots]        = useState([]);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loadingPlots, setLoadingPlots] = useState(false);
  const [zoomImg,      setZoomImg]      = useState(null);

  useEffect(() => {
    projectsApi.list().then(r => setProjects(r.data.results || r.data));
  }, []);

  const openProject = async (p) => {
    setSelected(p);
    setSearch(''); setStatusFilter('all');
    setLoadingPlots(true);
    try {
      const r = await projectsApi.plots(p.id);
      setPlots(r.data);
    } finally { setLoadingPlots(false); }
  };

  const filtered = plots.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      p.plot_no?.toLowerCase().includes(q) ||
      p.facing?.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statusCount = (s) => plots.filter(p => p.status === s).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Projects</h1>
        <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">View plot availability and layout for all projects</p>
      </div>

      {/* ════ PROJECT LIST ════ */}
      {!selected ? (
        projects.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <Building2 size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="font-bold text-gray-500 dark:text-gray-400">No projects available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {projects.map(p => (
              <div key={p.id} onClick={() => openProject(p)}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-lg hover:border-accent/40 transition-all cursor-pointer overflow-hidden group">
                {p.layout_image_url ? (
                  <div className="relative h-36 overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img src={p.layout_image_url} alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <span className="absolute bottom-2 left-3 text-white font-bold text-sm drop-shadow">{p.name}</span>
                  </div>
                ) : (
                  <div className="h-20 bg-gradient-to-br from-accent/10 to-amber-400/10 flex items-center justify-center">
                    <Building2 size={32} className="text-accent/40" />
                  </div>
                )}
                <div className="p-4">
                  {!p.layout_image_url && (
                    <h3 className="font-bold text-gray-800 dark:text-white mb-1">{p.name}</h3>
                  )}
                  {p.location && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mb-3">
                      <MapPin size={11} />{p.location}
                    </p>
                  )}
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mb-3">
                    <div className="bg-gradient-to-r from-accent to-amber-500 h-1.5 rounded-full"
                      style={{ width: `${p.sold_percentage}%` }} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                    <span>{p.sold_percentage}% sold</span>
                    <span>{p.total_plots} total plots</span>
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
        )
      ) : (

        /* ════ PROJECT DETAIL ════ */
        <div>
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <button onClick={() => setSelected(null)}
              className="text-sm text-gray-400 hover:text-gray-800 dark:hover:text-white flex items-center gap-1 transition-colors">
              ‹ Projects
            </button>
            <span className="text-gray-300 dark:text-gray-600">/</span>
            <div>
              <h2 className="font-black text-gray-800 dark:text-white text-lg">{selected.name}</h2>
              {selected.location && (
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={10}/>{selected.location}
                </p>
              )}
            </div>
          </div>

          {/* Layout image */}
          {selected.layout_image_url && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 mb-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-gray-700 dark:text-white">Project Layout</p>
                <button onClick={() => setZoomImg(selected.layout_image_url)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 transition-colors font-semibold">
                  <Maximize2 size={12} /> Zoom In / Out
                </button>
              </div>
              <img
                src={selected.layout_image_url}
                alt="layout"
                onClick={() => setZoomImg(selected.layout_image_url)}
                className="w-full max-h-80 object-contain rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-zoom-in"
              />
            </div>
          )}

          {/* Status filter chips */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <button onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-gray-800 dark:bg-white text-white dark:text-gray-900 shadow-md'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300'
              }`}>
              All ({plots.length})
            </button>
            {STATUSES.map(s => (
              <button key={s} onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  statusFilter === s
                    ? STATUS_CFG[s].badge + ' ring-1 ring-current ring-offset-1'
                    : STATUS_CFG[s].badge + ' opacity-70 hover:opacity-100'
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CFG[s].dot}`} />
                {STATUS_CFG[s].label}: {statusCount(s)}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search plot no, facing…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {loadingPlots ? (
              <div className="text-center py-16 text-gray-400">
                <RefreshCw size={22} className="mx-auto mb-2 animate-spin" />
                Loading plots…
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                {plots.length === 0 ? 'No plots in this project yet.' : 'No plots match your search.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      {['Plot No', 'Area (sq.ft)', 'Facing', 'Rate/sq.ft', 'Total Cost', 'Status'].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {filtered.map(plot => {
                      const cfg = STATUS_CFG[plot.status] || STATUS_CFG.available;
                      return (
                        <tr key={plot.id} className="hover:bg-gray-50/70 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="py-3 px-4 font-black text-gray-800 dark:text-white">{plot.plot_no}</td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-300 tabular-nums">{plot.area_sqft?.toLocaleString('en-IN') || '—'}</td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-300 capitalize">{plot.facing || '—'}</td>
                          <td className="py-3 px-4 text-gray-600 dark:text-gray-300 tabular-nums">{plot.rate_per_sqft ? `₹${plot.rate_per_sqft.toLocaleString('en-IN')}` : '—'}</td>
                          <td className="py-3 px-4 font-semibold text-gray-700 dark:text-gray-200 tabular-nums">{fmtINR(plot.total_cost)}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${cfg.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Plot count footer */}
          {filtered.length > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 text-right">
              Showing {filtered.length} of {plots.length} plots
            </p>
          )}
        </div>
      )}

      {/* Layout zoom viewer */}
      {zoomImg && (
        <ImageZoomViewer
          src={zoomImg}
          title={`${selected?.name || 'Project'} — Layout`}
          onClose={() => setZoomImg(null)}
        />
      )}
    </div>
  );
}
