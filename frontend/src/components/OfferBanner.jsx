import { useEffect, useState, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Clock, Zap } from 'lucide-react';
import { offersApi } from '../services/api';

/* ── Colour themes ── */
const THEMES = {
  orange: {
    grad:    'linear-gradient(135deg,#c73e00 0%,#f26522 35%,#ff9a5c 55%,#f26522 75%,#c73e00 100%)',
    glow:    'rgba(242,101,34,0.55)',
    badge:   'linear-gradient(180deg,#ff6b1a,#a33000)',
    shine:   'rgba(255,180,100,0.18)',
    text:    '#fff0e6',
  },
  purple: {
    grad:    'linear-gradient(135deg,#3b0764 0%,#7c3aed 35%,#a78bfa 55%,#7c3aed 75%,#3b0764 100%)',
    glow:    'rgba(124,58,237,0.55)',
    badge:   'linear-gradient(180deg,#8b5cf6,#4c1d95)',
    shine:   'rgba(196,181,253,0.18)',
    text:    '#f3e8ff',
  },
  blue: {
    grad:    'linear-gradient(135deg,#1e3a8a 0%,#2563eb 35%,#60a5fa 55%,#2563eb 75%,#1e3a8a 100%)',
    glow:    'rgba(37,99,235,0.55)',
    badge:   'linear-gradient(180deg,#3b82f6,#1e40af)',
    shine:   'rgba(147,197,253,0.18)',
    text:    '#eff6ff',
  },
  green: {
    grad:    'linear-gradient(135deg,#064e3b 0%,#059669 35%,#34d399 55%,#059669 75%,#064e3b 100%)',
    glow:    'rgba(5,150,105,0.55)',
    badge:   'linear-gradient(180deg,#10b981,#047857)',
    shine:   'rgba(110,231,183,0.18)',
    text:    '#ecfdf5',
  },
  red: {
    grad:    'linear-gradient(135deg,#7f1d1d 0%,#dc2626 35%,#f87171 55%,#dc2626 75%,#7f1d1d 100%)',
    glow:    'rgba(220,38,38,0.55)',
    badge:   'linear-gradient(180deg,#ef4444,#991b1b)',
    shine:   'rgba(252,165,165,0.18)',
    text:    '#fff1f2',
  },
  gold: {
    grad:    'linear-gradient(135deg,#78350f 0%,#d97706 35%,#fbbf24 55%,#d97706 75%,#78350f 100%)',
    glow:    'rgba(217,119,6,0.55)',
    badge:   'linear-gradient(180deg,#f59e0b,#b45309)',
    shine:   'rgba(253,230,138,0.18)',
    text:    '#fffbeb',
  },
};

