import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Lock, User, Shield, BarChart3, MapPin, Users } from 'lucide-react';
import AppLogo from '../components/AppLogo';

const FEATURES = [
  { icon: BarChart3, label: 'Live Reports',    desc: 'Real-time insights'  },
  { icon: MapPin,    label: 'Plot Management', desc: 'Track every plot'    },
  { icon: Users,     label: 'Staff Tracking',  desc: 'GPS attendance'      },
  { icon: Shield,    label: 'Secure Access',   desc: 'Role-based control'  },
];

const GRID_STYLE = {
  backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)',
  backgroundSize: '40px 40px',
};

const BLUE_GRAD = 'linear-gradient(135deg,#0f2555 0%,#1a3a6b 50%,#1e4080 100%)';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm]       = useState({ username: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.username, form.password);
      const dest = user.role === 'super_admin' ? '/superadmin'
                 : user.role === 'admin'       ? '/admin/staff'
                 : '/staff';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen md:flex">

      {/* ── LEFT brand panel: hidden on mobile, 46% on desktop ── */}
      <div
        className="hidden md:flex relative flex-col items-center justify-center overflow-hidden px-8 md:w-[46%]"
        style={{ background: BLUE_GRAD }}
      >
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-[#f26522]/25 blur-3xl" style={{ animation: 'floatBlob 6s ease-in-out infinite' }} />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-white/5 blur-3xl"     style={{ animation: 'floatBlob 8s ease-in-out infinite reverse' }} />
        <div className="absolute top-1/3 right-8 w-32 h-32 rounded-full bg-[#f26522]/15 blur-2xl" style={{ animation: 'floatBlob 5s ease-in-out infinite' }} />
        <div className="absolute inset-0 opacity-[0.04]" style={GRID_STYLE} />

        <div className="relative z-10 text-center w-full max-w-xs mx-auto">
          <div className="flex justify-center mb-5">
            <div style={{ filter: 'drop-shadow(0 0 28px rgba(242,101,34,0.55))' }}>
              <AppLogo size={76} variant="full" />
            </div>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">i5 Nexus</h1>
          <p className="text-[#f26522] font-semibold text-xs mt-1.5 tracking-[0.2em] uppercase">Smart Control · Seamless Growth</p>

          <div className="grid grid-cols-2 gap-2.5 mt-8">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-2.5 bg-white/[0.08] border border-white/10 rounded-2xl px-3 py-3 text-left">
                <div className="w-8 h-8 bg-[#f26522]/20 rounded-xl flex items-center justify-center shrink-0">
                  <Icon size={15} className="text-[#f26522]" />
                </div>
                <div>
                  <p className="text-white font-bold text-xs leading-tight">{label}</p>
                  <p className="text-blue-300 text-[10px]">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="inline-flex items-center gap-2 mt-8 bg-white/10 border border-white/15 rounded-full px-4 py-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-white/75 text-xs font-medium">System Online · All services active</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT form panel ── */}
      {/* Desktop: blue+grid that fades right to gray-50 — grid bleeds in from left panel */}
      {/* Mobile:  full-screen blue+grid, form vertically centered */}
      <div
        className="flex-1 relative flex items-center justify-center min-h-screen px-6 py-10"
        style={{ background: BLUE_GRAD }}
      >
        {/* Grid continues from left panel */}
        <div className="absolute inset-0 opacity-[0.04]" style={GRID_STYLE} />

        {/* Desktop only: gradient fade to gray-50, creating the grid-bleed transition */}
        <div
          className="hidden md:block absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(249,250,251,0) 0%, rgba(249,250,251,0.82) 38%, rgba(249,250,251,1) 60%)' }}
        />

        {/* Mobile decorative blobs */}
        <div className="md:hidden absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[#f26522]/20 blur-3xl pointer-events-none" style={{ animation: 'floatBlob 6s ease-in-out infinite' }} />
        <div className="md:hidden absolute bottom-0 -left-8 w-56 h-56 rounded-full bg-white/5 blur-3xl pointer-events-none"   style={{ animation: 'floatBlob 8s ease-in-out infinite reverse' }} />

        <div className="w-full max-w-sm relative z-10">

          {/* Mobile-only: logo above the card */}
          <div className="md:hidden text-center mb-7">
            <div className="flex justify-center mb-3" style={{ filter: 'drop-shadow(0 0 18px rgba(242,101,34,0.5))' }}>
              <AppLogo size={58} variant="full" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">i5 Nexus</h1>
            <p className="text-[#f26522] text-[11px] font-semibold mt-1 tracking-[0.16em] uppercase">Smart Control · Seamless Growth</p>
          </div>

          {/* Card */}
          <div className="bg-white/10 md:bg-white dark:md:bg-gray-900 backdrop-blur-2xl md:backdrop-blur-none rounded-3xl shadow-2xl p-8 border border-white/20 md:border-gray-100 dark:md:border-gray-800">

            <div className="mb-6">
              <h2 className="text-2xl font-black text-white md:text-gray-800 dark:md:text-white">Welcome back</h2>
              <p className="text-white/60 md:text-gray-400 dark:md:text-gray-500 text-sm mt-1">Sign in to continue to i5 Nexus</p>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 bg-red-500/20 md:bg-red-50 dark:md:bg-red-900/20 border border-red-400/30 md:border-red-200 dark:md:border-red-800 text-red-100 md:text-red-700 dark:md:text-red-400 rounded-xl px-4 py-3 mb-5 text-sm animate-shake">
                <Shield size={15} className="shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/60 md:text-gray-500 dark:md:text-gray-400 mb-1.5 uppercase tracking-widest">
                  Username
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50 md:text-gray-400" />
                  <input
                    type="text"
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="Enter your username"
                    required
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 md:bg-transparent border border-white/20 md:border-gray-200 dark:md:border-gray-700 dark:md:bg-gray-800 text-white md:text-gray-800 dark:md:text-white placeholder:text-white/40 md:placeholder:text-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-white/25 md:focus:ring-[#1a3a6b]/30 focus:border-white/40 md:focus:border-[#1a3a6b] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/60 md:text-gray-500 dark:md:text-gray-400 mb-1.5 uppercase tracking-widest">
                  Password
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50 md:text-gray-400" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="w-full pl-10 pr-11 py-3 bg-white/10 md:bg-transparent border border-white/20 md:border-gray-200 dark:md:border-gray-700 dark:md:bg-gray-800 text-white md:text-gray-800 dark:md:text-white placeholder:text-white/40 md:placeholder:text-gray-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-white/25 md:focus:ring-[#1a3a6b]/30 focus:border-white/40 md:focus:border-[#1a3a6b] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/50 md:text-gray-400 hover:text-white md:hover:text-gray-600 dark:md:hover:text-gray-300 transition p-0.5"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-white/60 md:text-[#1a3a6b] dark:md:text-blue-400 hover:text-white/90 md:hover:underline transition"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg,#1a3a6b,#2563eb)' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : 'Sign In'}
              </button>
            </form>

            <p className="text-center text-[11px] text-white/30 md:text-gray-400 dark:md:text-gray-600 mt-6 pt-5 border-t border-white/10 md:border-gray-100 dark:md:border-gray-800">
              © {new Date().getFullYear()} i5 Nexus · Secure login
            </p>
          </div>

          <p className="text-center text-xs text-white/40 md:text-gray-400 mt-4">
            Protected by role-based access control
          </p>
        </div>
      </div>

      <style>{`
        @keyframes floatBlob {
          0%,100% { transform: translateY(0px) scale(1); }
          50%      { transform: translateY(-20px) scale(1.05); }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-6px); }
          40%      { transform: translateX(6px); }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.4s ease; }
      `}</style>
    </div>
  );
}
