/**
 * MadhavamLayout.jsx
 * Interactive SVG plot layout for CK Madhavan Nagar.
 * Theatre-seat style: click a plot → booking drawer → admin approval flow.
 * Real-time updates via WebSocket (Django Channels).
 */
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  X, ZoomIn, ZoomOut, RotateCcw, CheckCircle2, XCircle,
  Clock, Search, ChevronRight, User, Phone, FileText,
  Building2, Ruler, DollarSign, Compass, Info, AlertTriangle,
  PauseCircle, Check, Layers,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { projectsApi, plotsApi } from '../services/api';
import api from '../services/api';

// ── API helpers ───────────────────────────────────────────────────────────────
const bookingApi = {
  list:    (params)    => api.get('/booking-requests/', { params }),
  create:  (data)      => api.post('/booking-requests/', data),
  approve: (id, notes) => api.post(`/booking-requests/${id}/approve/`, { admin_notes: notes }),
  reject:  (id, notes) => api.post(`/booking-requests/${id}/reject/`,  { admin_notes: notes }),
  hold:    (id, notes) => api.post(`/booking-requests/${id}/hold/`,    { admin_notes: notes }),
};

// ── Status config ─────────────────────────────────────────────────────────────
const SC = {
  available:  { fill: '#22c55e', stroke: '#16a34a', text: '#fff',     label: 'Available'   },
  sold:       { fill: '#ef4444', stroke: '#dc2626', text: '#fff',     label: 'Sold'        },
  in_process: { fill: '#f59e0b', stroke: '#d97706', text: '#fff',     label: 'In Process'  },
  booked:     { fill: '#3b82f6', stroke: '#2563eb', text: '#fff',     label: 'Booked'      },
  blocked:    { fill: '#6b7280', stroke: '#4b5563', text: '#fff',     label: 'Blocked'     },
};

function fmtINR(n) {
  if (!n && n !== 0) return '—';
  return '₹' + Number(n).toLocaleString('en-IN');
}

// ── SVG Layout definition ─────────────────────────────────────────────────────
// 14 rows × up to 18 plots.  Rows are grouped into sections separated by roads.
// Plot-numbers match exactly what is stored in the database.
const LAYOUT_SECTIONS = [
  // Section A – top (faces main road)
  {
    label: '40\' Road',
    rows: [
      ['243','244','245','246','247','248','249','250','251','252','253','254','255','256','257','258','259'],
      ['260','261','262','263','264','265','266','267','268','269','270','271','272','273','274','275','276'],
    ],
  },
  // Section B
  {
    label: '40\' Road',
    rows: [
      ['277','278','279','280','281','282','283','284','285','C.SHOP','242','241','240','239','238','237','236','235'],
      ['234','233','232','231','230','229','228','227','226','225','224','223','222','221','220','219','218','217'],
      ['216','215','214','213','212','211','210','209','208','207','206','205','204','203','202','201','200','199'],
    ],
  },
  // Section C
  {
    label: '30\' Road',
    rows: [
      ['198','197','196','195','194','193','192','191','190','189','188','187','186','185','184','183','182','181'],
      ['180','179','178pt','177pt','175pt','174','173','172','171','170','169','168','167','166','165','164','163','162'],
      ['161','160','159','158','157','156','155','154','153','152','151','150','149','148','147','146','145','144'],
    ],
  },
  // Section D
  {
    label: '24\' Road',
    rows: [
      ['143','142','141','140','139','138','137','136','135','134','133','132','131','130','129','128','127','126'],
      ['125','124','123','122','121','120','119','118','117','116','115','114','113','112','111','109pt','108pt','107'],
      ['106','105','104','103','102','101','100','99pt','98pt','93pt','92pt','91','90','89','88','87','86','85'],
    ],
  },
  // Section E
  {
    label: '16\' Road',
    rows: [
      ['84','83','82','81','80','79','78','77','76','75','74','73','72','71','70','69','68','67'],
      ['66','65','64','63','62','61','60','59','58','57','56','55','54','53','45pt','44pt','43','42'],
      ['41','40','39pt','38pt','23pt','22','21','20','19','18','17','16','15','14','13','12','11','10'],
    ],
  },
  // Section F – bottom
  {
    label: '16\' Road',
    rows: [
      ['9','8','7','6','5','4','3','2','1'],
      ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIVPT','XVPT'],
    ],
  },
];

