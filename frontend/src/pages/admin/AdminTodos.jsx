import { useEffect, useState, useRef } from 'react';
import { useConfirm } from '../../components/ConfirmDialog';
import {
  Plus, Trash2, Calendar, ChevronLeft, ChevronRight, X,
  MoreHorizontal, GripVertical, AlertCircle, Clock, Search,
  CheckCircle2, Circle, Loader2, Users,
} from 'lucide-react';
import { todosApi } from '../../services/api';

// ── Constants ─────────────────────────────────────────────────────────────────
const COLUMNS = [
  {
    key: 'todo',
    label: 'To-do',
    badgeCls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    headerCls: 'border-t-blue-500',
    dotColor: '#3b82f6',
    emptyMsg: 'No pending tasks',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    badgeCls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    headerCls: 'border-t-amber-500',
    dotColor: '#f59e0b',
    emptyMsg: 'Nothing in progress',
  },
  {
    key: 'done',
    label: 'Done',
    badgeCls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    headerCls: 'border-t-emerald-500',
    dotColor: '#10b981',
    emptyMsg: 'No completed tasks',
  },
];

const PRIORITY_META = {
  high:   { label: 'High',   cls: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',     dot: 'bg-red-500' },
  medium: { label: 'Medium', cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  low:    { label: 'Low',    cls: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',     dot: 'bg-gray-400' },
};

function getWeekStart(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay() + 1 + offset * 7);
  return d.toISOString().split('T')[0];
}

const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// ── Add Task Form (inline in column) ─────────────────────────────────────────
function AddTaskForm({ colKey, weekStart, onDone, onCancel }) {
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', due_date: '', status: colKey,
  });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await todosApi.create({ ...form, week_start: weekStart, assigned_to_all: true });
      onDone();
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-600 shadow-lg p-3.5 space-y-2.5 mb-2">
      <input
        autoFocus
        value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') onCancel(); }}
        placeholder="Task title…"
        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder-gray-400"/>
      <textarea
        value={form.description}
        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
        placeholder="Description (optional)"
        rows={2}
        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none placeholder-gray-400"/>
      <div className="flex gap-2">
        <select
          value={form.priority}
          onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
          className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none">
          <option value="high">🔴 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">⚪ Low</option>
        </select>
        <input
          type="date"
          value={form.due_date}
          onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
          className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none"/>
      </div>
      <div className="flex gap-2 pt-0.5">
        <button onClick={onCancel}
          className="flex-1 py-1.5 text-xs border border-gray-200 dark:border-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition font-medium">
          Cancel
        </button>
        <button onClick={handleAdd} disabled={saving || !form.title.trim()}
          className="flex-1 py-1.5 text-xs font-bold text-white rounded-lg transition disabled:opacity-40 flex items-center justify-center gap-1"
          style={{ background: 'linear-gradient(135deg,#1E3A5F,#2563eb)' }}>
          {saving ? <Loader2 size={12} className="animate-spin"/> : <Plus size={12}/>}
          Add Task
        </button>
      </div>
    </div>
  );
}

