/**
 * PunchModeModal
 * Shown before the camera opens so the user explicitly chooses
 * how they want to punch in / out:
 *
 *   🏢  Geofencing   — must be within a saved office radius
 *   📍  GPS Tagged   — punch from any location, exact address recorded
 *
 * Both modes require a selfie; the difference is whether the
 * backend enforces the office-radius check.
 */
import { X, Building2, MapPin, ChevronRight, Camera } from 'lucide-react';

export default function PunchModeModal({ action, onSelect, onCancel }) {
  const isIn        = action === 'in';
  const actionLabel = isIn ? 'Punch In' : 'Punch Out';
  const accentColor = isIn ? 'text-emerald-600' : 'text-red-500';
  const accentDot   = isIn
    ? 'bg-emerald-500'
    : 'bg-red-500';

  return (
    <div className="fixed inset-0 z-[9990] flex items-end sm:items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>

      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden
                      animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">

        {/* ── Header ── */}
        <div className="relative px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full ${accentDot} flex items-center justify-center shrink-0`}>
              <Camera size={16} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-white leading-tight">
                Select Punch Mode
              </h3>
              <p className={`text-xs font-semibold mt-0.5 ${accentColor}`}>
                {actionLabel}
              </p>
            </div>
          </div>
          <button onClick={onCancel}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800
                       flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition">
            <X size={14} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* ── Mode options ── */}
        <div className="p-4 space-y-3">

          {/* ── Geofencing ── */}
          <button
            onClick={() => onSelect('geofence')}
            className="w-full flex items-center gap-4 p-4 rounded-xl text-left
                       border-2 border-blue-100 dark:border-blue-900/50
                       bg-gradient-to-br from-blue-50 to-blue-50/60 dark:from-blue-950/40 dark:to-blue-900/20
                       hover:border-blue-300 dark:hover:border-blue-600
                       hover:shadow-md hover:shadow-blue-100 dark:hover:shadow-blue-900/30
                       active:scale-[.98] transition-all group">

            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0
                            shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
              <Building2 size={22} className="text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 dark:text-white text-[15px]">Geofencing</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                Must be within office radius · location verified
              </p>
              <div className="flex items-center gap-1 mt-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                  Requires office proximity
                </span>
              </div>
            </div>

            <ChevronRight size={18} className="text-blue-400 dark:text-blue-500 shrink-0
                                               group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* ── GPS Tagged ── */}
          <button
            onClick={() => onSelect('gps_tagged')}
            className="w-full flex items-center gap-4 p-4 rounded-xl text-left
                       border-2 border-amber-100 dark:border-amber-900/50
                       bg-gradient-to-br from-amber-50 to-orange-50/60 dark:from-amber-950/40 dark:to-orange-900/20
                       hover:border-amber-300 dark:hover:border-amber-600
                       hover:shadow-md hover:shadow-amber-100 dark:hover:shadow-amber-900/30
                       active:scale-[.98] transition-all group">

            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shrink-0
                            shadow-lg shadow-amber-500/30 group-hover:scale-105 transition-transform">
              <MapPin size={22} className="text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-800 dark:text-white text-[15px]">GPS Tagged</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                Punch from any location · exact address recorded
              </p>
              <div className="flex items-center gap-1 mt-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                  Client visits &amp; field work
                </span>
              </div>
            </div>

            <ChevronRight size={18} className="text-amber-400 dark:text-amber-500 shrink-0
                                               group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* ── Footer note ── */}
        <div className="px-5 pb-5">
          <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1.5">
            <Camera size={11} />
            Both options require a selfie photo
          </p>
        </div>
      </div>
    </div>
  );
}
