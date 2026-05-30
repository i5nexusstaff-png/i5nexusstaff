import { useEffect, useState, useRef } from 'react';
import { useConfirm } from '../../components/ConfirmDialog';
import {
  Plus, Trash2, Calendar, ChevronLeft, ChevronRight, X,
  AlertCircle, Search, CheckCircle2, Circle, Loader2,
  Users, UserCheck, ChevronDown,
} from 'lucide-react';
import { todosApi, usersApi } from '../../services/api';

const PRIORITY_META = {
  high:   { label: 'High',   cls: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',        dot: 'bg-red-500'   },
  medium: { label: 'Medium', cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  low:    { label: 'Low',    cls: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',        dot: 'bg-gray-400'  },
};

function getWeekStart(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1 + offset * 7);
  return d.toISOString().split('T')[0];
}

const fmtDate = (d) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// ── Add Task Modal ─────────────────────────────────────────────────────────────
function AddTaskModal({ weekStart, onDone, onCancel, staffList }) {
  const [form, setForm]           = useState({ title: '', description: '', priority: 'medium', due_date: '' });
  const [assignMode, setAssignMode] = useState('all');
  const [assignedTo, setAssignedTo] = useState([]);
  const [staffSearch, setStaffSearch] = useState('');
  const [saving, setSaving]         = useState(false);

  const filteredStaff = (staffList || []).filter(s =>
    (s.full_name || s.username || '').toLowerCase().includes(staffSearch.toLowerCase())
  );

  const toggleUser = (id) =>
    setAssignedTo(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    if (assignMode === 'specific' && assignedTo.length === 0) return;
    setSaving(true);
    try {
      await todosApi.create({
        ...form,
        status: 'todo',
        week_start: weekStart,
        assigned_to_all: assignMode === 'all',
        assigned_to: assignMode === 'specific' ? assignedTo : [],
      });
      onDone();
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-gray-800 dark:text-white">Add New Task</h3>
          <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X size={16}/>
          </button>
        </div>
        <div className="p-6 space-y-3 overflow-y-auto max-h-[75vh]">
          <input autoFocus value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') onCancel(); }}
            placeholder="Task title…"
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder-gray-400"/>
          <textarea value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional)" rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none placeholder-gray-400"/>
          <div className="flex gap-2">
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
              className="flex-1 px-2.5 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl focus:outline-none">
              <option value="high">🔴 High</option>
              <option value="medium">🟡 Medium</option>
              <option value="low">⚪ Low</option>
            </select>
            <input type="date" value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
              className="flex-1 px-2.5 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-xl focus:outline-none"/>
          </div>

          {/* Assign to */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Assign to</p>
            <div className="flex gap-1.5">
              {[['all', <Users size={11}/>, 'All Staff', 'bg-blue-600 border-blue-600'],
                ['specific', <UserCheck size={11}/>, 'Specific', 'bg-indigo-600 border-indigo-600']].map(([mode, icon, label, activeCls]) => (
                <button key={mode} type="button" onClick={() => setAssignMode(mode)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    assignMode === mode ? `${activeCls} text-white` : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}>
                  {icon}{label}
                </button>
              ))}
            </div>
            {assignMode === 'specific' && (
              <div className="mt-2 border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
                <div className="relative">
                  <input value={staffSearch} onChange={e => setStaffSearch(e.target.value)}
                    placeholder="Search staff…"
                    className="w-full pl-3 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 dark:text-white focus:outline-none border-b border-gray-200 dark:border-gray-600"/>
                </div>
                <div className="max-h-[120px] overflow-y-auto">
                  {filteredStaff.map(s => (
                    <label key={s.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                      <input type="checkbox" checked={assignedTo.includes(s.id)} onChange={() => toggleUser(s.id)}
                        className="w-3 h-3 accent-indigo-600"/>
                      <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-white text-[9px] font-black shrink-0">
                        {(s.full_name || s.username || '?')[0].toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{s.full_name || s.username}</span>
                    </label>
                  ))}
                </div>
                {assignedTo.length > 0 && (
                  <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                      {assignedTo.length} person{assignedTo.length > 1 ? 's' : ''} selected
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onCancel}
              className="flex-1 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium">
              Cancel
            </button>
            <button onClick={handleAdd}
              disabled={saving || !form.title.trim() || (assignMode === 'specific' && assignedTo.length === 0)}
              className="flex-1 py-2 text-sm font-bold text-white rounded-xl transition disabled:opacity-40 flex items-center justify-center gap-1.5"
              style={{ background: 'linear-gradient(135deg,#1E3A5F,#2563eb)' }}>
              {saving ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>}
              Add Task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Task Card ──────────────────────────────────────────────────────────────────
function TaskCard({ todo, onDelete }) {
  const pm = PRIORITY_META[todo.priority] || PRIORITY_META.medium;
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 dark:text-white text-sm leading-snug">{todo.title}</p>
          {todo.description && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mt-1 line-clamp-2">{todo.description}</p>
          )}
        </div>
        <button onClick={() => onDelete(todo.id)}
          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0">
          <Trash2 size={14}/>
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap mt-3">
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${pm.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${pm.dot}`}/>
          {pm.label}
        </span>
        {todo.due_date && (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium flex items-center gap-1">
            <Calendar size={9}/>{fmtDate(todo.due_date)}
          </span>
        )}
        {!todo.assigned_to_all && todo.assigned_to?.length > 0 ? (
          <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold flex items-center gap-1">
            <UserCheck size={9}/>{todo.assigned_to.length} assigned
          </span>
        ) : (
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium flex items-center gap-1">
            <Users size={9}/>All staff
          </span>
        )}
        {todo.completion_count > 0 && (
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 size={9}/>{todo.completion_count} completed
          </span>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function AdminTodos() {
  const confirm = useConfirm();
  const [todos,      setTodos]      = useState([]);
  const [staffList,  setStaffList]  = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [search,     setSearch]     = useState('');
  const [priFilter,  setPriFilter]  = useState('all');
  const [loading,    setLoading]    = useState(true);
  const [showAdd,    setShowAdd]    = useState(false);

  const weekStart = getWeekStart(weekOffset);

  const load = () => {
    setLoading(true);
    todosApi.list({ week_start: weekStart })
      .then(r => setTodos(r.data.results || r.data || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [weekStart]);

  useEffect(() => {
    usersApi.staffList()
      .then(r => setStaffList(r.data?.results || r.data || []))
      .catch(() => {});
  }, []);

  const weekLabel = weekOffset === 0 ? 'This Week'
    : weekOffset === 1 ? 'Next Week'
    : weekOffset === -1 ? 'Last Week'
    : `Week of ${fmtDate(weekStart)}`;

  const filtered = todos.filter(t => {
    const matchPri    = priFilter === 'all' || t.priority === priFilter;
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
    return matchPri && matchSearch;
  });

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete task?',
      message: 'This task will be permanently removed for all staff.',
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (!ok) return;
    await todosApi.delete(id);
    load();
  };

  return (
    <div className="flex flex-col gap-5">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Task Board</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">
            {weekLabel} · {filtered.length} task{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        {/* Single Add button */}
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-bold rounded-xl shadow-md transition-all hover:shadow-lg"
          style={{ background: 'linear-gradient(135deg,#1E3A5F,#2563eb)' }}>
          <Plus size={16}/> Add Task
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Week nav */}
        <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1.5 shadow-sm">
          <button onClick={() => setWeekOffset(w => w - 1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <ChevronLeft size={14}/>
          </button>
          <div className="flex items-center gap-1.5 px-2">
            <Calendar size={12} className="text-gray-400"/>
            <span className="text-xs font-bold text-gray-700 dark:text-white whitespace-nowrap">{weekLabel}</span>
          </div>
          <button onClick={() => setWeekOffset(w => w + 1)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition">
            <ChevronRight size={14}/>
          </button>
        </div>

        {/* Priority filter */}
        <div className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-sm text-xs font-semibold text-gray-600 dark:text-gray-300">
          <AlertCircle size={12} className="text-gray-400 shrink-0"/>
          <span className="text-gray-400 mr-1">Priority:</span>
          <select value={priFilter} onChange={e => setPriFilter(e.target.value)}
            className="bg-transparent focus:outline-none font-bold text-gray-700 dark:text-white cursor-pointer">
            <option value="all">All</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks…"
            className="w-full pl-8 pr-4 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white shadow-sm"/>
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={12}/>
            </button>
          )}
        </div>
      </div>

      {/* ── Task list ── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-blue-500"/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
            <Circle size={24} className="text-gray-300 dark:text-gray-600"/>
          </div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No tasks yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Click "Add Task" to create the first task for this week</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(t => (
            <TaskCard key={t.id} todo={t} onDelete={handleDelete}/>
          ))}
        </div>
      )}

      {/* ── Add task modal ── */}
      {showAdd && (
        <AddTaskModal
          weekStart={weekStart}
          staffList={staffList}
          onDone={() => { setShowAdd(false); load(); }}
          onCancel={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
