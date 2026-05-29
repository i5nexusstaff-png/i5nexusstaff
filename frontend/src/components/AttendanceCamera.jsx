/**
 * AttendanceCamera — GPS geo-camera selfie capture.
 *
 * Props:
 *   action          — 'in' | 'out'
 *   punchMode       — 'geofence' | 'gps_tagged'
 *   userName        — display name for geo-stamp
 *   onCapture(data) — called with { blob, location, address, bypassGeofence }
 *   onCancel        — close the camera
 *   officeLocations — array from API (used only when punchMode === 'geofence')
 *
 * Geo-stamp on captured selfie:
 *  ┌──────────────────────────────────────────────┐
 *  │ [OSM tile] │ City, State, Country 🇮🇳          │
 *  │  [MAP]     │ Full address line(s)              │
 *  │  [THUMB]   │ Lat 13.040024°  Long 80.168194°  │
 *  │            │ Tuesday, 19/05/2026 11:47 AM      │
 *  │            │ GMT+05:30  ▶ Username             │
 *  └──────────────────────────────────────────────┘
 *
 * Reverse geocoding: Google Geocoding API
 * Map thumbnail on selfie: OSM tile (CORS-safe for canvas drawing)
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { Camera, MapPin, X, RotateCcw, Check, Loader2, Navigation, Building2 } from 'lucide-react';
import { reverseGeocodeGoogle } from '../utils/googleMaps';

const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/* ─────────────────────────────────────────────────────────────────
   OSM tile for the geo-stamp thumbnail
   (Google Static Maps cannot be drawn onto canvas due to CORS)
───────────────────────────────────────────────────────────────── */
function tileCoords(lat, lng, zoom) {
  const n     = Math.pow(2, zoom);
  const tx    = Math.floor((lng + 180) / 360 * n);
  const sinLat = Math.sin(lat * Math.PI / 180);
  const ty    = Math.floor((0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * n);
  const offX  = Math.floor(((lng + 180) / 360 * n - tx) * 256);
  const offY  = Math.floor(((0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * n - ty) * 256);
  return { tx, ty, offX, offY };
}
async function fetchMapTile(lat, lng) {
  const zoom = 16;
  const { tx, ty, offX, offY } = tileCoords(lat, lng, zoom);
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => resolve({ img, offX, offY });
    img.onerror = () => resolve(null);
    img.src = `https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`;
    setTimeout(() => resolve(null), 6000);
  });
}

/* ─────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────── */
function flagEmoji(cc) {
  if (!cc || cc.length !== 2) return '';
  try { return [...cc].map(c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))).join(''); }
  catch { return ''; }
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