// Flattened list of all plotNos to validate against API data
const ALL_PLOT_NOS = LAYOUT_SECTIONS.flatMap(s => s.rows.flat());

// SVG geometry constants
const CELL_W  = 56;
const CELL_H  = 36;
const CELL_GAP = 3;
const ROW_GAP  = 4;
const ROAD_GAP = 22;
const PAD      = 24;
const ROAD_LBL_H = 16;

// Pre-compute every plot's SVG rect
function buildPlotRects() {
  const rects = {};    // plotNo → { x, y, w, h }
  let   cy = PAD;

  LAYOUT_SECTIONS.forEach((section, si) => {
    if (si > 0) cy += ROAD_GAP + ROAD_LBL_H;   // road gap with label

    section.rows.forEach((row, ri) => {
      if (ri > 0) cy += ROW_GAP;
      row.forEach((plotNo, ci) => {
        const x = PAD + ci * (CELL_W + CELL_GAP);
        rects[plotNo] = { x, y: cy, w: CELL_W, h: CELL_H };
      });
      cy += CELL_H;
    });
  });

  return rects;
}

// Also build road label positions
function buildRoadLabels() {
  const labels = [];
  let cy = PAD;

  LAYOUT_SECTIONS.forEach((section, si) => {
    if (si > 0) {
      labels.push({ y: cy + ROAD_LBL_H / 2, label: section.label });
      cy += ROAD_GAP + ROAD_LBL_H;
    }
    section.rows.forEach((row, ri) => {
      if (ri > 0) cy += ROW_GAP;
      cy += CELL_H;
    });
  });

  return labels;
}

const PLOT_RECTS  = buildPlotRects();
const ROAD_LABELS = buildRoadLabels();

// SVG total size
const MAX_COLS    = Math.max(...LAYOUT_SECTIONS.flatMap(s => s.rows.map(r => r.length)));
const SVG_W       = PAD * 2 + MAX_COLS * (CELL_W + CELL_GAP);
const SVG_H       = (() => {
  let cy = PAD;
  LAYOUT_SECTIONS.forEach((section, si) => {
    if (si > 0) cy += ROAD_GAP + ROAD_LBL_H;
    section.rows.forEach((_, ri) => {
      if (ri > 0) cy += ROW_GAP;
      cy += CELL_H;
    });
  });
  return cy + PAD;
})();

