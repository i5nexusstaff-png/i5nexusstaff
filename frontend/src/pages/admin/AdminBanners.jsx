import { useEffect, useRef, useState } from 'react';
import {
  Trash2, Image, X, ToggleLeft, ToggleRight, Eye,
  ImagePlus, Layers, Info, Crop, CheckCircle,
} from 'lucide-react';
import { bannersApi } from '../../services/api';

// ── 16:5 canvas crop ──────────────────────────────────────────────────────────
// Reads the selected File, centre-crops it to exactly 16:5, and returns a new
// { file, preview } object.  Nothing is sent to the server until the user clicks
// "Upload Banner"; the browser does all the work locally.
const cropTo16x5 = (file) =>
  new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const TARGET = 16 / 5;              // 3.2 : 1
      const actual = img.width / img.height;

      let sx = 0, sy = 0, sw = img.width, sh = img.height;

      if (actual > TARGET) {
        // image is too wide — trim left & right
        sw = img.height * TARGET;
        sx = (img.width - sw) / 2;
      } else if (actual < TARGET) {
        // image is too tall — trim top & bottom
        sh = img.width / TARGET;
        sy = (img.height - sh) / 2;
      }

      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(sw);
      canvas.height = Math.round(sh);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) => {
          const ext      = file.name.match(/\.(png|webp)$/i) ? file.name : file.name.replace(/\.[^.]+$/, '.jpg');
          const mime     = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const quality  = mime === 'image/jpeg' ? 0.92 : undefined;
          const cropped  = new File([blob], ext, { type: mime });
          resolve({ file: cropped, preview: canvas.toDataURL(mime, quality) });
        },
        file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        file.type !== 'image/png' ? 0.92 : undefined,
      );
    };
    img.src = url;
  });

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminBanners() {
  const [banners,    setBanners]    = useState([]);
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState({ title: '', subtitle: '', order: 0 });
  const [imageFile,  setImageFile]  = useState(null);
  const [preview,    setPreview]    = useState(null);
  const [cropInfo,   setCropInfo]   = useState(null);   // { original: {w,h}, cropped: {w,h} }
  const [processing, setProcessing] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [lightbox,   setLightbox]   = useState(null);
  const fileRef = useRef();

  const load = () =>
    bannersApi.list().then(r => setBanners(r.data.results || r.data || []));
  useEffect(() => { load(); }, []);

  const handleImage = async (e) => {
    const f = e.target.files[0];
    if (!f) return;

    setProcessing(true);
    // Sniff original dimensions before cropping (revoke the temp URL immediately after load)
    const raw = await new Promise(resolve => {
      const tmp = new window.Image();
      const tmpUrl = URL.createObjectURL(f);
      tmp.onload = () => { URL.revokeObjectURL(tmpUrl); resolve({ w: tmp.width, h: tmp.height }); };
      tmp.src = tmpUrl;
    });

    const { file: cropped, preview: prev } = await cropTo16x5(f);

    setImageFile(cropped);
    setPreview(prev);

    // Show crop notice only when the original wasn't already 16:5 (within 2% tolerance)
    const originalRatio = raw.w / raw.h;
    const diff = Math.abs(originalRatio - 16 / 5) / (16 / 5);
    setCropInfo(diff > 0.02 ? { original: `${raw.w} × ${raw.h}` } : null);
    setProcessing(false);
  };

  const handleCreate = async () => {
    if (!imageFile) return alert('Please select a banner image');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('image',    imageFile);
      fd.append('title',    form.title);
      fd.append('subtitle', form.subtitle);
      fd.append('order',    form.order);
      fd.append('is_active', 'true');
      await bannersApi.create(fd);
      setForm({ title: '', subtitle: '', order: 0 });
      setImageFile(null); setPreview(null); setCropInfo(null);
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  };

  const resetForm = () => {
    setShowForm(false);
    setPreview(null);
    setImageFile(null);
    setCropInfo(null);
  };

  const toggleActive = async (b) => {
    const fd = new FormData();
    fd.append('is_active', b.is_active ? 'false' : 'true');
    await bannersApi.update(b.id, fd);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this banner?')) return;
    await bannersApi.delete(id);
    load();
  };

  const active = banners.filter(b => b.is_active).length;

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Banner Slider</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Active banners appear as a sliding hero on staff dashboards
          </p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 bg-gradient-to-r from-accent to-primary text-white
            px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md hover:shadow-lg hover:opacity-90 transition-all"
        >
          <ImagePlus size={16} /> Upload Banner
        </button>
      </div>

      {/* ── 16:5 spec guide ── */}
      <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl p-4">
        <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300 min-w-0">
          <p className="font-bold mb-2">Standard: 16 : 5 ratio</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            {[
              { device: 'Desktop (ideal)', size: '1920 × 600 px' },
              { device: 'Tablet',          size: '1280 × 400 px' },
              { device: 'Mobile',          size:  '800 × 250 px' },
            ].map(({ device, size }) => (
              <div key={device} className="bg-white/60 dark:bg-blue-900/30 rounded-lg px-3 py-2">
                <p className="font-semibold">{device}</p>
                <p className="text-blue-600 dark:text-blue-400 font-mono mt-0.5">{size}</p>
              </div>
            ))}
          </div>
          <p className="mt-2.5 flex items-center gap-1.5 text-blue-600/80 dark:text-blue-400/80">
            <Crop size={12} className="shrink-0" />
            Images are <strong>automatically centre-cropped</strong> to 16:5 before upload — no manual resizing needed.
            Use JPG / WEBP · keep under 1 MB for fast loading.
          </p>
        </div>
      </div>

      {/* ── Summary strip ── */}
      {banners.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'Total',    value: banners.length,              color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800' },
            { label: 'Active',   value: active,                      color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' },
            { label: 'Inactive', value: banners.length - active,     color: 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700' },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold ${s.color}`}>
              <Layers size={13} /> {s.value} {s.label}
            </div>
          ))}
        </div>
      )}

      {/* ── Upload form ── */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-lg p-5 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-gray-800 dark:text-white text-lg">New Banner</h3>
            <button onClick={resetForm}>
              <X size={18} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Image drop zone — always 16:5 ── */}
            <div className="space-y-2">
              <div
                onClick={() => fileRef.current.click()}
                className={`relative w-full overflow-hidden rounded-2xl cursor-pointer border-2 transition-all
                  ${preview
                    ? 'border-accent border-solid'
                    : 'border-dashed border-gray-200 dark:border-gray-700 hover:border-accent dark:hover:border-accent'
                  }`}
                style={{ aspectRatio: '16/5' }}
              >
                {processing && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {preview ? (
                  <>
                    <img src={preview} alt="preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center
                      opacity-0 hover:opacity-100 transition-opacity">
                      <p className="text-white text-sm font-semibold bg-black/50 px-3 py-1.5 rounded-xl">
                        Click to change
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
                      <Image size={24} className="text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Click to upload banner image
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Any size — auto-cropped to 16:5
                    </p>
                  </div>
                )}

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImage}
                />
              </div>

              {/* Crop notice */}
              {cropInfo && (
                <div className="flex items-center gap-2 text-xs bg-amber-50 dark:bg-amber-900/20
                  border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400
                  rounded-xl px-3 py-2">
                  <Crop size={13} className="shrink-0" />
                  Image was centre-cropped to 16:5 — original was {cropInfo.original}
                </div>
              )}

              {/* Ready badge */}
              {preview && !cropInfo && (
                <div className="flex items-center gap-2 text-xs bg-emerald-50 dark:bg-emerald-900/20
                  border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400
                  rounded-xl px-3 py-2">
                  <CheckCircle size={13} className="shrink-0" />
                  Image is already 16:5 — no cropping needed
                </div>
              )}
            </div>

            {/* ── Form fields ── */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                  Title <span className="normal-case font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. New Project Launch"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700
                    dark:bg-gray-800 dark:text-white rounded-xl text-sm
                    focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                  Subtitle <span className="normal-case font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  value={form.subtitle}
                  onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
                  placeholder="e.g. Visit our newest site today"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700
                    dark:bg-gray-800 dark:text-white rounded-xl text-sm
                    focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
                  Display Order
                </label>
                <input
                  type="number"
                  value={form.order}
                  onChange={e => setForm(f => ({ ...f, order: +e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700
                    dark:bg-gray-800 dark:text-white rounded-xl text-sm
                    focus:outline-none focus:ring-2 focus:ring-accent/30 transition"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Lower number = shown first</p>
              </div>

              <div className="pt-2 flex gap-3 justify-end">
                <button
                  onClick={resetForm}
                  className="px-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700
                    dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving || !imageFile || processing}
                  className="px-6 py-2.5 bg-gradient-to-r from-accent to-primary text-white rounded-xl
                    text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-50 transition"
                >
                  {saving ? 'Uploading…' : 'Upload Banner'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {banners.length === 0 && !showForm && (
        <div className="text-center py-20 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Image size={36} className="text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="font-bold text-gray-600 dark:text-gray-400 text-lg mb-1">No banners yet</h3>
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            Click "Upload Banner" above to add your first banner
          </p>
        </div>
      )}

      {/* ── Banner grid — cards always 16:5 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {banners.map(b => (
          <div
            key={b.id}
            className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-sm overflow-hidden
              group transition-all hover:shadow-lg
              ${b.is_active
                ? 'border-accent/30 hover:border-accent/60'
                : 'border-gray-100 dark:border-gray-700 opacity-70 hover:opacity-100'
              }`}
          >
            {/* Thumbnail — enforced 16:5 */}
            <div className="relative overflow-hidden" style={{ aspectRatio: '16/5' }}>
              <img
                src={b.image_url}
                alt={b.title || 'Banner'}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Status badge */}
              <div className="absolute top-2 left-2">
                {b.is_active
                  ? <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow">Live</span>
                  : <span className="bg-gray-700/80 text-gray-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Inactive</span>
                }
              </div>
              {/* Order badge */}
              <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                #{b.order}
              </div>
              {/* Hover actions overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
                transition-opacity flex items-center justify-center gap-3">
                <button
                  onClick={() => setLightbox(b.image_url)}
                  className="w-9 h-9 bg-white/20 hover:bg-white/40 backdrop-blur-sm rounded-full
                    flex items-center justify-center text-white transition"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="w-9 h-9 bg-red-500/80 hover:bg-red-600 backdrop-blur-sm rounded-full
                    flex items-center justify-center text-white transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Card body */}
            <div className="px-4 py-3">
              <p className="font-bold text-gray-800 dark:text-white text-sm truncate">
                {b.title || <span className="text-gray-400 font-normal italic">No title</span>}
              </p>
              {b.subtitle && (
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{b.subtitle}</p>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 dark:border-gray-800">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {new Date(b.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(b)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
                      b.is_active
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {b.is_active
                      ? <><ToggleRight size={14} /> Active</>
                      : <><ToggleLeft size={14} /> Inactive</>
                    }
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Lightbox — full 16:5 preview ── */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-[9999] p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative w-full max-w-5xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-4 -right-4 w-9 h-9 bg-white dark:bg-gray-800 rounded-full
                flex items-center justify-center shadow-lg z-10"
            >
              <X size={16} className="text-gray-700 dark:text-gray-300" />
            </button>
            {/* Maintain 16:5 in lightbox */}
            <div className="relative w-full overflow-hidden rounded-2xl shadow-2xl" style={{ aspectRatio: '16/5' }}>
              <img
                src={lightbox}
                alt="Banner preview"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
