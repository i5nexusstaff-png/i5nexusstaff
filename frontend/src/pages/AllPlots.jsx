import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import PlotBadge from '../components/PlotBadge';
import { plotsApi, projectsApi } from '../services/api';

export default function AllPlots() {
  const [plots, setPlots] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    Promise.all([plotsApi.list(), projectsApi.list()]).then(([plotsRes, projRes]) => {
      setPlots(plotsRes.data.results || plotsRes.data);
      setProjects(projRes.data.results || projRes.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const params = {};
    if (projectFilter) params.project = projectFilter;
    if (statusFilter) params.status = statusFilter;
    plotsApi.list(params).then(res => setPlots(res.data.results || res.data));
  }, [projectFilter, statusFilter]);

  const filtered = plots.filter(p =>
    !search ||
    p.plot_no.toLowerCase().includes(search.toLowerCase()) ||
    (p.facing || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.project_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">All Plots</h1>
        <p className="text-gray-500 text-sm mt-1">{plots.length} plots across all projects</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search plot no, facing, project..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>
        <select
          value={projectFilter}
          onChange={e => setProjectFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="">All Projects</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
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

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Project</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Plot No</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Area (sq.ft)</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Facing</th>
                  <th className="text-left py-3 px-4 text-gray-500 font-medium">Road Width</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Rate/sq.ft</th>
                  <th className="text-right py-3 px-4 text-gray-500 font-medium">Total Cost</th>
                  <th className="text-center py-3 px-4 text-gray-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">No plots found</td></tr>
                ) : (
                  filtered.map(plot => (
                    <tr key={plot.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 px-4 text-xs text-gray-500">{plot.project_name}</td>
                      <td className="py-2.5 px-4 font-semibold text-gray-800">{plot.plot_no}</td>
                      <td className="py-2.5 px-4 text-right">{plot.area_sqft ? plot.area_sqft.toLocaleString() : '—'}</td>
                      <td className="py-2.5 px-4 capitalize">{plot.facing || '—'}</td>
                      <td className="py-2.5 px-4">{plot.road_width || '—'}</td>
                      <td className="py-2.5 px-4 text-right">{plot.rate_per_sqft ? `₹${plot.rate_per_sqft.toLocaleString()}` : '—'}</td>
                      <td className="py-2.5 px-4 text-right font-medium">
                        {plot.total_cost ? `₹${Math.round(plot.total_cost).toLocaleString()}` : '—'}
                      </td>
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
      )}
    </div>
  );
}
