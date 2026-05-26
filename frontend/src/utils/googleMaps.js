/**
 * Singleton Google Maps JS API loader.
 * Calling loadGoogleMaps() multiple times returns the same promise,
 * so the <script> tag is only injected once per page load.
 */
let _promise = null;
let _rejectFn = null;

/* Google calls this globally when the API key fails auth.
   Common error codes printed in console:
   RefererNotAllowedMapError → domain not added to API key restrictions
   ApiNotActivatedMapError   → Maps JavaScript API not enabled in Cloud Console
   InvalidKeyMapError        → wrong key
   MissingKeyMapError        → no key provided                              */
window.gm_authFailure = () => {
  const msg =
    'Google Maps auth failed. Check browser console (F12) for the error code.\n\n' +
    'Most likely fix:\n' +
    '1. Go to console.cloud.google.com → APIs & Services → Credentials\n' +
    '2. Click your API key → under "Application restrictions" set to None (unrestricted)\n' +
    '3. Under "API restrictions" → Restrict key → select Maps JavaScript API + Places API\n' +
    '4. Save and hard-refresh (Ctrl+Shift+R)';
  console.error('[Google Maps]', msg);
  if (_rejectFn) _rejectFn(new Error('Google Maps auth failed — see console for details'));
};

export function loadGoogleMaps(apiKey) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (_promise) return _promise;

  _promise = new Promise((resolve, reject) => {
    _rejectFn = reject;
    const callbackName = '__gmapsReady_' + Date.now();
    window[callbackName] = () => {
      delete window[callbackName];
      _rejectFn = null;
      resolve(window.google.maps);
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      _promise = null;
      _rejectFn = null;
      delete window[callbackName];
      reject(new Error('Google Maps script failed to load — check network / API key'));
    };
    document.head.appendChild(script);
  });

  return _promise;
}

/**
 * Reverse-geocode using:
 *   1. Google Maps JS Geocoder  — if the Maps SDK is already loaded on page
 *   2. Nominatim (OpenStreetMap) — free, CORS-safe, no-key fallback
 *
 * Returns structured { cityLine, fullAddr, short, cc } used by
 * the geo-stamp canvas and the database address fields.
 */
export async function reverseGeocodeGoogle(lat, lng, _apiKey) {
  /* ── 1. Google Maps JS Geocoder (available when GeofenceMap loaded the SDK) ── */
  if (window.google?.maps?.Geocoder) {
    try {
      const result = await new Promise((resolve, reject) => {
        new window.google.maps.Geocoder().geocode(
          { location: { lat, lng } },
          (results, status) => {
            if (status === 'OK' && results?.[0]) resolve(results[0]);
            else reject(new Error(status));
          },
        );
      });
      const comp  = result.address_components || [];
      const get   = t => comp.find(c => c.types.includes(t))?.long_name  || '';
      const getS  = t => comp.find(c => c.types.includes(t))?.short_name || '';
      const streetNo = get('street_number');
      const route    = get('route');
      const subloc   = get('sublocality') || get('sublocality_level_1') || get('neighborhood');
      const locality = get('locality')    || get('postal_town');
      const state    = get('administrative_area_level_1');
      const country  = get('country');
      const cc       = getS('country').toUpperCase();
      const street   = [streetNo, route].filter(Boolean).join(' ');
      const cityLine = [locality, state, country].filter(Boolean).join(', ');
      const fullAddr = result.formatted_address || cityLine;
      const short    = [subloc || street, locality, state].filter(Boolean).join(', ') || cityLine;
      if (cityLine) return { cityLine, fullAddr, short, cc };
    } catch { /* fall through to Nominatim */ }
  }

  /* ── 2. Nominatim / OpenStreetMap — CORS-safe, no API key needed ── */
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } },
    );
    if (!r.ok) throw new Error('network');
    const d = await r.json();
    const a = d.address || {};

    const city    = a.city || a.town || a.village || a.municipality || a.county || '';
    const state   = a.state || a.region || '';
    const country = a.country || '';
    const cc      = (a.country_code || '').toUpperCase();
    const suburb  = a.suburb || a.neighbourhood || a.quarter || '';
    const road    = [a.house_number, a.road || a.street].filter(Boolean).join(' ');

    const cityLine = [city, state, country].filter(Boolean).join(', ');
    const short    = [suburb || road, city, state].filter(Boolean).join(', ') || cityLine;
    const fullAddr = d.display_name || cityLine;

    if (cityLine) return { cityLine, fullAddr, short, cc };
  } catch { /* fall through */ }

  /* ── 3. Last-resort coordinate fallback ── */
  return {
    cityLine: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    fullAddr: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    short:    `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    cc: '',
  };
}
