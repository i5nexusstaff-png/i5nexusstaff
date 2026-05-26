import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { projectsApi } from '../services/api';

const COLORS = ['#ef4444', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'];

export default function Reports() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    projectsApi.dashboardStats().then(res => setStats(res.data));
  }, []);

  if (!stats) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const projectPie = stats.project_stats.map((p, i) => ({
    name: p.name,
    value: p.total,
    fill: COLORS[i % COLORS.length],
  }));

  const soldPct = stats.project_stats.map(p => ({
    name: p.name.replace('i5 ', '').replace('Aurowin ', 'A.'),
    'Sold %': p.sold_percentage,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
        <p className="text-gray-500 text-sm mt-1">Analytics and insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="stat-card">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Plots Distribution by Project</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={projectPie} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%`}>
                {projectPie.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Sales Progress by Project</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={soldPct} layout="vertical" barSize={18}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={v => [`${v}%`, 'Sold']} />
              <Bar dataKey="Sold %" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card col-span-full">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Sold vs Available by Project</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.project_stats.map(p => ({ name: p.name.replace('i5 ', ''), Sold: p.sold, Available: p.available }))} barSize={24}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Sold" fill="#ef4444" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Available" fill="#10b981" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
