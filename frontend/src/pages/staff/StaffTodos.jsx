import { useEffect, useState, useRef } from 'react';
import {
  Calendar, ChevronLeft, ChevronRight, Trophy, CheckCircle2,
  Circle, Clock, Loader2, PartyPopper,
} from 'lucide-react';
import { todosApi } from '../../services/api';

// ── Confetti ──────────────────────────────────────────────────────────────────
function Confetti({ active }) {
  if (!active) return null;
  const COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#1E3A5F'];
  return (
    <div className="fixed inset-0 pointer-events-none z-[9990] overflow-hidden">
      {Array.from({ length: 55 }).map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: `${Math.random() * 100}%`,
          top: '-12px',
          width:  `${4 + Math.random() * 8}px`,
          height: `${4 + Math.random() * 8}px`,
          borderRadius: Math.random() > 0.4 ? '50%' : '3px',
          background: COLORS[Math.floor(Math.random() * COLORS.length)],
          animation: `confettiFall ${1.4 + Math.random() * 2}s ease-in forwards`,
          animationDelay: `${Math.random() * 0.6}s`,
        }}/>
      ))}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg) scale(0.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────────
const COLUMNS = [
  {
    key: 'todo',
    label: 'To-do',
    badgeCls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    dotColor: '#3b82f6',
    emptyMsg: 'No pending tasks — great work!',
    filter: (t) => !t.is_completed_by_me,
  },
  {
    key: 'done',
    label: 'Done',
    badgeCls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    dotColor: '#10b981',
    emptyMsg: 'No completed tasks yet',
    filter: (t) => t.is_completed_by_me,
  },
];

const PRIORITY_META = {
  high:   { label: 'High',   cls: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',        dot: 'bg-red-500' },
  medium: { label: 'Medium', cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  low:    { label: 'Low',    cls: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',        dot: 'bg-gray-400' },
};

function getWeekStart(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1 + offset * 7);
  return d.toISOString().split('T')[0];
}
function getWeekEnd(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 7 + offset * 7);
  return d.toISOString().split('T')[0];
}
const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtShort = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

// ── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ todo, onToggle, toggling }) {
  const pm   = PRIORITY_META[todo.priority] || PRIORITY_META.medium;
  const done = todo.is_completed_by_me;
  const busy = toggling === todo.id;

  return (
    <div
      onClick={() => !busy && onToggle(todo)}
      className={`group bg-white dark:bg-gray-800 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 p-3.5 cursor-pointer select-none ${
        done
          ? 'border-emerald-200 dark:border-emerald-800/50 opacity-80'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}>

      {/* Header row */}
      <div className="flex items-start gap-2.5 mb-2">
        <div className="mt-0.5 shrink-0">
          {busy
            ? <Loader2 size={18} className="animate-spin text-blue-400"/>
            : done
            ? <CheckCircle2 size={18} className="text-emerald-500"/>
            : <Circle size={18} className="text-gray-300 dark:text-gray-600 group-hover:text-blue-400 transition-colors"/>
          }
        </div>
        <p className={`font-bold text-sm leading-snug flex-1 ${
          done ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-white'
        }`}>{todo.title}</p>
      </div>

      {/* Description */}
      {todo.description && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mb-2.5 line-clamp-2 pl-7">{todo.description}</p>
      )}

      {/* Due date row */}
      {todo.due_date && (
        <div className="flex items-center gap-1.5 mb-2.5 pl-7">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Due Date</span>
          <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">{fmtDate(todo.due_date)}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pl-7">
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${pm.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${pm.dot}`}/>
          {pm.label}
        </span>
        {done && (
          <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 size={9}/> Completed
          </span>
        )}
      </div>
    </div>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ col, todos, onToggle, toggling }) {
  return (
    <div className="flex flex-col min-w-[260px] w-[260px] shrink-0 sm:min-w-0 sm:w-auto sm:flex-1">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${col.badgeCls}`}>
            {col.label}
          </span>
          <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-black flex items-center justify-center">
            {todos.length}
          </span>
        </div>
        <div className="w-2 h-2 rounded-full" style={{ background: col.dotColor }}/>
      </div>

      {/* Cards */}
      <div className="space-y-2.5 flex-1">
        {todos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2">
              <Circle size={18} className="text-gray-300 dark:text-gray-600"/>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">{col.emptyMsg}</p>
          </div>
        ) : (
          todos.map(t => (
            <TaskCard key={t.id} todo={t} onToggle={onToggle} toggling={toggling}/>
          ))
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function StaffTodos() {
  const [todos,      setTodos]      = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [toggling,   setToggling]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [confetti,   setConfetti]   = useState(false);
  const prevAllDoneRef = useRef(false);

  const weekStart = getWeekStart(weekOffset);
  const weekEnd   = getWeekEnd(weekOffset);

  const load = () => {
    setLoading(true);
    todosApi.list({ week_start: weekStart })
      .then(r => setTodos(r.data.results || r.data || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [weekStart]);

  const weekLabel = weekOffset === 0 ? 'This Week'
    : weekOffset === 1 ? 'Next Week'
    : weekOffset === -1 ? 'Last Week'
    : `Week of ${fmtShort(weekStart)}`;

  const done    = todos.filter(t => t.is_completed_by_me).length;
  const total   = todos.length;
  const pct     = total ? Math.round((done / total) * 100) : 0;
  const allDone = total > 0 && done === total;

  // Trigger confetti when all tasks are done
  useEffect(() => {
    if (allDone && !prevAllDoneRef.current) {
      setConfetti(true);
      setTimeout(() => setConfetti(false), 4000);
    }
    prevAllDoneRef.current = allDone;
  }, [allDone]);

  const handleToggle = async (todo) => {
    setToggling(todo.id);
    try {
      if (todo.is_completed_by_me) {
        await todosApi.uncomplete(todo.id);
      } else {
        await todosApi.complete(todo.id);
      }
      load();
    } finally { setToggling(null); }
  };

  // Group todos into columns
  const grouped = {
    todo: todos.filter(t => !t.is_completed_by_me),
    done: todos.filter(t => t.is_completed_by_me),
  };

  /* ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col">
      <Confetti active={confetti}/>

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Task Board</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Tasks assigned for the week</p>
        </div>
        {allDone && total > 0 && (
          <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/25">
            <PartyPopper size={15}/> All done — great work!
          </div>
        )}
      </div>

      {/* ── Week nav + progress bar ── */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 mb-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setWeekOffset(w => w - 1)}
            className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium transition">
            <ChevronLeft size={16}/>
          </button>

          <div className="text-center">
            <p className="font-bold text-gray-800 dark:text-white text-sm flex items-center justify-center gap-1.5">
              <Calendar size={13} className="text-blue-500"/>
              {weekLabel}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              {fmtShort(weekStart)} — {fmtShort(weekEnd)}
            </p>
          </div>

          <button onClick={() => setWeekOffset(w => w + 1)}
            className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium transition">
            <ChevronRight size={16}/>
          </button>
        </div>

        {/* Progress */}
        {total > 0 && (
          <>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                {allDone ? <Trophy size={11} className="text-amber-500"/> : <Clock size={11}/>}
                {done} of {total} tasks complete
              </span>
              <span className={`text-[11px] font-black ${allDone ? 'text-emerald-500' : 'text-blue-500'}`}>{pct}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${allDone ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
                style={{ width: `${pct}%` }}/>
            </div>
          </>
        )}
      </div>

      {/* ── Kanban board ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={22} className="animate-spin text-blue-500"/>
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
            <CheckCircle2 size={26} className="text-gray-300 dark:text-gray-600"/>
          </div>
          <p className="font-bold text-gray-600 dark:text-gray-300 text-base">No tasks for {weekLabel.toLowerCase()}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Check back when your admin assigns new tasks</p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.key}
              col={col}
              todos={grouped[col.key] || []}
              onToggle={handleToggle}
              toggling={toggling}
            />
          ))}
        </div>
      )}
    </div>
  );
}
