/**
 * GeofenceMap — Google Maps JavaScript API
 * ─ Multiple office location pins with radius circles
 * ─ Google Places Autocomplete search bar
 * ─ "You are here" blue dot with Google reverse-geocoded address
 * ─ Add / edit / delete / toggle-active office locations
 * ─ Road / Satellite / Hybrid map types
 * ─ Draggable markers that update position on dragend
 */
import { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps, reverseGeocodeGoogle } from '../utils/googleMaps';
import {
  MapPin, Navigation, Plus, CheckCircle,
  Pencil, ToggleRight, ToggleLeft, Trash2,
  LocateFixed, Loader2, Search, X,
} from 'lucide-react';

/* ─── Inject Google Places autocomplete dropdown styling once ─── */
const PAC_STYLE_ID = '__pac_style__';
if (!document.getElementById(PAC_STYLE_ID)) {
  const s = document.createElement('style');
  s.id = PAC_STYLE_ID;
  s.textContent = `
    .pac-container {
      z-index: 99999 !important;
      border-radius: 14px !important;
      margin-top: 6px !important;
      box-shadow: 0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08) !important;
      border: 1px solid #e5e7eb !important;
      overflow: hidden !important;
      font-family: inherit !important;
      padding: 4px 0 !important;
      background: #fff !important;
    }
    .dark .pac-container { background: #1f2937 !important; border-color: #374151 !important; }
    .pac-item {
      padding: 9px 14px !important;
      cursor: pointer !important;
      font-size: 13px !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      border-top: 1px solid #f3f4f6 !important;
      transition: background 0.12s !important;
      color: #374151 !important;
    }
    .pac-item:first-child { border-top: none !important; }
    .pac-item:hover, .pac-item-selected { background: #eff6ff !important; }
    .pac-item-query { font-size: 13px !important; font-weight: 600 !important; color: #111827 !important; }
    .pac-matched { font-weight: 700 !important; color: #2563eb !important; }
    .pac-icon { display: none !important; }
    .pac-item:before {
      content: '' !important;
      display: inline-block !important;
      width: 14px !important; height: 14px !important;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z'/%3E%3Ccircle cx='12' cy='9' r='2.5'/%3E%3C/svg%3E") !important;
      background-repeat: no-repeat !important;
      background-size: contain !important;
      flex-shrink: 0 !important;
    }
    .pac-logo:after { display: none !important; }
  `;
  document.head.appendChild(s);
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

/* ─── SVG pin helper (returns raw SVG string for data-URL icons) ─── */
function pinSvg(fill) {
  return `<svg width="30" height="40" viewBox="0 0 30 40" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 0C6.72 0 0 6.72 0 15c0 10.5 15 25 15 25S30 25.5 30 15C30 6.72 23.28 0 15 0z"
          fill="${fill}" stroke="white" stroke-width="1.5"/>
    <circle cx="15" cy="15" r="5.5" fill="white"/>
  </svg>`;
}
function pinIcon(gm, color) {
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(pinSvg(color))}`,
    scaledSize: new gm.Size(30, 40),
    anchor:     new gm.Point(15, 40),
  };
}

/* ════════════════════════════════════════════════════════════════════
   GeofenceMap component
════════════════════════════════════════════════════════════════════ */
export default function GeofenceMap({ locations, onAdd, onDelete, onUpdate }) {
  /* ─ Refs ─ */
  const containerRef  = useRef(null);
  const mapRef        = useRef(null);
  const markersRef    = useRef({});     // { [id]: { marker, circle } }
  const meRef         = useRef(null);   // "You are here" marker
  const pendingRef    = useRef(null);   // unsaved new-pin marker
  const clickListRef  = useRef(null);   // map click listener handle
  const searchInputRef = useRef(null);

  /* ─ Map state ─ */
  const [mapsReady,  setMapsReady]  = useState(false);
  const [mapError,   setMapError]   = useState('');
  const [mapType,    setMapType]    = useState('roadmap');

  /* ─ Device location ─ */
  const [myPos,      setMyPos]      = useState(null);
  const [myAddress,  setMyAddress]  = useState('');
  const [locLoading, setLocLoading] = useState(true);
  const [locError,   setLocError]   = useState('');

  /* ─ Search bar ─ */
  const [searchQuery, setSearchQuery] = useState('');
  const autocompleteRef = useRef(null);   // google Autocomplete instance

  /* ─ Place new location ─ */
  const [placing,    setPlacing]    = useState(false);
  const [pendingLL,  setPendingLL]  = useState(null);
  const [newName,    setNewName]    = useState('');
  const [newRadius,  setNewRadius]  = useState(50);
  const [saving,     setSaving]     = useState(false);
  const [saveErr,    setSaveErr]    = useState('');

  /* ─ Inline edit ─ */
  const [editId,     setEditId]     = useState(null);
  const [editName,   setEditName]   = useState('');
  const [editRadius, setEditRadius] = useState(50);
  const [editSaving, setEditSaving] = useState(false);

  /* ══════════════════════════════════════════════════════════════════
     EFFECT 1 — Load Google Maps SDK
  ══════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    loadGoogleMaps(API_KEY)
      .then(() => setMapsReady(true))
      .catch(() => setMapError('Failed to load Google Maps. Please check the API key.'));
  }, []);

  /* ══════════════════════════════════════════════════════════════════
     EFFECT 2 — Init map (runs once SDK is ready)
  ══════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!mapsReady || !containerRef.current || mapRef.current) return;
    const gm  = window.google.maps;
    const map = new gm.Map(containerRef.current, {
      center:             { lat: 20.5937, lng: 78.9629 },
      zoom:               5,
      mapTypeId:          'roadmap',
      streetViewControl:  false,
      fullscreenControl:  false,
      mapTypeControl:     false,
      zoomControl:        true,
    });
    mapRef.current = map;

    // Google Places Autocomplete on the search input
    if (searchInputRef.current) {
      const ac = new gm.places.Autocomplete(searchInputRef.current, {
        fields: ['geometry', 'name', 'formatted_address'],
      });
      autocompleteRef.current = ac;
      ac.addListener('place_changed', () => {
        const p = ac.getPlace();
        if (p.geometry?.location) {
          map.setCenter(p.geometry.location);
          map.setZoom(16);
          setSearchQuery(p.formatted_address || p.name || '');
        }
      });
    }

    return () => {
      Object.values(markersRef.current).forEach(({ marker, circle }) => {
        marker?.setMap(null);
        circle?.setMap(null);
      });
      markersRef.current = {};
      meRef.current?.setMap(null);      meRef.current     = null;
      pendingRef.current?.setMap(null); pendingRef.current = null;
      if (clickListRef.current) gm.event.removeListener(clickListRef.current);
      mapRef.current = null;
    };
  }, [mapsReady]);

  /* ══════════════════════════════════════════════════════════════════
     EFFECT 3 — Device location + reverse-geocode
  ══════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!mapsReady) return;
    if (!navigator.geolocation) {
      setLocError('Geolocation not supported by this browser');
      setLocLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setMyPos({ lat, lng });
        setLocLoading(false);

        const gm = window.google.maps;
        if (mapRef.current) {
          mapRef.current.setCenter({ lat, lng });
          mapRef.current.setZoom(15);
          meRef.current?.setMap(null);
          meRef.current = new gm.Marker({
            position: { lat, lng },
            map:      mapRef.current,
            title:    'You are here',
            icon: {
              path:        gm.SymbolPath.CIRCLE,
              scale:       10,
              fillColor:   '#2563eb',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            },
            zIndex: 1000,
          });
          const iw = new gm.InfoWindow({ content: '<b>You are here</b>' });
          meRef.current.addListener('click', () => iw.open(mapRef.current, meRef.current));
        }
        const addr = await reverseGeocodeGoogle(lat, lng, API_KEY);
        setMyAddress(addr.fullAddr || addr.short || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      },
      (err) => {
        setLocError(err.code === 1 ? 'Location access denied — allow in browser settings' : 'Unable to detect location');
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [mapsReady]); // eslint-disable-line

  /* ══════════════════════════════════════════════════════════════════
     EFFECT 4 — Map type
  ══════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    mapRef.current?.setMapTypeId(mapType);
  }, [mapType]);

  /* ══════════════════════════════════════════════════════════════════
     EFFECT 5 — Office location markers & circles
  ══════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapsReady) return;
    const gm = window.google.maps;

    const liveIds = new Set(locations.map(l => l.id));

    // Remove stale markers
    Object.keys(markersRef.current).forEach(key => {
      if (!liveIds.has(Number(key))) {
        markersRef.current[key]?.marker?.setMap(null);
        markersRef.current[key]?.circle?.setMap(null);
        delete markersRef.current[key];
      }
    });

    // Add / update
    locations.forEach(loc => {
      const pos = { lat: Number(loc.lat), lng: Number(loc.lng) };
      const existing = markersRef.current[loc.id];

      if (existing) {
        existing.marker.setPosition(pos);
        existing.circle.setCenter(pos);
        existing.circle.setRadius(loc.radius_meters);
      } else {
        const circle = new gm.Circle({
          center:        pos,
          radius:        loc.radius_meters,
          strokeColor:   '#2563eb',
          strokeOpacity: 0.85,
          strokeWeight:  2,
          fillColor:     '#3b82f6',
          fillOpacity:   0.13,
          map,
        });
        const marker = new gm.Marker({
          position:  pos,
          map,
          title:     loc.name,
          draggable: true,
          icon:      pinIcon(gm, '#2563eb'),
        });
        const iw = new gm.InfoWindow({
          content: `<div style="font-size:13px;padding:2px 4px"><b>${loc.name}</b><br/>${loc.radius_meters} m radius</div>`,
        });
        marker.addListener('click', () => iw.open(map, marker));
        marker.addListener('dragend', e => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          circle.setCenter({ lat, lng });
          onUpdate(loc.id, { lat, lng });
        });
        markersRef.current[loc.id] = { marker, circle };
      }
    });

    // Fit bounds on first load (when no user location yet)
    if (!myPos && locations.length > 0) {
      try {
        const bounds = new gm.LatLngBounds();
        Object.values(markersRef.current).forEach(({ marker }) => {
          if (marker) bounds.extend(marker.getPosition());
        });
        if (!bounds.isEmpty()) map.fitBounds(bounds);
      } catch (_) {}
    }
  }, [locations, mapsReady, myPos, onUpdate]);

  /* ══════════════════════════════════════════════════════════════════
     EFFECT 6 — Click handler for "placing" mode
  ══════════════════════════════════════════════════════════════════ */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapsReady) return;
    const gm = window.google.maps;

    if (clickListRef.current) gm.event.removeListener(clickListRef.current);

    clickListRef.current = map.addListener('click', (e) => {
      if (!placing) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      pendingRef.current?.setMap(null);
      pendingRef.current = new gm.Marker({
        position: { lat, lng },
        map,
        icon:     pinIcon(gm, '#16a34a'),
      });
      setPendingLL({ lat, lng });
      setNewName('');
      setNewRadius(50);
      setSaveErr('');
    });

    return () => {
      if (clickListRef.current) {
        gm.event.removeListener(clickListRef.current);
        clickListRef.current = null;
      }
    };
  }, [placing, mapsReady]);

  /* ─── Handlers ──────────────────────────────────────────────────── */
  const flyToMe = () => {
    if (myPos && mapRef.current) {
      mapRef.current.setCenter({ lat: myPos.lat, lng: myPos.lng });
      mapRef.current.setZoom(17);
    }
  };

  const confirmNew = async () => {
    if (!newName.trim()) { setSaveErr('Please enter a location name'); return; }
    setSaving(true); setSaveErr('');
    try {
      await onAdd({ name: newName.trim(), lat: pendingLL.lat, lng: pendingLL.lng, radius_meters: newRadius });
      pendingRef.current?.setMap(null); pendingRef.current = null;
      setPendingLL(null); setPlacing(false);
    } catch (e) { setSaveErr(e?.response?.data?.detail || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const cancelNew = () => {
    pendingRef.current?.setMap(null); pendingRef.current = null;
    setPendingLL(null); setPlacing(false); setSaveErr('');
  };

  const startEdit  = (loc) => { setEditId(loc.id); setEditName(loc.name); setEditRadius(loc.radius_meters); };
  const cancelEdit = ()     => setEditId(null);
  const saveEdit   = async (id) => {
    setEditSaving(true);
    try { await onUpdate(id, { name: editName, radius_meters: Number(editRadius) }); setEditId(null); }
    finally { setEditSaving(false); }
  };

  /* ─── Error state ─── */
  if (mapError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-3 p-6
                      rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <MapPin size={28} className="text-red-400" />
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">Map failed to load</p>
        <p className="text-xs text-red-400 max-w-xs break-words">{mapError}</p>
      </div>
    );
  }

  /* ─── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="space-y-3">

      {/* ── Device location card ── */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border
        ${locLoading
          ? 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700'
          : locError
            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
            : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'}`}>

        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
          ${locLoading ? 'bg-gray-200 dark:bg-gray-700'
            : locError  ? 'bg-amber-100 dark:bg-amber-900/30'
                        : 'bg-blue-100 dark:bg-blue-900/30'}`}>
          {locLoading
            ? <Loader2 size={16} className="text-gray-400 animate-spin" />
            : locError
              ? <MapPin size={16} className="text-amber-500" />
              : <LocateFixed size={16} className="text-blue-600 dark:text-blue-400" />}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold uppercase tracking-wide mb-0.5
            ${locLoading ? 'text-gray-400'
              : locError  ? 'text-amber-600 dark:text-amber-400'
                          : 'text-blue-600 dark:text-blue-400'}`}>
            {locLoading ? 'Detecting your location…' : locError ? 'Location unavailable' : 'Your device location'}
          </p>
          {!locLoading && !locError && myPos && (
            <>
              <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                {myAddress || 'Fetching address…'}
              </p>
              <p className="text-xs text-gray-400 tabular-nums mt-0.5">
                {myPos.lat.toFixed(6)}, {myPos.lng.toFixed(6)}
              </p>
            </>
          )}
          {locError && <p className="text-xs text-amber-600 dark:text-amber-400">{locError}</p>}
        </div>

        {myPos && (
          <button onClick={flyToMe} title="Centre map on my location"
            className="shrink-0 p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200
                       dark:hover:bg-blue-900/60 transition-colors">
            <Navigation size={14} className="text-blue-600 dark:text-blue-400" />
          </button>
        )}
      </div>

      {/* ── Controls row ── */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Google Places Autocomplete search */}
        <div className="relative flex-1 min-w-[220px]">
          <div className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 shadow-sm transition-all
            bg-white dark:bg-gray-800
            border-gray-200 dark:border-gray-700
            focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20`}>
            <Search size={15} className="text-blue-500 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search address, city or place…"
              className="flex-1 bg-transparent text-sm text-gray-700 dark:text-gray-200 outline-none placeholder-gray-400 min-w-0"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  if (searchInputRef.current) searchInputRef.current.value = '';
                }}
                className="shrink-0 w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                <X size={10} className="text-gray-500 dark:text-gray-300" />
              </button>
            )}
          </div>
        </div>

        {/* Map type */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
          {[['roadmap','Road'],['satellite','Sat'],['hybrid','Hybrid']].map(([v, label]) => (
            <button key={v} onClick={() => setMapType(v)}
              className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors
                ${mapType === v
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Add location button */}
        <button onClick={() => { if (placing) cancelNew(); else setPlacing(true); }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all
            ${placing ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
          <Plus size={15} />
          {placing ? 'Cancel' : 'Add location'}
        </button>
      </div>

      {/* Instruction strip */}
      {placing && !pendingLL && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                        bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800
                        text-blue-700 dark:text-blue-300 text-sm">
          <MapPin size={14} className="animate-bounce shrink-0" />
          Search for your location above, then click anywhere on the map to drop a pin
        </div>
      )}

      {/* New-pin form */}
      {pendingLL && (
        <div className="p-4 rounded-xl space-y-3
                        bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <MapPin size={14} />
            New pin at {pendingLL.lat.toFixed(5)}, {pendingLL.lng.toFixed(5)}
          </p>
          <div className="flex flex-wrap gap-3">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Location name (e.g. Head Office)"
              className="flex-1 min-w-[160px] border border-gray-200 dark:border-gray-700
                         rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700
                            rounded-xl px-3 py-2 bg-white dark:bg-gray-800">
              <Navigation size={12} className="text-gray-400" />
              <input type="number" min={10} max={5000} value={newRadius}
                onChange={e => setNewRadius(Number(e.target.value))}
                className="w-16 bg-transparent text-sm text-gray-700 dark:text-white outline-none tabular-nums" />
              <span className="text-xs text-gray-400">m radius</span>
            </div>
          </div>
          {saveErr && <p className="text-xs text-red-500">{saveErr}</p>}
          <div className="flex gap-2">
            <button onClick={confirmNew} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700
                         text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors">
              <CheckCircle size={14} />{saving ? 'Saving…' : 'Save location'}
            </button>
            <button onClick={cancelNew}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 border border-gray-200
                         dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Google Map ── */}
      <div
        ref={containerRef}
        className="w-full rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-lg"
        style={{ height: 420, position: 'relative', zIndex: 0 }}
      >
        {!mapsReady && !mapError && (
          <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="animate-spin text-blue-500" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading Google Maps…</p>
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 px-1 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
          You are here
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#2563eb] inline-block border border-white" />
          Office location
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block border border-white" />
          New pin
        </span>
      </div>

      {/* ── Saved locations list ── */}
      {locations.length > 0 && (
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pt-1">
          Pinned locations ({locations.length})
        </p>
      )}

      <div className="space-y-2">
        {locations.map(loc => (
          <div key={loc.id}
            className="p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">

            {editId === loc.id ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs text-gray-400 mb-1">Name</label>
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5
                               text-sm bg-white dark:bg-gray-900 dark:text-white
                               focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Radius (m)</label>
                  <input type="number" min={10} max={5000} value={editRadius}
                    onChange={e => setEditRadius(e.target.value)}
                    className="w-24 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5
                               text-sm bg-white dark:bg-gray-900 dark:text-white tabular-nums
                               focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(loc.id)} disabled={editSaving}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700
                               text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                    <CheckCircle size={12} />{editSaving ? '…' : 'Save'}
                  </button>
                  <button onClick={cancelEdit}
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-700
                               text-xs text-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                  <MapPin size={14} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-gray-800 dark:text-white">{loc.name}</p>
                  <p className="text-xs text-gray-400 tabular-nums">
                    {Number(loc.lat).toFixed(5)}, {Number(loc.lng).toFixed(5)}
                    <span className="mx-1 opacity-50">·</span>
                    <span className="text-blue-500 font-medium">{loc.radius_meters} m radius</span>
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0
                  ${loc.is_active
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                  {loc.is_active ? 'Active' : 'Inactive'}
                </span>
                <button onClick={() => onUpdate(loc.id, { is_active: !loc.is_active })}
                  title={loc.is_active ? 'Deactivate' : 'Activate'}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shrink-0">
                  {loc.is_active
                    ? <ToggleRight size={18} className="text-emerald-500" />
                    : <ToggleLeft  size={18} className="text-gray-400" />}
                </button>
                <button onClick={() => startEdit(loc)} title="Edit"
                  className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors shrink-0">
                  <Pencil size={13} className="text-blue-500" />
                </button>
                <button onClick={() => onDelete(loc.id)} title="Delete"
                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0">
                  <Trash2 size={13} className="text-red-400" />
                </button>
              </div>
            )}
          </div>
        ))}

        {locations.length === 0 && !placing && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
              <MapPin size={20} className="text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No office locations pinned yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Search for your office address above, click "Add location", then tap the map to drop a pin
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
