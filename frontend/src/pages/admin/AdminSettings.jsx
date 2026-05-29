/**
 * AdminSettings — 4-tab settings page
 *   1. Company Profile   — logo, name, contact info
 *   2. Attendance        — shift times, grace, geofence toggle + map
 *   3. Geofencing        — full-screen Leaflet map with search (lazy-loaded)
 *   4. Support & Legal   — About, FAQ, Privacy Policy, T&C, Disclaimer
 */
import { Component, lazy, Suspense, useEffect, useRef, useState, useCallback } from 'react';
import {
  Settings, Clock, MapPin,
  CheckCircle, Save, ToggleLeft, ToggleRight,
  Building2, FileText, Shield, BookOpen, AlertTriangle, HelpCircle,
  Camera, Globe, Phone, Mail, Upload, Type,
} from 'lucide-react';
import { FontSizeSection, ActiveSessionsSection } from '../../components/SettingsExtras';
import { officeLocationsApi, attendanceSettingsApi } from '../../services/api';
import api from '../../services/api';

/* ── Lazy-loaded Leaflet map ── */
const GeofenceMap = lazy(() => import('../../components/GeofenceMap'));

/* ── Company API ── */
const companyApi = {
  get:  ()     => api.get('/company-profile/'),
  save: (data) => api.post('/company-profile/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

/* ── Normalize any API response to an array ── */
function toArray(data) {
  if (Array.isArray(data))          return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
}

/* ════════════════════════════════════════════════════════════════════
   MapErrorBoundary — catches crashes inside GeofenceMap only
════════════════════════════════════════════════════════════════════ */
class MapErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(err) { return { error: err }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3
                        rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900">
          <MapPin size={24} className="text-red-400" />
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">Map failed to load</p>
          <p className="text-xs text-gray-400 max-w-xs">{String(this.state.error.message || this.state.error)}</p>
          <button onClick={() => this.setState({ error: null })}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700">
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ════════════════════════════════════════════════════════════════════
   LegalEditor
════════════════════════════════════════════════════════════════════ */
function LegalEditor({ label, icon: Icon, value, onChange }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
        <Icon size={15} className="text-blue-500" />{label}
      </label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={6}
        placeholder={`Enter your ${label.toLowerCase()} here…`}
        className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm
                   bg-white dark:bg-gray-800 dark:text-white placeholder-gray-400 resize-y
                   focus:outline-none focus:ring-2 focus:ring-blue-400 leading-relaxed" />
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   AdminSettings
════════════════════════════════════════════════════════════════════ */
const SECTIONS = [
  { key: 'company',    label: 'Company Profile',    icon: Building2  },
  { key: 'attendance', label: 'Attendance Settings', icon: Clock      },
  { key: 'geofencing', label: 'Geofencing',          icon: MapPin     },
  { key: 'legal',      label: 'Support & Legal',     icon: FileText   },
  { key: 'appearance', label: 'Appearance & Security', icon: Type     },
];

const LEGAL_DOCS = [
  { key: 'about',            label: 'About Company',      icon: Building2     },
  { key: 'faq',              label: 'FAQ',                icon: HelpCircle    },
  { key: 'privacy_policy',   label: 'Privacy Policy',     icon: Shield        },
  { key: 'terms_conditions', label: 'Terms & Conditions', icon: BookOpen      },
  { key: 'disclaimer',       label: 'Disclaimer',         icon: AlertTriangle },
];

export default function AdminSettings() {
  const [section,   setSection]   = useState('company');
  const [locations, setLocations] = useState([]);   // always an array

  /* Company profile */
  const [company,     setCompany]     = useState({
    company_name: '', address: '', phone: '', email: '', website: '',
    about: '', faq: '', privacy_policy: '', terms_conditions: '', disclaimer: '',
  });
  const [logoFile,    setLogoFile]    = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [compDirty,   setCompDirty]   = useState(false);
  const [compSaving,  setCompSaving]  = useState(false);
  const [compOk,      setCompOk]      = useState(false);
  const logoInputRef = useRef(null);

  /* Attendance settings */
  const [cfg,       setCfg]       = useState({ shift_start: '09:00', shift_end: '18:00', grace_minutes: 15, geofence_enabled: true });
  const [cfgDirty,  setCfgDirty]  = useState(false);
  const [cfgSaving, setCfgSaving] = useState(false);
  const [cfgOk,     setCfgOk]     = useState(false);

  /* Legal docs */
  const [legal,       setLegal]       = useState({ about: '', faq: '', privacy_policy: '', terms_conditions: '', disclaimer: '' });
  const [legalDirty,  setLegalDirty]  = useState(false);
  const [legalSaving, setLegalSaving] = useState(false);
  const [legalOk,     setLegalOk]     = useState(false);

  /* ── Load on mount ── */
  useEffect(() => {
    // Always normalise to array — backend may return paginated {count,results:[]}
    officeLocationsApi.list()
      .then(r => setLocations(toArray(r.data)))
      .catch(() => setLocations([]));

    attendanceSettingsApi.get()
      .then(r => {
        const d = Array.isArray(r.data) ? r.data[0] : r.data;
        if (d) setCfg(prev => ({ ...prev, ...d }));
      }).catch(() => {});

    companyApi.get()
      .then(r => {
        const d = Array.isArray(r.data) ? r.data[0] : r.data;
        if (d) {
          setCompany(d);
          setLegal({
            about:            d.about            || '',
            faq:              d.faq              || '',
            privacy_policy:   d.privacy_policy   || '',
            terms_conditions: d.terms_conditions || '',
            disclaimer:       d.disclaimer       || '',
          });
          if (d.logo_url) setLogoPreview(d.logo_url);
        }
      }).catch(() => {});
  }, []);

  /* ── Saves ── */
  const saveCompany = async () => {
    setCompSaving(true);
    try {
      const fd = new FormData();
      Object.entries(company).forEach(([k, v]) => {
        if (!['logo', 'logo_url', 'id', 'updated_at',
              'about', 'faq', 'privacy_policy', 'terms_conditions', 'disclaimer'].includes(k))
          fd.append(k, v ?? '');
      });
      if (logoFile) fd.append('logo', logoFile);
      await companyApi.save(fd);
      setCompDirty(false); setCompOk(true);
      setTimeout(() => setCompOk(false), 2500);
    } finally { setCompSaving(false); }
  };

  const saveLegal = async () => {
    setLegalSaving(true);
    try {
      const fd = new FormData();
      Object.entries(legal).forEach(([k, v]) => fd.append(k, v ?? ''));
      await companyApi.save(fd);
      setLegalDirty(false); setLegalOk(true);
      setTimeout(() => setLegalOk(false), 2500);
    } finally { setLegalSaving(false); }
  };

  const saveCfg = async () => {
    setCfgSaving(true);
    try {
      await attendanceSettingsApi.save(cfg);
      setCfgDirty(false); setCfgOk(true);
      setTimeout(() => setCfgOk(false), 2500);
    } finally { setCfgSaving(false); }
  };

  const patchCfg   = (k, v) => { setCfg(c     => ({ ...c, [k]: v })); setCfgDirty(true);   setCfgOk(false);   };
  const patchComp  = (k, v) => { setCompany(c  => ({ ...c, [k]: v })); setCompDirty(true);  setCompOk(false);  };
  const patchLegal = (k, v) => { setLegal(c    => ({ ...c, [k]: v })); setLegalDirty(true); setLegalOk(false); };

  const handleLogoFile = (file) => {
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setCompDirty(true); setCompOk(false);
  };

  /* ── Location CRUD — always keep state as array ── */
  const handleAdd    = async (data) => {
    const r = await officeLocationsApi.create(data);
    setLocations(ls => [...ls, r.data]);
  };
  const handleDelete = async (id) => {
    await officeLocationsApi.delete(id);
    setLocations(ls => ls.filter(l => l.id !== id));
  };
  const handleUpdate = useCallback(async (id, data) => {
    const r = await officeLocationsApi.update(id, data);
    setLocations(ls => ls.map(l => l.id === id ? r.data : l));
  }, []);

  /* ── Time options ── */
  const timeOptions = [];
  for (let h = 0; h < 24; h++) for (const m of ['00', '30'])
    timeOptions.push(`${String(h).padStart(2, '0')}:${m}`);

  const SaveBar = ({ dirty, saving, ok, onSave }) => (
    <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 mt-6">
      <button onClick={onSave} disabled={!dirty || saving}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm
                   font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
        <Save size={14} />{saving ? 'Saving…' : 'Save Changes'}
      </button>
      {ok && (
        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-medium">
          <CheckCircle size={15} />Saved
        </span>
      )}
    </div>
  );

  const activeCount = locations.filter(l => l.is_active).length;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <Settings size={22} />Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Manage company profile, attendance rules, office locations and legal documents
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-5">

        {/* ── Sidebar ── */}
        <div className="md:w-56 shrink-0">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {SECTIONS.map(s => {
              const Icon = s.icon;
              return (
                <button key={s.key} onClick={() => setSection(s.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-left
                              transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0
                    ${section === s.key
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-l-4 border-l-blue-600'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                  <Icon size={15} className="shrink-0" />
                  <span className="flex-1">{s.label}</span>
                  {s.key === 'geofencing' && activeCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold
                                     flex items-center justify-center shrink-0">
                      {activeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 min-w-0">

          {/* ════ Company Profile ════ */}
          {section === 'company' && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Building2 size={16} className="text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Company Profile</h3>
                  <p className="text-xs text-gray-400">Branding and contact information</p>
                </div>
              </div>

              {/* Logo */}
              <div className="flex items-center gap-4">
                <div onClick={() => logoInputRef.current?.click()}
                  className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700
                             cursor-pointer hover:border-blue-400 transition-colors flex items-center justify-center
                             overflow-hidden bg-gray-50 dark:bg-gray-800 shrink-0">
                  {logoPreview
                    ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover" />
                    : <Camera size={24} className="text-gray-400" />}
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity
                                  flex items-center justify-center rounded-2xl">
                    <Upload size={16} className="text-white" />
                  </div>
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => handleLogoFile(e.target.files[0])} />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Company Logo</p>
                  <p className="text-xs text-gray-400 mt-0.5">PNG, JPG up to 2 MB. Click to change.</p>
                  {logoFile && <p className="text-xs text-emerald-500 mt-1">✓ New logo selected</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { key: 'company_name', label: 'Company Name', icon: Building2, type: 'text', span: true },
                  { key: 'phone',  label: 'Phone',   icon: Phone,  type: 'tel'   },
                  { key: 'email',  label: 'Email',   icon: Mail,   type: 'email' },
                  { key: 'website',label: 'Website', icon: Globe,  type: 'url'   },
                ].map(f => (
                  <div key={f.key} className={f.span ? 'sm:col-span-2' : ''}>
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                      <f.icon size={11} />{f.label}
                    </label>
                    <input type={f.type} value={company[f.key] || ''}
                      onChange={e => patchComp(f.key, e.target.value)}
                      className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white
                                 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Address</label>
                  <textarea value={company.address || ''} onChange={e => patchComp('address', e.target.value)} rows={2}
                    className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white
                               rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
              <SaveBar dirty={compDirty} saving={compSaving} ok={compOk} onSave={saveCompany} />
            </div>
          )}

          {/* ════ Attendance Settings ════ */}
          {section === 'attendance' && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Clock size={16} className="text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Work Hours &amp; Grace Period</h3>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Define shift timings</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { key: 'shift_start',   label: 'Shift Start',  type: 'select' },
                  { key: 'shift_end',     label: 'Shift End',    type: 'select' },
                  { key: 'grace_minutes', label: 'Grace (mins)', type: 'number' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                      {f.label}
                    </label>
                    {f.type === 'select' ? (
                      <select value={cfg[f.key]} onChange={e => patchCfg(f.key, e.target.value)}
                        className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white
                                   rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                        {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <input type="number" min={0} max={120} value={cfg[f.key]}
                        onChange={e => patchCfg(f.key, Number(e.target.value))}
                        className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white
                                   rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                    )}
                  </div>
                ))}
              </div>

              {/* Geofencing toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60
                              border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <MapPin size={16} className="text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white text-sm">Geofencing</p>
                    <p className="text-xs text-gray-400">
                      {cfg.geofence_enabled ? 'Staff must be within office radius to punch in/out' : 'Staff can punch from anywhere'}
                    </p>
                  </div>
                </div>
                <button onClick={() => patchCfg('geofence_enabled', !cfg.geofence_enabled)}>
                  {cfg.geofence_enabled
                    ? <ToggleRight size={32} className="text-emerald-500" />
                    : <ToggleLeft  size={32} className="text-gray-400" />}
                </button>
              </div>

              <SaveBar dirty={cfgDirty} saving={cfgSaving} ok={cfgOk} onSave={saveCfg} />
            </div>
          )}

          {/* ════ Geofencing — full map ════ */}
          {section === 'geofencing' && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <MapPin size={16} className="text-emerald-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Geofencing &amp; Office Locations</h3>
                  <p className="text-xs text-gray-400">Search your office address, add a pin, set the allowed radius</p>
                </div>
                {activeCount > 0 && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                                   bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {activeCount} active
                  </span>
                )}
              </div>

              {/* Map (lazy + error boundary) */}
              <MapErrorBoundary>
                <Suspense fallback={
                  <div className="flex items-center justify-center h-64 gap-2 text-gray-400 text-sm">
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Loading map…
                  </div>
                }>
                  <GeofenceMap
                    locations={locations}
                    onAdd={handleAdd}
                    onDelete={handleDelete}
                    onUpdate={handleUpdate}
                  />
                </Suspense>
              </MapErrorBoundary>
            </div>
          )}

          {/* ════ Appearance & Security ════ */}
          {section === 'appearance' && (
            <div className="space-y-5">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 pb-3">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                    <Type size={16} className="text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Appearance &amp; Security</h3>
                    <p className="text-xs text-gray-400">Font size preference and logged-in devices</p>
                  </div>
                </div>
                <FontSizeSection />
              </div>
              <ActiveSessionsSection />
            </div>
          )}

          {/* ════ Support & Legal ════ */}
          {section === 'legal' && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                  <FileText size={16} className="text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white text-sm">Support &amp; Legal Documents</h3>
                  <p className="text-xs text-gray-400">Visible to all staff in their Settings page</p>
                </div>
              </div>
              <div className="space-y-5">
                {LEGAL_DOCS.map(d => (
                  <LegalEditor key={d.key} label={d.label} icon={d.icon}
                    value={legal[d.key]} onChange={v => patchLegal(d.key, v)} />
                ))}
              </div>
              <SaveBar dirty={legalDirty} saving={legalSaving} ok={legalOk} onSave={saveLegal} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
