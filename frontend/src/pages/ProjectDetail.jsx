import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Search } from 'lucide-react';
import PlotBadge from '../components/PlotBadge';
import { projectsApi } from '../services/api';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [plots, setPlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([
      projectsApi.get(id),
      projectsApi.plots(id),
    ]).then(([projRes, plotsRes]) => {
      setProject(projRes.data);
      setPlots(plotsRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const filtered = plots.filter(p => {
    const matchStatus = !statusFilter || p.status === statusFilter;
    const matchSearch = !search ||
      p.plot_no.toLowerCase().includes(search.toLowerCase()) ||
      (p.facing || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.survey_no || '').toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const sold = plots.filter(p => p.status === 'sold').length;
  const available = plots.filter(p => p.status === 'available').length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) return <div className="text-center text-gray-400 py-16">Project not found</div>;

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm"
      >
        <ArrowLeft size={16} /> Back to Projects
      </button>

      <div className="bg-primary text-white rounded-xl p-6 mb-6">
        <h1 className="text-xl font-bold">{project.name}</h1>
        {project.location && (
          <p className="text-blue-300 text-sm flex items-center gap-1 mt-1">
            <MapPin size={13} /> {project.location}
          </p>
        )}
        <div className="flex gap-6 mt-4">
          <div>
            <p className="text-3xl font-bold">{plots.length}</p>
            <p className="text-blue-300 text-xs">Total Plots</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-red-400">{sold}</p>
            <p className="text-blue-300 text-xs">Sold</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-emerald-400">{available}</p>
            <p className="text-blue-300 text-xs">Available</p>
          </div>
        </div>
        <div className="w-full bg-primary-light rounded-full h-2 mt-4">
          <div
            className="bg-accent h-2 rounded-full"
            style={{ width: `${plots.length ? (sold / plots.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search plot no, facing..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="">All Status</option>
          <option value="sold">Sold</option>
          <option value="available">Available</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Plot No</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">Area (sq.ft)</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Facing</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Road Width</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">Rate/sq.ft</th>
                <th className="text-right py-3 px-4 text-gray-500 font-medium">Total Cost</th>
                <th className="text-left py-3 px-4 text-gray-500 font-medium">Survey No</th>
                <th className="text-center py-3 px-4 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-400">No plots found</td>
                </tr>
              ) : (
                filtered.map(plot => (
                  <tr key={plot.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 px-4 font-semibold text-gray-800">{plot.plot_no}</td>
                    <td className="py-2.5 px-4 text-right">{plot.area_sqft ? plot.area_sqft.toLocaleString() : '—'}</td>
                    <td className="py-2.5 px-4 capitalize">{plot.facing || '—'}</td>
                    <td className="py-2.5 px-4">{plot.road_width || '—'}</td>
                    <td className="py-2.5 px-4 text-right">{plot.rate_per_sqft ? `₹${plot.rate_per_sqft.toLocaleString()}` : '—'}</td>
                    <td className="py-2.5 px-4 text-right font-medium">
                      {plot.total_cost ? `₹${Math.round(plot.total_cost).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-gray-500">{plot.survey_no || '—'}</td>
                    <td className="py-2.5 px-4 text-center">
                      <PlotBadge status={plot.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
