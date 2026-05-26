/**
 * StaffSettings — read-only view of company Support & Legal documents
 * plus the user's profile info at the bottom.
 *
 * Layout mirrors the screenshot:
 *   ⚙ Settings
 *   SUPPORT & LEGAL section
 *     ↳ each item is an expandable accordion row
 *   ──────────────────────
 *   [Avatar]  Name / Role  card at the bottom
 */
import { useEffect, useState } from 'react';
import {
  Settings, Building2, HelpCircle, Shield,
  BookOpen, AlertTriangle, ChevronDown, ChevronUp,
  User,
} from 'lucide-react';
import { companyApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const LEGAL_DOCS = [
  { key: 'about',            label: 'About Company',     icon: Building2,     color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20'   },
  { key: 'faq',              label: 'FAQ',               icon: HelpCircle,    color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { key: 'privacy_policy',   label: 'Privacy Policy',    icon: Shield,        color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  { key: 'terms_conditions', label: 'Terms & Conditions', icon: BookOpen,     color: 'text-emerald-500',bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  { key: 'disclaimer',       label: 'Disclaimer',         icon: AlertTriangle, color: 'text-red-500',   bg: 'bg-red-50 dark:bg-red-900/20'    },
];

function AccordionRow({ doc, content }) {
  const [open, setOpen] = useState(false);
  const Icon = doc.icon;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${doc.bg}`}>
          <Icon size={16} className={doc.color} />
        </div>
        <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-white">{doc.label}</span>
        {open
          ? <ChevronUp  size={16} className="text-gray-400 shrink-0" />
          : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-50 dark:border-gray-800">
          {content ? (
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line mt-4">
              {content}
            </p>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic mt-4">
              No content available yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function StaffSettings() {
  const { user }  = useAuth();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    companyApi.get()
      .then(r => {
        const d = Array.isArray(r.data) ? r.data[0] : r.data;
        setCompany(d);
      })
      .catch(() => setCompany(null))
      .finally(() => setLoading(false));
  }, []);

  const fullName = user?.full_name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || 'User';
  const roleLabel = user?.role === 'admin' ? 'Administrator' : (user?.position || 'Employee');

  return (
    <div className="max-w-lg mx-auto">

      {/* ── Header ── */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <Settings size={18} className="text-gray-500 dark:text-gray-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">Settings</h1>
          <p className="text-xs text-gray-400">Company information &amp; legal documents</p>
        </div>
      </div>

      {/* ── Support & Legal section ── */}
      <div className="mb-6">
        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3 px-1">
          Support &amp; Legal
        </p>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {LEGAL_DOCS.map(doc => (
              <AccordionRow key={doc.key} doc={doc} content={company?.[doc.key]} />
            ))}
          </div>
        )}
      </div>

      {/* ── Divider ── */}
      <hr className="border-gray-100 dark:border-gray-800 mb-6" />

      {/* ── Profile card (bottom) ── */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
        <div className="flex items-center gap-4">
          {user?.profile_photo ? (
            <img src={user.profile_photo} alt={fullName}
              className="w-12 h-12 rounded-xl object-cover border-2 border-gray-100 dark:border-gray-700 shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 text-white font-bold text-lg">
              {fullName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 dark:text-white truncate">{fullName}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{roleLabel}</p>
            {user?.department && (
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.department}</p>
            )}
          </div>
        </div>
        {/* Company name if available */}
        {company?.company_name && (
          <div className="mt-3 pt-3 border-t border-gray-50 dark:border-gray-800 flex items-center gap-2">
            {company.logo_url ? (
              <img src={company.logo_url} alt="company" className="w-5 h-5 rounded object-contain" />
            ) : (
              <Building2 size={14} className="text-gray-400" />
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">{company.company_name}</span>
          </div>
        )}
      </div>
    </div>
  );
}