/* ─────────────────────────────────────────────────────────────────
   Draw geo-stamp on the canvas
───────────────────────────────────────────────────────────────── */
function drawGeoStamp(canvas, location, address, userName, mapTile, punchMode) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const fCity  = Math.max(18, Math.round(W * 0.020));
  const fAddr  = Math.max(13, Math.round(W * 0.015));
  const fMeta  = Math.max(12, Math.round(W * 0.013));
  const fUser  = Math.max(11, Math.round(W * 0.012));
  const fBrand = Math.max(10, Math.round(W * 0.011));
  const PAD    = Math.max(10, Math.round(W * 0.012));
  const THUMBW = Math.max(80, Math.round(W * 0.095));
  const GAP    = Math.round(PAD * 0.85);
  const R      = 8;

  ctx.font = `${fAddr}px Arial,sans-serif`;
  const stampMaxW = Math.round(W * 0.74);
  const textColW  = stampMaxW - THUMBW - PAD - GAP - PAD;
  const addrSrc   = address.fullAddr || address.short || '';
  const addrLines = [];
  if (addrSrc) {
    let cur = '';
    for (const w of addrSrc.split(' ')) {
      const test = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(test).width > textColW && cur) {
        addrLines.push(cur); cur = w;
        if (addrLines.length === 3) { cur = ''; break; }
      } else cur = test;
    }
    if (cur && addrLines.length < 3) addrLines.push(cur);
  }

  const cityH  = fCity * 1.50;
  const addrH  = fAddr * 1.38;
  const metaH  = fMeta * 1.38;
  const userH  = userName ? fUser * 1.35 : 0;
  const modeH  = fMeta * 1.30; // extra row for punch mode label
  const textH  = cityH + addrLines.length * addrH + metaH + metaH + userH + modeH;
  const stampH = textH + PAD * 2.2;
  const thumbH = stampH - PAD * 1.6;
  const stampW = PAD + THUMBW + GAP + textColW + PAD;
  const sx = 16, sy = H - stampH - 16;

  ctx.fillStyle = 'rgba(12,12,12,0.87)';
  rrect(ctx, sx, sy, stampW, stampH, R); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
  rrect(ctx, sx, sy, stampW, stampH, R); ctx.stroke();

  const thumbX = sx + PAD;
  const thumbY = sy + Math.round((stampH - thumbH) / 2);
  ctx.save();
  rrect(ctx, thumbX, thumbY, THUMBW, thumbH, 5); ctx.clip();
  if (mapTile?.img) {
    const { img, offX, offY } = mapTile;
    const srcX = Math.max(0, Math.min(256 - THUMBW, offX - THUMBW / 2));
    const srcY = Math.max(0, Math.min(256 - thumbH, offY - thumbH / 2));
    ctx.drawImage(img, srcX, srcY, THUMBW, thumbH, thumbX, thumbY, THUMBW, thumbH);
  } else {
    ctx.fillStyle = '#0f172a'; ctx.fillRect(thumbX, thumbY, THUMBW, thumbH);
    ctx.strokeStyle = '#1e3a5f'; ctx.lineWidth = 0.8;
    for (let i = 1; i <= 3; i++) {
      const lx = thumbX + (THUMBW / 4) * i, ly = thumbY + (thumbH / 4) * i;
      ctx.beginPath(); ctx.moveTo(lx, thumbY); ctx.lineTo(lx, thumbY + thumbH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(thumbX, ly); ctx.lineTo(thumbX + THUMBW, ly); ctx.stroke();
    }
  }
  ctx.restore();

  const pinX = thumbX + THUMBW / 2, pinY = thumbY + thumbH / 2;
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 5;
  ctx.fillStyle = punchMode === 'gps_tagged' ? '#f59e0b' : '#ef4444';
  ctx.beginPath(); ctx.arc(pinX, pinY - 5, 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(pinX, pinY - 5, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  const tx = thumbX + THUMBW + GAP;
  let   ty = sy + PAD + fCity * 0.9;
  ctx.shadowColor = 'rgba(0,0,0,0.95)'; ctx.shadowBlur = 5;

  // City + flag
  const flag    = flagEmoji(address.cc);
  const cityTxt = (address.cityLine || 'Location captured') + (flag ? `  ${flag}` : '');
  ctx.font = `bold ${fCity}px Arial,sans-serif`; ctx.fillStyle = '#ffffff';
  ctx.fillText(cityTxt, tx, ty); ty += cityH;

  // Address lines
  ctx.font = `${fAddr}px Arial,sans-serif`; ctx.fillStyle = 'rgba(255,255,255,0.82)';
  for (const line of addrLines) { ctx.fillText(line, tx, ty); ty += addrH; }

  // Lat / Long
  ctx.font = `${fMeta}px Arial,sans-serif`; ctx.fillStyle = 'rgba(255,255,255,0.65)';
  if (location) ctx.fillText(`Lat ${location.lat.toFixed(6)}°  Long ${location.lng.toFixed(6)}°`, tx, ty);
  ty += metaH;

  // Date / time
  const now   = new Date();
  const day   = now.toLocaleDateString('en-IN', { weekday: 'long' });
  const date  = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time  = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  const offM  = -now.getTimezoneOffset();
  const tzStr = `GMT${offM >= 0 ? '+' : ''}${String(Math.floor(Math.abs(offM) / 60)).padStart(2, '0')}:${String(Math.abs(offM) % 60).padStart(2, '0')}`;
  ctx.fillText(`${day}, ${date}  ${time}  ${tzStr}`, tx, ty); ty += metaH;

  // Punch mode label
  ctx.font = `bold ${fMeta}px Arial,sans-serif`;
  ctx.fillStyle = punchMode === 'gps_tagged' ? '#fbbf24' : '#60a5fa';
  ctx.fillText(punchMode === 'gps_tagged' ? '📍 GPS Tagged' : '🏢 Geofencing', tx, ty); ty += modeH;

  // Username
  if (userName) {
    ctx.font = `${fUser}px Arial,sans-serif`; ctx.fillStyle = '#f26522';
    ctx.fillText(`▶ ${userName}`, tx, ty);
  }
  ctx.shadowBlur = 0;

  // Branding pill
  ctx.font = `bold ${fBrand}px Arial,sans-serif`;
  const brand = '📍 GPS Attendance';
  const bw = ctx.measureText(brand).width + fBrand * 1.6, bh = fBrand * 2.2;
  const bx = W - bw - 12, by = 12;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  rrect(ctx, bx, by, bw, bh, bh / 2); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 3;
  ctx.fillText(brand, bx + fBrand * 0.8, by + bh * 0.70); ctx.shadowBlur = 0;
}

/* ─────────────────────────────────────────────────────────────────
   Haversine distance (metres)
───────────────────────────────────────────────────────────────── */
function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000, d2r = Math.PI / 180;
  const a = Math.sin((lat2 - lat1) * d2r / 2) ** 2
          + Math.cos(lat1 * d2r) * Math.cos(lat2 * d2r) * Math.sin((lng2 - lng1) * d2r / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
}
function checkGeofence(lat, lng, locations) {
  if (!locations || !locations.length)
    return { allowed: true, matchedName: null, nearestName: null, distanceM: null };
  const active = locations.filter(l => l.is_active !== false);
  if (!active.length) return { allowed: true, matchedName: null, nearestName: null, distanceM: null };
  if (lat == null || lng == null)
    return { allowed: false, matchedName: null, nearestName: active[0]?.name || null, distanceM: null };

  let best = null, bestDist = Infinity;
  for (const loc of active) {
    const d = haversineM(lat, lng, loc.lat, loc.lng);
    if (d <= (loc.radius_meters || 50))
      return { allowed: true, matchedName: loc.name, nearestName: loc.name, distanceM: Math.round(d) };
    if (d < bestDist) { bestDist = d; best = loc; }
  }
  return { allowed: false, matchedName: null, nearestName: best?.name || null, distanceM: Math.round(bestDist) };
}

/* ─────────────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────────────── */
export default function AttendanceCamera({
  action, punchMode = 'geofence', userName,
  onCapture, onCancel, officeLocations,
}) {
  const videoRef  = useRef(null);
  const streamRef = useRef(null);

  const [camStep,  setCamStep]  = useState('loading');
  const [gpsState, setGpsState] = useState('acquiring');
  const [location, setLocation] = useState(null);
  const [address,  setAddress]  = useState({ cityLine: '', fullAddr: '', short: '', cc: '' });
  const [mapTile,  setMapTile]  = useState(null);
  const [preview,  setPreview]  = useState(null);
  const [blob,     setBlob]     = useState(null);
  const [camError, setCamError] = useState('');
  const [flash,    setFlash]    = useState(false);
  const [geoFence, setGeoFence] = useState(null);

  const isGpsTagged  = punchMode === 'gps_tagged';
  const isGeofencing = punchMode === 'geofence';

  /* ── Start camera ── */
  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false })
      .then(stream => {
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCamStep('ready');
      })
      .catch(() => { if (!cancelled) setCamError('Camera access denied. Allow camera in browser settings, then refresh.'); });
    return () => { cancelled = true; streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  /* ── GPS + address + map tile ── */
  useEffect(() => {
    if (!navigator.geolocation) { setGpsState('denied'); return; }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        setGpsState('found');
        // Geofence check only relevant in geofence mode, but we calculate for display
        setGeoFence(checkGeofence(loc.lat, loc.lng, officeLocations));
        const [addr, tile] = await Promise.all([
          reverseGeocodeGoogle(loc.lat, loc.lng, GMAPS_KEY),
          fetchMapTile(loc.lat, loc.lng),
        ]);
        setAddress(addr);
        setMapTile(tile);
      },
      () => {
        setGpsState('denied');
        setGeoFence(checkGeofence(null, null, officeLocations));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }, []); // eslint-disable-line

  /* ── Capture ── */
  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas   = document.createElement('canvas');
    canvas.width   = video.videoWidth  || 1280;
    canvas.height  = video.videoHeight || 960;
    const ctx      = canvas.getContext('2d');
    ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (location) drawGeoStamp(canvas, location, address, userName, mapTile, punchMode);
    setFlash(true); setTimeout(() => setFlash(false), 180);
    streamRef.current?.getTracks().forEach(t => t.stop());
    canvas.toBlob(b => {
      setBlob(b);
      setPreview(canvas.toDataURL('image/jpeg', 0.92));
      setCamStep('preview');
    }, 'image/jpeg', 0.92);
  }, [location, address, userName, mapTile, punchMode]);

  /* ── Retake ── */
  const retake = useCallback(async () => {
    setPreview(null); setBlob(null); setCamStep('loading');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamStep('ready');
    } catch { setCamError('Could not restart camera.'); }
  }, []);

  /* ── Confirm ── */
  const confirm = useCallback(() => {
    // Only GPS Tagged mode bypasses geofence enforcement on the backend
    const bypassGeofence = isGpsTagged;
    onCapture({ blob, location, address, bypassGeofence });
  }, [blob, location, address, onCapture, isGpsTagged]);

  /* ── Derived ── */
  const isIn        = action === 'in';
  const accentBg    = isIn ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-500 hover:bg-red-600';
  const actionLabel = isIn ? 'Punch In' : 'Punch Out';

  // In geofencing mode, block the shutter when outside and GPS is acquired
  const outsideAndBlocked = isGeofencing && geoFence && !geoFence.allowed && gpsState === 'found';

  // In geofencing mode, also block while GPS is still being acquired (no coords yet)
  // Without this, a fast tap sends null lat/lng → backend rejects with "GPS required"
  const waitingForGps = isGeofencing && gpsState === 'acquiring';

  // In geofencing mode, block entirely when GPS is denied — can't verify location
  const gpsBlockedInGeofence = isGeofencing && gpsState === 'denied';

  // Prefer the most readable address; only fall back to coords when geocoding hasn't resolved yet
  const liveAddr = address.fullAddr || address.short || address.cityLine
    || (location ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : '');

  /* ── Mode badge for viewfinder ── */
  const ModeBadge = () => (
    <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold
      ${isGpsTagged ? 'bg-amber-500/90 text-white' : geoFence?.allowed ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'}`}>
      {isGpsTagged
        ? '📍 GPS Tagged · any location'
        : geoFence?.allowed
          ? `✓ Within ${geoFence.matchedName || 'office area'}`
          : geoFence?.distanceM != null
            ? `✗ ${geoFence.distanceM}m from ${geoFence.nearestName || 'office'}`
            : '✗ GPS required'}
    </span>
  );

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col select-none">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
           style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.80), transparent)' }}>
        <button onClick={onCancel}
          className="w-9 h-9 rounded-full border border-white/25 bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition">
          <X size={18} />
        </button>
        <div className="text-center">
          <p className="text-white font-bold text-sm tracking-wide">{actionLabel}</p>
          <p className={`text-[11px] tracking-wider font-semibold
            ${isGpsTagged ? 'text-amber-400' : 'text-blue-400'}`}>
            {isGpsTagged ? '📍 GPS TAGGED' : '🏢 GEOFENCING'}
          </p>
        </div>
        <div className="w-9" />
      </div>

      {/* ── Main view ── */}
      <div className="flex-1 relative overflow-hidden">
        {camError ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-gray-950">
            <div className="bg-white/8 border border-white/12 rounded-2xl p-7 text-center max-w-xs">
              <Camera size={44} className="text-white/30 mx-auto mb-3" />
              <p className="text-white/80 text-sm leading-relaxed mb-5">{camError}</p>
              <button onClick={onCancel} className="px-5 py-2 rounded-full border border-white/20 text-white/70 text-sm hover:bg-white/10 transition">
                Go back
              </button>
            </div>
          </div>

        ) : camStep === 'preview' ? (
          <img src={preview} alt="captured" className="w-full h-full object-contain bg-black" />

        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted
              className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />

            {flash && <div className="absolute inset-0 bg-white pointer-events-none" style={{ animation: 'camFlash 0.20s ease-out forwards' }} />}

            {/* Face guide oval */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: '14%' }}>
              <div className={`border-2 rounded-full ${isGpsTagged ? 'border-amber-400/40' : 'border-white/30'}`}
                   style={{ width: '54%', aspectRatio: '3/4' }} />
            </div>

            {/* GPS address band */}
            <div className="absolute bottom-0 left-0 right-0 px-4 py-3 pointer-events-none"
                 style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82), transparent)' }}>
              {gpsState === 'acquiring' && (
                <div className="flex items-center gap-2 text-white/70">
                  <Loader2 size={13} className="animate-spin shrink-0" />
                  <span className="text-xs">Acquiring GPS…</span>
                </div>
              )}
              {gpsState === 'denied' && (
                <div className="flex items-center gap-2 text-amber-400">
                  <Navigation size={13} className="shrink-0" />
                  <span className="text-xs">GPS unavailable — photo captured without location</span>
                </div>
              )}
              {gpsState === 'found' && (
                <div className="flex items-start gap-2">
                  <MapPin size={13} className={`shrink-0 mt-0.5 ${isGpsTagged ? 'text-amber-400' : 'text-orange-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-semibold leading-tight truncate">{liveAddr}</p>
                    {location && (
                      <p className="text-white/50 text-[10px] mt-0.5 tabular-nums">
                        {location.lat.toFixed(6)}° N &nbsp; {location.lng.toFixed(6)}° E
                      </p>
                    )}
                    {geoFence && <ModeBadge />}
                  </div>
                </div>
              )}
            </div>

            {camStep === 'loading' && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center">
                <Loader2 size={36} className="animate-spin text-white mb-3" />
                <p className="text-white/55 text-sm">Starting camera…</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="px-5 pb-10 pt-4 shrink-0"
           style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.90), rgba(0,0,0,0.55))' }}>

        {camStep === 'preview' ? (
          <>
            {/* Location summary */}
            {location && (
              <div className="flex items-start gap-2.5 mb-4 px-3.5 py-2.5 rounded-xl"
                   style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}>
                {isGpsTagged
                  ? <MapPin size={13} className="mt-0.5 shrink-0 text-amber-400" />
                  : <Building2 size={13} className="mt-0.5 shrink-0 text-blue-400" />}
                <div className="min-w-0">
                  <p className="text-white text-xs font-semibold leading-snug">
                    {address.cityLine || liveAddr}
                  </p>
                  {address.short && address.short !== address.cityLine && (
                    <p className="text-white/55 text-[10px] mt-0.5 truncate">{address.short}</p>
                  )}
                  <p className="text-white/40 text-[10px] mt-0.5 tabular-nums">
                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </p>
                  <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold
                    ${isGpsTagged ? 'bg-amber-500/80 text-white' : 'bg-blue-500/80 text-white'}`}>
                    {isGpsTagged ? '📍 GPS TAGGED' : '🏢 GEOFENCING'}
                  </span>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={retake}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/20 text-white text-sm hover:bg-white/8 transition">
                <RotateCcw size={15} /> Retake
              </button>
              <button onClick={confirm}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold shadow-lg transition ${accentBg}`}>
                <Check size={15} /> Confirm {actionLabel}
              </button>
            </div>
          </>

        ) : (
          <div className="flex flex-col items-center">

            {/* Geofencing mode — outside range warning */}
            {isGeofencing && outsideAndBlocked && (
              <div className="mb-4 px-4 py-3 rounded-xl text-center max-w-xs w-full"
                   style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.40)' }}>
                <p className="text-red-400 text-sm font-bold">Outside office area</p>
                {geoFence.distanceM != null && (
                  <p className="text-white/60 text-xs mt-1">
                    You are <strong className="text-white/80">{geoFence.distanceM}m</strong> away from{' '}
                    <strong className="text-white/80">{geoFence.nearestName || 'the office'}</strong>.
                    Move closer and try again, or go back and select GPS Tagged.
                  </p>
                )}
              </div>
            )}

            {/* Geofencing mode — GPS denied warning */}
            {gpsBlockedInGeofence && (
              <div className="mb-4 px-4 py-3 rounded-xl text-center max-w-xs w-full"
                   style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.40)' }}>
                <p className="text-red-400 text-sm font-bold">Location access required</p>
                <p className="text-white/60 text-xs mt-1">
                  Geofencing mode needs GPS to verify you are inside the office.
                  Enable location in browser settings, or go back and choose GPS Tagged.
                </p>
              </div>
            )}

            {/* GPS Tagged mode — info strip */}
            {isGpsTagged && gpsState === 'found' && (
              <div className="mb-4 px-4 py-2.5 rounded-xl text-center max-w-xs w-full"
                   style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.35)' }}>
                <p className="text-amber-400 text-xs font-semibold">📍 GPS Tagged Mode</p>
                <p className="text-white/55 text-[11px] mt-0.5">Your exact address will be stamped and saved</p>
              </div>
            )}

            {/* Shutter button */}
            <button
              onClick={capture}
              disabled={camStep !== 'ready' || outsideAndBlocked || waitingForGps || gpsBlockedInGeofence}
              className="relative w-[76px] h-[76px] rounded-full flex items-center justify-center
                         disabled:opacity-35 transition-transform active:scale-90"
              style={{
                border: `3px solid ${isGpsTagged ? 'rgba(251,191,36,0.5)' : (waitingForGps || gpsBlockedInGeofence) ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.50)'}`,
                background: 'rgba(255,255,255,0.10)',
              }}>
              <div className={`w-[58px] h-[58px] rounded-full shadow-2xl flex items-center justify-center
                ${outsideAndBlocked || waitingForGps || gpsBlockedInGeofence ? 'bg-gray-400' : 'bg-white'}`}>
                {waitingForGps
                  ? <Loader2 size={24} className="text-white animate-spin" />
                  : <Camera size={26} className="text-gray-800" />}
              </div>
            </button>
            <p className={`text-[11px] mt-3 tracking-widest
              ${outsideAndBlocked || gpsBlockedInGeofence ? 'text-red-400' : waitingForGps ? 'text-blue-300/80' : isGpsTagged ? 'text-amber-400/70' : 'text-white/35'}`}>
              {outsideAndBlocked ? 'MOVE CLOSER TO OFFICE' : waitingForGps ? 'ACQUIRING GPS…' : gpsBlockedInGeofence ? 'GPS REQUIRED' : 'TAP TO CAPTURE'}
            </p>
          </div>
        )}
      </div>

      <style>{`@keyframes camFlash { 0% { opacity:1; } 100% { opacity:0; } }`}</style>
    </div>
  );
}
