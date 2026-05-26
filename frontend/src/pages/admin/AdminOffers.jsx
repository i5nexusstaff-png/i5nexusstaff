import { useEffect, useState } from 'react';
import { Plus, Trash2, Tag, ToggleLeft, ToggleRight, X, Edit2, Zap, Clock, Star } from 'lucide-react';
import { offersApi } from '../../services/api';

/* ── Colour themes (must match backend THEME_CHOICES + OfferBanner) ── */
const THEMES = {
  orange: { label: 'Orange',  grad: 'linear-gradient(135deg,#c73e00,#f26522,#ff9a5c,#f26522,#c73e00)', glow: '#f26522' },
  purple: { label: 'Purple',  grad: 'linear-gradient(135deg,#3b0764,#7c3aed,#a78bfa,#7c3aed,#3b0764)', glow: '#7c3aed' },
  blue:   { label: 'Blue',    grad: 'linear-gradient(135deg,#1e3a8a,#2563eb,#60a5fa,#2563eb,#1e3a8a)', glow: '#2563eb' },
  green:  { label: 'Green',   grad: 'linear-gradient(135deg,#064e3b,#059669,#34d399,#059669,#064e3b)', glow: '#059669' },
  red:    { label: 'Red',     grad: 'linear-gradient(135deg,#7f1d1d,#dc2626,#f87171,#dc2626,#7f1d1d)', glow: '#dc2626' },
  gold:   { label: 'Gold',    grad: 'linear-gradient(135deg,#78350f,#d97706,#fbbf24,#d97706,#78350f)', glow: '#d97706' },
};

const EMOJIS = [
  '🎯','🏆','💰','🔥','⭐','🎁','💎','🚀','🏅','🎪',
  '🥇','💡','🎖️','🌟','✨','🎊','🎉','💫','⚡','🎸',
  '🦁','🏋️','🎓','🛡️','🌈',
];

const PRIORITY_LABELS = ['Highest','High','','','Medium','','','Low','','Lowest'];

const EMPTY_FORM = {
  title: '', description: '', reward: '', emoji: '🎯',
  color_theme: 'orange', priority: 5, expires_at: '', is_active: true,
};

