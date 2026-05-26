import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, MapPin, BarChart3, Settings } from 'lucide-react';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/plots', icon: MapPin, label: 'All Plots' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-primary text-white flex flex-col fixed left-0 top-0 z-10">
      <div className="px-6 py-6 border-b border-primary-light">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center font-bold text-white text-lg">
            i5
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-tight">i5 Nexus</h1>
            <p className="text-xs text-blue-300">Real Estate Portal</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent text-white'
                  : 'text-blue-200 hover:bg-primary-light hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-primary-light">
        <p className="text-xs text-blue-400">i5 Real Estate Group</p>
        <p className="text-xs text-blue-500">© 2026</p>
      </div>
    </aside>
  );
}