/* ── Live countdown hook ── */
function useCountdown(expiresAt) {
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const ms = new Date(expiresAt + 'T23:59:59') - Date.now();
      if (ms <= 0) { setLabel('Expired'); return; }
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      if (d > 1)      setLabel(`${d}d ${h}h left`);
      else if (d === 1) setLabel(`1d ${h}h left`);
      else if (h > 0) setLabel(`${h}h ${m}m left`);
      else            setLabel(`${m}m ${s}s left`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return label;
}

/* ── Single offer display ── */
function OfferSlide({ offer, theme }) {
  const countdown = useCountdown(offer.expires_at);
  const urgent = countdown && (countdown.includes('m ') && !countdown.includes('h'));

  return (
    <div className="relative flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-0 w-full min-w-0">

      {/* 3D badge pill */}
      <div
        className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-white"
        style={{
          background: theme.badge,
          boxShadow: '0 2px 0 rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.25)',
          fontSize: '10px',
          fontWeight: 900,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          textShadow: '0 1px 2px rgba(0,0,0,0.4)',
        }}
      >
        <Zap size={9} style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.4))' }} />
        <span>LIVE</span>
      </div>

      {/* Emoji */}
      <span
        className="text-xl sm:text-2xl shrink-0"
        style={{ animation: 'offerBounce 1.4s ease-in-out infinite', display: 'inline-block' }}
      >
        {offer.emoji || '🎯'}
      </span>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-black text-xs sm:text-sm leading-tight truncate" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
          {offer.title}
        </p>
        <p className="text-xs leading-tight truncate hidden sm:block" style={{ color: theme.text, opacity: 0.85 }}>
          {offer.description}
        </p>
      </div>

      {/* Reward coin */}
      {offer.reward && (
        <div
          className="shrink-0 text-center px-3 py-1.5 rounded-xl hidden sm:block"
          style={{
            background: 'rgba(0,0,0,0.25)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 4px rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <p className="text-white font-black text-sm leading-tight" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
            {offer.reward}
          </p>
          <p className="text-[10px] font-semibold" style={{ color: theme.text, opacity: 0.75 }}>Reward</p>
        </div>
      )}

      {/* Countdown */}
      {countdown && (
        <div
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg"
          style={{
            background: urgent ? 'rgba(220,38,38,0.35)' : 'rgba(0,0,0,0.22)',
            border: urgent ? '1px solid rgba(252,165,165,0.4)' : '1px solid rgba(255,255,255,0.1)',
            animation: urgent ? 'urgentPulse 1s ease-in-out infinite' : 'none',
          }}
        >
          <Clock size={10} className="text-white/70 shrink-0" />
          <span className="text-[10px] sm:text-xs font-bold text-white whitespace-nowrap">{countdown}</span>
        </div>
      )}
    </div>
  );
}

export default function OfferBanner() {
  const [offers, setOffers]     = useState([]);
  const [current, setCurrent]   = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible]   = useState(false);
  const [animDir, setAnimDir]   = useState('');  // 'in-right' | 'in-left'
  const intervalRef = useRef(null);

  useEffect(() => {
    offersApi.active().then(r => {
      const data = r.data || [];
      if (data.length > 0) {
        setOffers(data);
        setTimeout(() => setVisible(true), 600);
      }
    }).catch(() => {});
  }, []);

  const startAutoplay = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setAnimDir('in-right');
      setCurrent(c => (c + 1) % offers.length);
    }, 5500);
  };

  useEffect(() => {
    if (offers.length <= 1) return;
    startAutoplay();
    return () => clearInterval(intervalRef.current);
  }, [offers.length]);

  const goTo = (idx, dir = 'in-right') => {
    setAnimDir(dir);
    setCurrent(idx);
    startAutoplay();
  };

  if (!visible || dismissed || offers.length === 0) return null;

  const offer = offers[current];
  const theme = THEMES[offer.color_theme] || THEMES.orange;

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: theme.grad,
        boxShadow: `0 4px 24px ${theme.glow}, 0 1px 0 rgba(255,255,255,0.12) inset, 0 -2px 0 rgba(0,0,0,0.25) inset`,
        minHeight: '48px',
      }}
    >
      {/* Moving light sweep */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-y-0 w-1/3"
          style={{
            background: `linear-gradient(90deg,transparent,${theme.shine},transparent)`,
            animation: 'bannerSweep 3s ease-in-out infinite',
          }}
        />
      </div>

      {/* Top glass highlight */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: 'rgba(255,255,255,0.35)' }}
      />

      {/* Sparkle dots */}
      <div className="absolute inset-0 pointer-events-none hidden sm:block">
        {[...Array(5)].map((_, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${8 + i * 20}%`,
              top: `${15 + (i % 2) * 55}%`,
              color: 'rgba(255,255,255,0.5)',
              fontSize: '8px',
              animation: `bannerSparkle ${1.5 + i * 0.3}s ${i * 0.2}s ease-in-out infinite`,
              pointerEvents: 'none',
            }}
          >
            ✦
          </span>
        ))}
      </div>

      {/* Main row */}
      <div className="relative flex items-center max-w-7xl mx-auto h-12">

        {/* Prev arrow */}
        {offers.length > 1 && (
          <button
            onClick={() => goTo((current - 1 + offers.length) % offers.length, 'in-left')}
            className="shrink-0 w-8 h-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            <ChevronLeft size={16} />
          </button>
        )}

        {/* Slide content */}
        <div
          key={current}
          className="flex-1 flex items-center min-w-0"
          style={{ animation: `${animDir || 'slideInRight'} 0.35s ease-out` }}
        >
          <OfferSlide offer={offer} theme={theme} />
        </div>

        {/* Next arrow */}
        {offers.length > 1 && (
          <button
            onClick={() => goTo((current + 1) % offers.length)}
            className="shrink-0 w-8 h-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            <ChevronRight size={16} />
          </button>
        )}

        {/* Dots indicator */}
        {offers.length > 1 && (
          <div className="flex gap-1 shrink-0 px-2">
            {offers.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="transition-all"
                style={{
                  height: '5px',
                  width: i === current ? '16px' : '5px',
                  borderRadius: '99px',
                  background: i === current ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.3)',
                }}
              />
            ))}
          </div>
        )}

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 w-8 h-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition"
        >
          <X size={14} />
        </button>
      </div>

      <style>{`
        @keyframes bannerSweep {
          0%   { left: -34%; }
          100% { left: 110%; }
        }
        @keyframes bannerSparkle {
          0%,100% { opacity: 0.15; transform: scale(0.7) rotate(0deg); }
          50%      { opacity: 1;    transform: scale(1.4) rotate(20deg); }
        }
        @keyframes offerBounce {
          0%,100% { transform: translateY(0) rotate(-4deg); }
          50%      { transform: translateY(-4px) rotate(4deg); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes in-right {
          from { opacity: 0; transform: translateX(28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes in-left {
          from { opacity: 0; transform: translateX(-28px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes urgentPulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.65; }
        }
      `}</style>
    </div>
  );
}
