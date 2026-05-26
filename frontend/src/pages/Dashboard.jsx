import { useEffect, useState } from 'react';
import { Building2, MapPin, CheckCircle2, Circle, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import StatCard from '../components/StatCard';
import { projectsApi } from '../services/api';

const COLORS = ['#ef4444', '#10b981'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    projectsApi.dashboardStats().then(res => {
      setStats(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center text-gray-400 py-16">No data available</div>;
  }

  const pieData = [
    { name: 'Sold', value: stats.total_sold },
    { name: 'Available', value: stats.total_available },
  ];

  const barData = stats.project_stats.map(p => ({
    name: p.name.replace('i5 ', '').replace('Aurowin ', 'A.'),
    Sold: p.sold,
    Available: p.available,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview of all real estate projects</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Projects"
          value={stats.total_projects}
          icon={Building2}
          color="blue"
          subtitle="Active projects"
        />
        <StatCard
          title="Total Plots"
          value={stats.total_plots}
          icon={MapPin}
          color="amber"
          subtitle="Across all projects"
        />
        <StatCard
          title="Plots Sold"
          value={stats.total_sold}
          icon={CheckCircle2}
          color="red"
          subtitle={`${stats.sold_percentage}% of total`}
        />
        <StatCard
          title="Available Plots"
          value={stats.total_available}
          icon={Circle}
          color="green"
          subtitle="Ready for sale"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="stat-card">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Sold vs Available</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={(v) => [v, '']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card col-span-2">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Plots by Project</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barSize={22}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Sold" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Available" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="stat-card">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Project Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Project</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Location</th>
                <th className="text-center py-2 px-3 text-gray-500 font-medium">Total</th>
                <th className="text-center py-2 px-3 text-gray-500 font-medium">Sold</th>
                <th className="text-center py-2 px-3 text-gray-500 font-medium">Available</th>
                <th className="text-left py-2 px-3 text-gray-500 font-medium">Progress</th>
              </tr>
            </thead>
            <tbody>
              {stats.project_stats.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2.5 px-3 font-medium text-gray-800">{p.name}</td>
                  <td className="py-2.5 px-3 text-gray-400 text-xs">{p.location}</td>
                  <td className="py-2.5 px-3 text-center font-semibold">{p.total}</td>
                  <td className="py-2.5 px-3 text-center text-red-600 font-semibold">{p.sold}</td>
                  <td className="py-2.5 px-3 text-center text-emerald-600 font-semibold">{p.available}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-accent h-1.5 rounded-full" style={{ width: `${p.sold_percentage}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 w-10">{p.sold_percentage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