/* ── Banner preview (mirrors OfferBanner appearance) ── */
function BannerPreview({ form }) {
  const theme = THEMES[form.color_theme] || THEMES.orange;
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: theme.grad,
        boxShadow: `0 4px 20px ${theme.glow}55, inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -2px 0 rgba(0,0,0,0.2)`,
      }}
    >
      <div className="flex items-center gap-3 px-4 h-12">
        {/* LIVE badge */}
        <div
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-white shrink-0"
          style={{ background: 'rgba(0,0,0,0.3)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)', fontSize: '10px', fontWeight: 900 }}
        >
          <Zap size={9} />
          <span>LIVE</span>
        </div>
        <span className="text-xl">{form.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-sm truncate">{form.title || 'Offer title…'}</p>
          <p className="text-white/80 text-xs truncate">{form.description || 'Description…'}</p>
        </div>
        {form.reward && (
          <div className="bg-black/25 rounded-xl px-3 py-1.5 shrink-0 text-center" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
            <p className="text-white font-black text-sm">{form.reward}</p>
            <p className="text-white/70 text-[10px]">Reward</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Offer card shown in list ── */
function OfferCard({ offer, onToggle, onDelete, onEdit }) {
  const theme = THEMES[offer.color_theme] || THEMES.orange;
  const expired = offer.expires_at && new Date(offer.expires_at + 'T23:59:59') < new Date();

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-sm overflow-hidden transition-all ${
      !offer.is_active || expired ? 'opacity-55 border-gray-200 dark:border-gray-700' : 'border-gray-200 dark:border-gray-700 hover:shadow-md'
    }`}>
      {/* Banner preview strip */}
      <div
        className="h-11 flex items-center gap-3 px-4 relative overflow-hidden"
        style={{ background: theme.grad }}
      >
        <div className="absolute inset-y-0 w-1/3 pointer-events-none"
          style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)', left: '-34%', animation: 'bannerSweep 3s ease-in-out infinite' }} />
        <span className="text-lg shrink-0">{offer.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-xs truncate">{offer.title}</p>
          {offer.reward && <p className="text-white/75 text-[10px] truncate">{offer.reward}</p>}
        </div>
        {/* Priority badge */}
        <div className="shrink-0 bg-black/25 rounded-full px-2 py-0.5">
          <p className="text-white/80 text-[9px] font-bold">P{offer.priority}</p>
        </div>
      </div>

      {/* Details row */}
      <div className="px-4 py-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">{offer.description}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {offer.expires_at && (
            <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              expired
                ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            }`}>
              <Clock size={9} />
              {expired ? 'Expired' : `Expires ${new Date(offer.expires_at).toLocaleDateString('en-IN')}`}
            </span>
          )}
          <span className="text-[10px] text-gray-400 dark:text-gray-600">
            {THEMES[offer.color_theme]?.label || 'Orange'} theme
          </span>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <button onClick={() => onToggle(offer)}
          className="flex items-center gap-1.5 text-xs font-semibold transition"
          style={{ color: offer.is_active ? '#10b981' : '#94a3b8' }}
        >
          {offer.is_active
            ? <ToggleRight size={18} style={{ color: '#10b981' }} />
            : <ToggleLeft size={18} />}
          {offer.is_active ? 'Active' : 'Inactive'}
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(offer)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-primary dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition font-medium">
            <Edit2 size={12} /> Edit
          </button>
          <button onClick={() => onDelete(offer.id)}
            className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminOffers() {
  const [offers, setOffers]     = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);

  const load = () => offersApi.list().then(r => setOffers(r.data.results || r.data));
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (offer) => {
    setEditId(offer.id);
    setForm({
      title:       offer.title,
      description: offer.description,
      reward:      offer.reward || '',
      emoji:       offer.emoji || '🎯',
      color_theme: offer.color_theme || 'orange',
      priority:    offer.priority ?? 5,
      expires_at:  offer.expires_at || '',
      is_active:   offer.is_active,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.description.trim()) return alert('Title and description are required');
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.expires_at) delete payload.expires_at;
      if (editId) {
        await offersApi.update(editId, payload);
      } else {
        await offersApi.create(payload);
      }
      setShowForm(false);
      setEditId(null);
      setForm(EMPTY_FORM);
      load();
    } finally { setSaving(false); }
  };

  const toggleActive = async (offer) => {
    await offersApi.update(offer.id, { is_active: !offer.is_active });
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this offer?')) return;
    await offersApi.delete(id);
    load();
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Offers & Incentives</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Active offers appear as animated banners on the staff portal</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-accent-dark shadow-md transition"
        >
          <Plus size={16} /> New Offer
        </button>
      </div>

      {/* ── Create / Edit form ── */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-black text-gray-800 dark:text-white text-lg">
              {editId ? 'Edit Offer' : 'Create New Offer'}
            </h3>
            <button onClick={() => { setShowForm(false); setEditId(null); }} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column: form fields */}
            <div className="space-y-4">

              {/* Emoji picker */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-widest">Emoji</label>
                <div className="flex gap-1.5 flex-wrap">
                  {EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => setForm(f => ({ ...f, emoji: e }))}
                      className="text-xl p-1.5 rounded-xl border-2 transition-all hover:scale-110 active:scale-100"
                      style={{
                        borderColor: form.emoji === e ? THEMES[form.color_theme]?.glow || '#f26522' : 'transparent',
                        background:  form.emoji === e ? `${THEMES[form.color_theme]?.glow || '#f26522'}18` : 'rgba(0,0,0,0.03)',
                      }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-widest">Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Site Visit Bonus"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-widest">Description *</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Bring 5 clients on a site visit this week to earn the bonus"
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
                />
              </div>

              {/* Reward + Expiry */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-widest">Reward</label>
                  <input
                    value={form.reward}
                    onChange={e => setForm(f => ({ ...f, reward: e.target.value }))}
                    placeholder="e.g. ₹5,000 cash"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-widest">Expires On</label>
                  <input
                    type="date"
                    value={form.expires_at}
                    onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>
            </div>

            {/* Right column: theme + priority + preview */}
            <div className="space-y-4">

              {/* Colour theme */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-widest">Banner Colour Theme</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(THEMES).map(([key, t]) => (
                    <button
                      key={key}
                      onClick={() => setForm(f => ({ ...f, color_theme: key }))}
                      className="relative h-10 rounded-xl overflow-hidden transition-all hover:scale-105 active:scale-100"
                      style={{
                        background: t.grad,
                        outline: form.color_theme === key ? `3px solid ${t.glow}` : '3px solid transparent',
                        outlineOffset: '2px',
                        boxShadow: form.color_theme === key ? `0 4px 12px ${t.glow}55` : 'none',
                      }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-xs" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                        {form.color_theme === key && '✓ '}{t.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Display Priority</label>
                  <span className="text-xs font-bold text-primary dark:text-blue-400">
                    {PRIORITY_LABELS[form.priority - 1] || `P${form.priority}`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-400 w-10 shrink-0">High</span>
                  <input
                    type="range" min={1} max={10} value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: +e.target.value }))}
                    className="flex-1 accent-accent"
                  />
                  <span className="text-[10px] text-gray-400 w-10 shrink-0 text-right">Low</span>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Lower number = shows first in the banner rotation</p>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Show this offer to staff now</p>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className="transition-transform active:scale-95"
                >
                  {form.is_active
                    ? <ToggleRight size={32} className="text-emerald-500" />
                    : <ToggleLeft size={32} className="text-gray-400" />}
                </button>
              </div>

              {/* Live preview */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-widest">Live Preview</label>
                <BannerPreview form={form} />
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5">This is how the banner will appear on the staff portal</p>
              </div>
            </div>
          </div>

          {/* Form actions */}
          <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => { setShowForm(false); setEditId(null); }}
              className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent-dark disabled:opacity-60 shadow-md transition"
            >
              {saving ? 'Saving…' : editId ? 'Update Offer' : 'Create Offer'}
            </button>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {offers.length === 0 && !showForm && (
        <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <Tag size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="font-semibold text-gray-500 dark:text-gray-400">No offers yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Create one to motivate your team!</p>
          <button onClick={openNew}
            className="mt-4 flex items-center gap-2 mx-auto bg-accent text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-accent-dark transition shadow">
            <Plus size={15} /> Create First Offer
          </button>
        </div>
      )}

      {/* ── Offer grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {offers.map(o => (
          <OfferCard
            key={o.id}
            offer={o}
            onToggle={toggleActive}
            onDelete={handleDelete}
            onEdit={openEdit}
          />
        ))}
      </div>

      <style>{`
        @keyframes bannerSweep {
          0%   { left: -34%; }
          100% { left: 110%; }
        }
      `}</style>
    </div>
  );
}