// ── Todo Card ─────────────────────────────────────────────────────────────────
function TodoCard({ todo, onDelete, onDragStart, isDragging, columns }) {
  const pm      = PRIORITY_META[todo.priority] || PRIORITY_META.medium;
  const [menu,  setMenu] = useState(false);
  const menuRef = useRef();

  // Close menu on outside click
  useEffect(() => {
    if (!menu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menu]);

  const handleMoveToColumn = async (colKey) => {
    setMenu(false);
    await todosApi.update(todo.id, { status: colKey });
  };

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, todo)}
      className={`group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 p-3.5 cursor-grab active:cursor-grabbing select-none ${
        isDragging ? 'opacity-50 rotate-1 scale-105 shadow-xl' : ''
      }`}>

      {/* Card header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-bold text-gray-800 dark:text-white text-sm leading-snug flex-1">{todo.title}</p>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={e => { e.stopPropagation(); setMenu(m => !m); }}
            className="w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all">
            <MoreHorizontal size={13} className="text-gray-400"/>
          </button>
          {menu && (
            <div className="absolute right-0 top-7 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden min-w-[150px]">
              <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Move to</p>
              {columns.filter(c => c.key !== todo.status).map(col => (
                <button key={col.key} onClick={() => handleMoveToColumn(col.key)}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors">
                  <span className="w-2 h-2 rounded-full" style={{ background: col.dotColor }}/>
                  {col.label}
                </button>
              ))}
              <div className="border-t border-gray-100 dark:border-gray-700 mt-1"/>
              <button onClick={() => { setMenu(false); onDelete(todo.id); }}
                className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 transition-colors">
                <Trash2 size={11}/> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {todo.description && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed mb-2.5 line-clamp-2">{todo.description}</p>
      )}

      {/* Due date */}
      {todo.due_date && (
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Due Date</span>
          <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">{fmtDate(todo.due_date)}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-1">
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${pm.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${pm.dot}`}/>
          {pm.label}
        </span>
        {todo.completion_count > 0 && (
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
              <span className="text-[8px] font-black text-white">{todo.completion_count}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Kanban Column ─────────────────────────────────────────────────────────────
function KanbanColumn({ col, todos, onDelete, onDragStart, onDragOver, onDrop, isDragOver, draggingId, weekStart, onReload, columns }) {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div
      className="flex flex-col min-w-[260px] w-[260px] shrink-0 sm:min-w-0 sm:w-auto sm:flex-1"
      onDragOver={e => onDragOver(e, col.key)}
      onDrop={e => onDrop(e, col.key)}
      onDragLeave={() => onDragOver(null, null)}>

      {/* Column header */}
      <div className={`flex items-center justify-between mb-3 pb-3 border-b-2 ${col.headerCls} border-b-transparent`}>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${col.badgeCls}`}>
            {col.label}
          </span>
          <span className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[10px] font-black flex items-center justify-center">
            {todos.length}
          </span>
        </div>
        <button
          onClick={() => setShowAdd(s => !s)}
          className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors text-gray-500 dark:text-gray-400"
          title={`Add task to ${col.label}`}>
          <Plus size={14}/>
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <AddTaskForm
          colKey={col.key}
          weekStart={weekStart}
          onDone={() => { setShowAdd(false); onReload(); }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Drop zone + cards */}
      <div className={`flex-1 space-y-2.5 min-h-[120px] rounded-xl transition-all duration-200 ${
        isDragOver ? 'bg-blue-50 dark:bg-blue-900/10 ring-2 ring-blue-300 dark:ring-blue-700 ring-dashed p-1' : ''
      }`}>
        {todos.length === 0 && !showAdd ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2">
              <Circle size={18} className="text-gray-300 dark:text-gray-600"/>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">{col.emptyMsg}</p>
          </div>
        ) : (
          todos.map(t => (
            <TodoCard
              key={t.id}
              todo={t}
              onDelete={onDelete}
              onDragStart={onDragStart}
              isDragging={draggingId === t.id}
              columns={columns}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export default function AdminTodos() {
  const confirm = useConfirm();
  const [todos,      setTodos]      = useState([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [search,     setSearch]     = useState('');
  const [priFilter,  setPriFilter]  = useState('all');
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverCol,setDragOverCol]= useState(null);
  const [loading,    setLoading]    = useState(true);

  const weekStart = getWeekStart(weekOffset);

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
    : `Week of ${fmtDate(weekStart)}`;

  // Filtered list
  const filtered = todos.filter(t => {
    const matchPri    = priFilter === 'all' || t.priority === priFilter;
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
    return matchPri && matchSearch;
  });

  // Group by status
  const grouped = COLUMNS.reduce((acc, col) => {
    acc[col.key] = filtered.filter(t => (t.status || 'todo') === col.key);
    return acc;
  }, {});

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

  // ── Drag & Drop ─────────────────────────────────────────────────────────
  const handleDragStart = (e, todo) => {
    setDraggingId(todo.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, colKey) => {
    if (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
    setDragOverCol(colKey);
  };

  const handleDrop = async (e, colKey) => {
    e.preventDefault();
    const id = draggingId;
    setDraggingId(null);
    setDragOverCol(null);
    if (!id) return;
    const todo = todos.find(t => t.id === id);
    if (!todo || (todo.status || 'todo') === colKey) return;
    // Optimistic update
    setTodos(prev => prev.map(t => t.id === id ? { ...t, status: colKey } : t));
    try {
      await todosApi.update(id, { status: colKey });
    } catch { load(); }
  };

  const totalDone = todos.filter(t => (t.status || 'todo') === 'done').length;

  /* ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-full">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">Task Board</h1>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">Weekly tasks assigned to all staff</p>
        </div>
        <div className="flex items-center gap-2">
          {totalDone > 0 && (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-xl">
              <CheckCircle2 size={12}/>{totalDone} done this week
            </span>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
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
            <option value="all">All Tasks</option>
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

      {/* ── Kanban board ── */}
      {loading ? (
        <div className="flex items-center justify-center flex-1 py-24">
          <Loader2 size={24} className="animate-spin text-blue-500"/>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1"
          onDragEnd={() => { setDraggingId(null); setDragOverCol(null); }}>
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.key}
              col={col}
              todos={grouped[col.key] || []}
              onDelete={handleDelete}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              isDragOver={dragOverCol === col.key}
              draggingId={draggingId}
              weekStart={weekStart}
              onReload={load}
              columns={COLUMNS}
            />
          ))}
        </div>
      )}
    </div>
  );
}
