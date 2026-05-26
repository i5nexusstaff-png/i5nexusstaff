import { useState, useRef, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, X, Maximize2, Minimize2 } from 'lucide-react';

const MIN_ZOOM = 0.15;
const MAX_ZOOM = 10;
const clamp    = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export default function ImageZoomViewer({ src, title = 'Image', onClose }) {
  const [zoom, setZoom]       = useState(1);
  const [pan, setPan]         = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [loaded, setLoaded]   = useState(false);

  const containerRef  = useRef(null);
  const dragOriginRef = useRef(null); // { mx, my, px, py }

  /* ── Wheel zoom — centered on cursor ── */
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;
    const rect    = container.getBoundingClientRect();
    const cx      = e.clientX - rect.left - rect.width  / 2;
    const cy      = e.clientY - rect.top  - rect.height / 2;
    const factor  = e.deltaY < 0 ? 1.12 : 1 / 1.12;

    setZoom(z => {
      const nz    = clamp(z * factor, MIN_ZOOM, MAX_ZOOM);
      const scale = nz / z;
      setPan(p => ({ x: cx + (p.x - cx) * scale, y: cy + (p.y - cy) * scale }));
      return nz;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  /* ── Drag to pan ── */
  const onMouseDown = (e) => {
    if (e.button !== 0) return;
    setDragging(true);
    dragOriginRef.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  };

  const onMouseMove = (e) => {
    if (!dragging || !dragOriginRef.current) return;
    const { mx, my, px, py } = dragOriginRef.current;
    setPan({ x: px + e.clientX - mx, y: py + e.clientY - my });
  };

  const onMouseUp = () => { setDragging(false); dragOriginRef.current = null; };

  /* ── Button controls ── */
  const zoomBy = (factor) =>
    setZoom(z => clamp(z * factor, MIN_ZOOM, MAX_ZOOM));

  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape')               onClose();
      if (e.key === '+' || e.key === '=')  zoomBy(1.25);
      if (e.key === '-')                    zoomBy(1 / 1.25);
      if (e.key === '0')                    reset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pct = Math.round(zoom * 100);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: '#0c0c0c' }}
    >
      {/* ── Toolbar ── */}
      <div
        className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ background: '#181818', borderBottom: '1px solid #2a2a2a' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
            <Maximize2 size={14} className="text-white/60" />
          </div>
          <span className="text-white font-semibold text-sm truncate">{title}</span>
          <span className="hidden sm:block text-white/25 text-xs">· Scroll to zoom · Drag to pan</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Zoom out */}
          <button
            onClick={() => zoomBy(1 / 1.25)}
            title="Zoom out (−)"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            <ZoomOut size={16} />
          </button>

          {/* Zoom % display + click to reset */}
          <button
            onClick={reset}
            title="Reset to 100% (0)"
            className="px-2.5 py-1 min-w-[58px] text-center rounded-lg hover:bg-white/10 transition"
          >
            <span className={`text-xs font-mono font-bold ${pct > 100 ? 'text-blue-400' : pct < 100 ? 'text-amber-400' : 'text-white/70'}`}>
              {pct}%
            </span>
          </button>

          {/* Zoom in */}
          <button
            onClick={() => zoomBy(1.25)}
            title="Zoom in (+)"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            <ZoomIn size={16} />
          </button>

          <div className="w-px h-5 bg-white/15 mx-1" />

          {/* Presets */}
          {[50, 100, 200].map(p => (
            <button
              key={p}
              onClick={() => { setZoom(p / 100); setPan({ x: 0, y: 0 }); }}
              className={`px-2 py-1 rounded-lg text-xs font-mono transition ${
                pct === p ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white hover:bg-white/10'
              }`}
            >
              {p}%
            </button>
          ))}

          <div className="w-px h-5 bg-white/15 mx-1" />

          {/* Reset */}
          <button
            onClick={reset}
            title="Reset (0)"
            className="flex items-center gap-1 px-2.5 h-8 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition text-xs"
          >
            <RotateCcw size={12} />
            <span className="hidden sm:inline">Reset</span>
          </button>

          <div className="w-px h-5 bg-white/15 mx-1" />

          {/* Close */}
          <button
            onClick={onClose}
            title="Close (Esc)"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-red-500/30 transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative select-none"
        style={{ cursor: dragging ? 'grabbing' : zoom > 1 ? 'grab' : 'zoom-in' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onDoubleClick={() => zoom === 1 ? (setZoom(2), setPan({ x: 0, y: 0 })) : reset()}
      >
        {/* Checkerboard background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(45deg,#1c1c1c 25%,transparent 25%),' +
              'linear-gradient(-45deg,#1c1c1c 25%,transparent 25%),' +
              'linear-gradient(45deg,transparent 75%,#1c1c1c 75%),' +
              'linear-gradient(-45deg,transparent 75%,#1c1c1c 75%)',
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0,0 10px,10px -10px,-10px 0',
          }}
        />

        {/* Loading spinner */}
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        )}

        {/* Image */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px,${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            willChange: 'transform',
            transition: dragging ? 'none' : 'transform 0.06s ease-out',
          }}
        >
          <img
            src={src}
            alt={title}
            draggable={false}
            onLoad={() => setLoaded(true)}
            style={{
              maxWidth: '88vw',
              maxHeight: '80vh',
              pointerEvents: 'none',
              userSelect: 'none',
              borderRadius: '6px',
              boxShadow: '0 30px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.06)',
              opacity: loaded ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* ── Bottom hint bar ── */}
      <div
        className="flex items-center justify-center gap-6 px-4 py-1.5 shrink-0"
        style={{ background: '#181818', borderTop: '1px solid #222' }}
      >
        {[['Scroll','zoom'],['Drag','pan'],['Dbl-click','toggle 2×'],['Esc','close']].map(([k, v]) => (
          <span key={k} className="text-[10px] text-white/20">
            <span className="text-white/40 font-medium">{k}</span> {v}
          </span>
        ))}
      </div>
    </div>
  );
}