// ── Main Component ────────────────────────────────────────────────────────────
export default function MadhavamLayout() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'admin' || user?.role === 'super_admin';

  // ── Data state ────────────────────────────────────────────────────────────
  const [plotMap,   setPlotMap]   = useState({});   // plotNo → plot object
  const [bookings,  setBookings]  = useState([]);   // pending/hold booking requests
  const [project,   setProject]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selected,  setSelected]  = useState(null);  // clicked plot object
  const [drawerOpen, setDrawer]   = useState(false);
  const [searchQ,   setSearchQ]   = useState('');
  const [statusFilter, setFilter] = useState('all');

  // Booking form
  const [custName,  setCustName]  = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [bookNotes, setBookNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookError,  setBookError]  = useState('');

  // Admin review
  const [adminNotes, setAdminNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);

  // ── Zoom / pan ────────────────────────────────────────────────────────────
  const [scale,   setScale]   = useState(1);
  const [offset,  setOffset]  = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const panStart = useRef(null);
  const svgRef   = useRef(null);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  const wsRef = useRef(null);

  // ── Load data ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data: projects } = await projectsApi.list();
      const proj = projects.results
        ? projects.results.find(p => p.name === 'CK Madhavan Nagar')
        : projects.find(p => p.name === 'CK Madhavan Nagar');
      if (!proj) throw new Error('CK Madhavan Nagar project not found.');
      setProject(proj);

      const { data } = await api.get('/plots/', { params: { project: proj.id, page_size: 500 } });
      const list = data.results ?? data;
      const map = {};
      list.forEach(p => { map[p.plot_no] = p; });
      setPlotMap(map);

      if (isAdmin) {
        const { data: bkData } = await bookingApi.list({ project: proj.id });
        setBookings(bkData.results ?? bkData);
      }
    } catch (e) {
      setError(e.message || 'Failed to load layout data.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  // ── WebSocket connection ──────────────────────────────────────────────────
  useEffect(() => {
    if (!project) return;
    const base    = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api')
                      .replace('/api', '').replace('https://', 'wss://').replace('http://', 'ws://');
    const token   = localStorage.getItem('access_token') || '';
    const wsUrl   = `${base}/ws/plots/${project.id}/?token=${token}`;
    const ws      = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'plot_update') {
          setPlotMap(prev => {
            const existing = prev[msg.plot_no];
            if (!existing) return prev;
            return { ...prev, [msg.plot_no]: { ...existing, status: msg.status } };
          });
          // If the selected plot was updated, refresh it in the drawer
          setSelected(prev => prev?.plot_no === msg.plot_no
            ? { ...prev, status: msg.status }
            : prev
          );
        }
      } catch {}
    };

    return () => { ws.close(); };
  }, [project]);

  // ── Interaction: click a plot ─────────────────────────────────────────────
  const handlePlotClick = (plotNo) => {
    const p = plotMap[plotNo];
    if (!p) return;

    // Find pending booking for this plot
    const pb = bookings.find(b => b.plot === p.id && ['pending','on_hold'].includes(b.status));
    setSelected({ ...p, pendingBooking: pb || p.pending_booking || null });
    setCustName(''); setCustPhone(''); setBookNotes('');
    setAdminNotes(''); setBookError('');
    setDrawer(true);
  };

  // ── Booking submit (staff) ────────────────────────────────────────────────
  const submitBooking = async () => {
    if (!custName.trim()) { setBookError('Customer name is required.'); return; }
    setSubmitting(true); setBookError('');
    try {
      await bookingApi.create({
        plot:          selected.id,
        customer_name:  custName,
        customer_phone: custPhone,
        notes:          bookNotes,
      });
      // Optimistic UI
      setPlotMap(prev => ({
        ...prev,
        [selected.plot_no]: { ...prev[selected.plot_no], status: 'in_process' },
      }));
      setSelected(prev => ({ ...prev, status: 'in_process' }));
      setCustName(''); setCustPhone(''); setBookNotes('');
    } catch (e) {
      setBookError(e.response?.data?.error || 'Failed to submit booking.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Admin review actions ──────────────────────────────────────────────────
  const reviewAction = async (action) => {
    const bookingId = selected?.pendingBooking?.id;
    if (!bookingId) return;
    setReviewing(true);
    try {
      await bookingApi[action](bookingId, adminNotes);
      const statusMap = { approve: 'sold', reject: 'available', hold: 'in_process' };
      const newStatus = statusMap[action];
      setPlotMap(prev => ({
        ...prev,
        [selected.plot_no]: { ...prev[selected.plot_no], status: newStatus },
      }));
      setSelected(prev => ({ ...prev, status: newStatus, pendingBooking: null }));
      setAdminNotes('');
      // Refresh bookings list
      if (project) {
        const { data } = await bookingApi.list({ project: project.id });
        setBookings(data.results ?? data);
      }
    } catch (e) {
      alert(e.response?.data?.error || 'Action failed.');
    } finally {
      setReviewing(false);
    }
  };

  // ── Zoom helpers ──────────────────────────────────────────────────────────
  const zoom = (delta) => setScale(s => Math.min(3, Math.max(0.35, s + delta)));
  const resetView = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

  const onWheel = (e) => {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 0.1 : -0.1);
  };

  const onMouseDown = (e) => {
    if (e.button !== 1 && !(e.button === 0 && e.altKey)) return;
    e.preventDefault();
    setPanning(true);
    panStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };
  const onMouseMove = (e) => {
    if (!panning || !panStart.current) return;
    setOffset({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  };
  const onMouseUp = () => setPanning(false);

  // Touch pan
  const touchRef = useRef(null);
  const onTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    touchRef.current = { x: e.touches[0].clientX - offset.x, y: e.touches[0].clientY - offset.y };
  };
  const onTouchMove = (e) => {
    if (!touchRef.current || e.touches.length !== 1) return;
    setOffset({ x: e.touches[0].clientX - touchRef.current.x, y: e.touches[0].clientY - touchRef.current.y });
  };

  // ── Filter / search ───────────────────────────────────────────────────────
  const visibleSet = useMemo(() => {
    if (!searchQ && statusFilter === 'all') return null;   // null = show all
    const set = new Set();
    Object.entries(plotMap).forEach(([plotNo, p]) => {
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchSearch = !searchQ || plotNo.toLowerCase().includes(searchQ.toLowerCase());
      if (matchStatus && matchSearch) set.add(plotNo);
    });
    return set;
  }, [plotMap, searchQ, statusFilter]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const counts = { available: 0, sold: 0, in_process: 0, booked: 0, blocked: 0, total: 0 };
    Object.values(plotMap).forEach(p => {
      counts.total++;
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [plotMap]);

  // ── Pending bookings count for admin badge ────────────────────────────────
  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#1a3a6b] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading layout…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center text-red-500">
        <AlertTriangle size={36} className="mx-auto mb-2" />
        <p className="font-medium">{error}</p>
        <button onClick={load} className="mt-3 px-4 py-2 bg-[#1a3a6b] text-white rounded-lg text-sm">
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] overflow-hidden select-none">

      {/* ── Header ── */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">

          {/* Title */}
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-[#1a3a6b] dark:text-blue-400" />
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white text-base leading-tight">
                CK Madhavan Nagar
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Interactive Plot Layout</p>
            </div>
          </div>

          {/* Stat chips */}
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {[
              { key: 'total',      color: 'bg-gray-100 text-gray-700',     label: 'Total' },
              { key: 'available',  color: 'bg-green-100 text-green-700',   label: 'Available' },
              { key: 'sold',       color: 'bg-red-100 text-red-700',       label: 'Sold' },
              { key: 'in_process', color: 'bg-amber-100 text-amber-700',   label: 'In Process' },
              { key: 'blocked',    color: 'bg-gray-200 text-gray-600',     label: 'Blocked' },
            ].map(({ key, color, label }) => (
              <span key={key} className={`px-2.5 py-1 rounded-full ${color}`}>
                {stats[key] ?? 0} {label}
              </span>
            ))}
            {isAdmin && pendingCount > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 animate-pulse">
                {pendingCount} Pending
              </span>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Plot no…" maxLength={10}
                className="pl-7 pr-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700
                  bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1a3a6b]/30 w-24" />
            </div>

            {/* Status filter */}
            <select value={statusFilter} onChange={e => setFilter(e.target.value)}
              className="text-xs rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1.5
                bg-white dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1a3a6b]/30">
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
              <option value="in_process">In Process</option>
              <option value="booked">Booked</option>
              <option value="blocked">Blocked</option>
            </select>

            {/* Zoom controls */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button onClick={() => zoom(-0.15)} title="Zoom out"
                className="p-1 rounded hover:bg-white dark:hover:bg-gray-700 transition-colors">
                <ZoomOut size={14} className="text-gray-600 dark:text-gray-300" />
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400 w-9 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button onClick={() => zoom(0.15)} title="Zoom in"
                className="p-1 rounded hover:bg-white dark:hover:bg-gray-700 transition-colors">
                <ZoomIn size={14} className="text-gray-600 dark:text-gray-300" />
              </button>
              <button onClick={resetView} title="Reset view"
                className="p-1 rounded hover:bg-white dark:hover:bg-gray-700 transition-colors ml-0.5">
                <RotateCcw size={13} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-2.5">
          {Object.entries(SC).map(([key, cfg]) => (
            <button key={key} onClick={() => setFilter(f => f === key ? 'all' : key)}
              className={`flex items-center gap-1.5 text-[11px] font-medium rounded-full px-2.5 py-0.5 transition-all
                ${statusFilter === key ? 'ring-2 ring-offset-1 ring-[#1a3a6b]' : ''}`}
              style={{ background: cfg.fill + '22', color: cfg.fill }}>
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: cfg.fill }} />
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── SVG canvas ── */}
      <div
        className="flex-1 overflow-hidden relative bg-gray-100 dark:bg-gray-950 cursor-grab active:cursor-grabbing"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={() => { touchRef.current = null; }}
      >
        <div
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: panning ? 'none' : 'transform 0.1s ease',
          }}
        >
          <svg
            ref={svgRef}
            width={SVG_W}
            height={SVG_H}
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            style={{ display: 'block' }}
          >
            {/* Background */}
            <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="#f8fafc" rx={8} />

            {/* Road labels */}
            {ROAD_LABELS.map((rl, i) => (
              <g key={i}>
                <rect x={PAD / 2} y={rl.y - ROAD_LBL_H / 2 - 4} width={SVG_W - PAD}
                  height={ROAD_GAP + ROAD_LBL_H / 2 + 2} fill="#d1d5db" rx={3} opacity={0.5} />
                <text x={SVG_W / 2} y={rl.y + 1} textAnchor="middle"
                  fontSize={9} fill="#6b7280" fontWeight="600" fontFamily="Arial, sans-serif">
                  ← {rl.label} →
                </text>
              </g>
            ))}

            {/* Plot rectangles */}
            {ALL_PLOT_NOS.map(plotNo => {
              const rect  = PLOT_RECTS[plotNo];
              if (!rect) return null;
              const plot  = plotMap[plotNo];
              if (!plot) return null;

              const cfg   = SC[plot.status] || SC.available;
              const dimmed = visibleSet && !visibleSet.has(plotNo);
              const hasPending = plot.pending_booking ||
                (isAdmin && bookings.some(b => b.plot === plot.id && ['pending','on_hold'].includes(b.status)));

              return (
                <g key={plotNo}
                  className="plot-cell"
                  onClick={() => handlePlotClick(plotNo)}
                  style={{ cursor: 'pointer' }}>

                  {/* Plot body */}
                  <rect
                    x={rect.x} y={rect.y} width={rect.w} height={rect.h}
                    rx={4}
                    fill={dimmed ? '#e5e7eb' : cfg.fill}
                    stroke={dimmed ? '#d1d5db' : cfg.stroke}
                    strokeWidth={1.5}
                    opacity={dimmed ? 0.35 : 1}
                    style={{ transition: 'fill 0.25s, opacity 0.2s' }}
                  />

                  {/* Plot number label */}
                  <text
                    x={rect.x + rect.w / 2}
                    y={rect.y + rect.h / 2 + (plotNo.length > 3 ? 3.5 : 4)}
                    textAnchor="middle"
                    fontSize={plotNo.length > 4 ? 7.5 : plotNo.length > 3 ? 8.5 : 9.5}
                    fill={dimmed ? '#9ca3af' : cfg.text}
                    fontWeight="700"
                    fontFamily="Arial, sans-serif"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {plotNo}
                  </text>

                  {/* Pending booking indicator dot */}
                  {hasPending && !dimmed && (
                    <circle cx={rect.x + rect.w - 6} cy={rect.y + 6} r={4}
                      fill="#f97316" stroke="#fff" strokeWidth={1.5} />
                  )}

                  {/* Hover highlight */}
                  <rect
                    x={rect.x} y={rect.y} width={rect.w} height={rect.h}
                    rx={4} fill="transparent"
                    className="plot-hover"
                    style={{ transition: 'fill 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.fill = 'rgba(255,255,255,0.18)'}
                    onMouseLeave={e => e.currentTarget.style.fill = 'transparent'}
                  />
                </g>
              );
            })}

            {/* PARK special block */}
            {(() => {
              const parkPlot = plotMap['PARK 1& 2'];
              if (!parkPlot) return null;
              const x = PAD, y = SVG_H - PAD - 50;
              return (
                <g onClick={() => handlePlotClick('PARK 1& 2')} style={{ cursor: 'pointer' }}>
                  <rect x={x} y={y} width={180} height={44} rx={6}
                    fill="#bbf7d0" stroke="#16a34a" strokeWidth={2} />
                  <text x={x + 90} y={y + 18} textAnchor="middle"
                    fontSize={9} fill="#15803d" fontWeight="800" fontFamily="Arial, sans-serif">
                    PARK 1 &amp; 2
                  </text>
                  <text x={x + 90} y={y + 32} textAnchor="middle"
                    fontSize={8} fill="#16a34a" fontFamily="Arial, sans-serif">
                    {parkPlot.area_sqft ? `${Number(parkPlot.area_sqft).toLocaleString()} sq.ft` : ''}
                  </text>
                </g>
              );
            })()}

          </svg>
        </div>

        {/* Hint */}
        <p className="absolute bottom-2 right-3 text-[10px] text-gray-400 dark:text-gray-600 pointer-events-none">
          Scroll to zoom · Alt+drag or middle-drag to pan · Tap a plot to open
        </p>
      </div>

      {/* ── Booking Drawer ── */}
      {drawerOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-end"
          onClick={() => setDrawer(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          {/* Drawer panel */}
          <div
            className="relative z-10 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl
              flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800
              bg-[#1a3a6b] text-white shrink-0">
              <div>
                <p className="text-xs text-blue-300">Plot Details</p>
                <h2 className="text-lg font-bold leading-tight">Plot {selected.plot_no}</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: (SC[selected.status] || SC.available).fill + '33',
                           color: (SC[selected.status] || SC.available).fill === '#fff'
                             ? '#fff' : (SC[selected.status] || SC.available).fill }}>
                  {(SC[selected.status] || SC.available).label}
                </span>
                <button onClick={() => setDrawer(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content – scrollable */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Plot info grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Ruler,     label: 'Area',       val: selected.area_sqft  ? `${Number(selected.area_sqft).toLocaleString()} sq.ft` : '—' },
                  { icon: Compass,   label: 'Facing',     val: selected.facing  || '—' },
                  { icon: DollarSign, label: 'Rate/sqft', val: selected.rate_per_sqft ? fmtINR(selected.rate_per_sqft) : '—' },
                  { icon: DollarSign, label: 'Total Cost', val: fmtINR(selected.total_cost) },
                ].map(({ icon: Icon, label, val }) => (
                  <div key={label} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 mb-1">
                      <Icon size={12} />
                      <span className="text-[10px] uppercase font-bold tracking-wide">{label}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{val}</p>
                  </div>
                ))}
              </div>

              {/* ── PENDING BOOKING INFO (admin view) ── */}
              {selected.pendingBooking && isAdmin && (
                <div className="rounded-xl border border-orange-200 dark:border-orange-800/40 bg-orange-50 dark:bg-orange-900/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={15} className="text-orange-500" />
                    <h3 className="font-bold text-sm text-orange-700 dark:text-orange-400">
                      Booking Request
                    </h3>
                  </div>
                  <div className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
                    <p><span className="text-gray-500 dark:text-gray-400">Customer:</span>{' '}
                      <strong>{selected.pendingBooking.customer_name}</strong></p>
                    {selected.pendingBooking.customer_phone && (
                      <p><span className="text-gray-500 dark:text-gray-400">Phone:</span>{' '}
                        {selected.pendingBooking.customer_phone}</p>
                    )}
                    <p><span className="text-gray-500 dark:text-gray-400">By:</span>{' '}
                      {selected.pendingBooking.requested_by || selected.pendingBooking.requested_by_name}</p>
                    {selected.pendingBooking.notes && (
                      <p className="italic text-gray-500 dark:text-gray-400 text-xs mt-1">
                        "{selected.pendingBooking.notes}"
                      </p>
                    )}
                  </div>

                  {/* Admin notes */}
                  <textarea
                    value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                    placeholder="Add admin notes (optional)…"
                    rows={2}
                    className="mt-3 w-full text-sm rounded-lg border border-orange-200 dark:border-orange-700
                      bg-white dark:bg-gray-800 dark:text-white px-3 py-2 focus:outline-none
                      focus:ring-2 focus:ring-orange-400/30 resize-none"
                  />

                  {/* Action buttons */}
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => reviewAction('approve')} disabled={reviewing}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                        bg-green-500 hover:bg-green-600 text-white text-xs font-bold transition-colors
                        disabled:opacity-60">
                      <CheckCircle2 size={14} />
                      Approve → Sold
                    </button>
                    <button onClick={() => reviewAction('hold')} disabled={reviewing}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                        bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors
                        disabled:opacity-60">
                      <PauseCircle size={14} />
                      Hold
                    </button>
                    <button onClick={() => reviewAction('reject')} disabled={reviewing}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                        bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition-colors
                        disabled:opacity-60">
                      <XCircle size={14} />
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {/* ── BOOKING FORM (staff, available plots only) ── */}
              {!isAdmin && selected.status === 'available' && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                  <h3 className="font-bold text-sm text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                    <FileText size={14} className="text-[#1a3a6b]" />
                    Submit Booking Request
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Customer Name <span className="text-red-500">*</span>
                      </label>
                      <div className="relative mt-1">
                        <User size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={custName} onChange={e => setCustName(e.target.value)}
                          placeholder="Full name"
                          className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700
                            bg-white dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1a3a6b]/30" />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Phone Number
                      </label>
                      <div className="relative mt-1">
                        <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input value={custPhone} onChange={e => setCustPhone(e.target.value)}
                          placeholder="10-digit mobile"
                          className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700
                            bg-white dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1a3a6b]/30" />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Notes
                      </label>
                      <textarea value={bookNotes} onChange={e => setBookNotes(e.target.value)}
                        placeholder="Any additional notes…" rows={2}
                        className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700
                          bg-white dark:bg-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1a3a6b]/30 resize-none" />
                    </div>

                    {bookError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertTriangle size={12} /> {bookError}
                      </p>
                    )}

                    <button onClick={submitBooking} disabled={submitting}
                      className="w-full py-2.5 rounded-xl bg-[#1a3a6b] hover:bg-[#15306b] text-white text-sm font-bold
                        transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                      {submitting
                        ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting…</>
                        : <><Check size={15} />Submit Booking Request</>
                      }
                    </button>
                  </div>
                </div>
              )}

              {/* Status messages */}
              {selected.status === 'in_process' && !selected.pendingBooking && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 p-4 text-sm">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold mb-1">
                    <Clock size={14} /> Pending Admin Review
                  </div>
                  <p className="text-amber-600 dark:text-amber-500 text-xs">
                    This plot has an active booking request under review.
                  </p>
                </div>
              )}
              {selected.status === 'sold' && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 p-4 text-sm">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-semibold">
                    <XCircle size={14} /> This plot has been sold
                  </div>
                </div>
              )}
              {selected.status === 'blocked' && (
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 font-semibold">
                    <Info size={14} /> This plot is blocked
                  </div>
                </div>
              )}

              {/* Staff booking form for admin view on available plot */}
              {isAdmin && selected.status === 'available' && !selected.pendingBooking && (
                <div className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 p-4 text-sm">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold">
                    <CheckCircle2 size={14} /> Plot is Available
                  </div>
                  <p className="text-green-600 dark:text-green-500 text-xs mt-1">
                    This plot is open for booking. Staff members can submit a booking request.
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── Admin Pending Requests Panel (collapsible bottom bar) ── */}
      {isAdmin && bookings.filter(b => b.status === 'pending').length > 0 && !drawerOpen && (
        <div className="flex-shrink-0 bg-orange-50 dark:bg-orange-900/20 border-t border-orange-200
          dark:border-orange-800/30 px-4 py-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-orange-700 dark:text-orange-400 shrink-0">
              Pending:
            </span>
            {bookings.filter(b => b.status === 'pending').map(b => (
              <button key={b.id}
                onClick={() => {
                  const p = Object.values(plotMap).find(pl => pl.id === b.plot);
                  if (p) handlePlotClick(p.plot_no);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100
                  dark:bg-orange-800/30 text-orange-700 dark:text-orange-400 text-xs font-semibold
                  hover:bg-orange-200 dark:hover:bg-orange-700/40 transition-colors shrink-0">
                <Clock size={11} />
                Plot {b.plot_no} · {b.customer_name}
                <ChevronRight size={11} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
