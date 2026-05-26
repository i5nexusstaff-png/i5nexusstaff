import { useNavigate } from 'react-router-dom';
import { MapPin, TrendingUp } from 'lucide-react';

export default function ProjectCard({ project }) {
  const navigate = useNavigate();
  const pct = project.sold_percentage || 0;

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md hover:border-accent transition-all"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-gray-800 text-base">{project.name}</h3>
          {project.location && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <MapPin size={11} />
              {project.location}
            </p>
          )}
        </div>
        <span className="text-xs font-semibold text-accent bg-amber-50 px-2 py-1 rounded-full">
          {pct}% sold
        </span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
        <div
          className="bg-accent h-2 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded-lg py-2">
          <p className="text-lg font-bold text-gray-800">{project.total_plots || (project.sold_plots + project.available_plots)}</p>
          <p className="text-xs text-gray-400">Total</p>
        </div>
        <div className="bg-red-50 rounded-lg py-2">
          <p className="text-lg font-bold text-sold">{project.sold_plots}</p>
          <p className="text-xs text-red-400">Sold</p>
        </div>
        <div className="bg-emerald-50 rounded-lg py-2">
          <p className="text-lg font-bold text-available">{project.available_plots}</p>
          <p className="text-xs text-emerald-400">Available</p>
        </div>
      </div>
    </div>
  );
}
