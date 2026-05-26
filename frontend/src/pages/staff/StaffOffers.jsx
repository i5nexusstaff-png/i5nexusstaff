import { useEffect, useState, useRef } from 'react';
import { offersApi } from '../../services/api';
import { Gift, Clock, Star, Zap, Trophy, ChevronRight, Flame } from 'lucide-react';

/* ── Countdown hook ── */
function useCountdown(expiresAt) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const ms = new Date(expiresAt) - Date.now();
      if (ms <= 0) { setLeft('Expired'); return; }
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setLeft(d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m left`);
    };
    tick();
    const t = setInterval(tick, 60000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return left;
}

/* ── Confetti burst ── */
function Confetti({ active }) {
  if (!active) return null;
  const pieces = Array.from({ length: 30 }, (_, i) => i);
  const colors = ['#f26522','#1a3a6b','#10b981','#f59e0b','#8b5cf6','#ec4899'];
  return (
    <div className="fixed inset-0 pointer-events-none z-[9998] overflow-hidden">
      {pieces.map(i => (
        <span key={i} style={{
          position: 'absolute',
          left: `${Math.random() * 100}%`,
          top: '-10px',
          width: `${6 + Math.random() * 8}px`,
          height: `${6 + Math.random() * 8}px`,
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          background: colors[Math.floor(Math.random() * colors.length)],
          animation: `confettiFall ${1.5 + Math.random() * 2}s ease-in forwards`,
          animationDelay: `${Math.random() * 0.8}s`,
        }} />
      ))}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

/* ── Single offer card with 3-D flip ── */
function OfferCard({ offer }) {
  const [flipped, setFlipped] = useState(false);
  const [claimed, setClaimed]  = useState(false);
  const countdown = useCountdown(offer.expires_at);

  const urgency = offer.expires_at && (new Date(offer.expires_at) - Date.now()) < 86400000 * 2;

  return (
    <div
      className="h-64 cursor-pointer"
      style={{ perspective: '1000px' }}
      onClick={() => setFlipped(f => !f)}
    >
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.55s cubic-bezier(0.4,0.2,0.2,1)',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}>

        {/* ── Front ── */}
        <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          className="absolute inset-0 rounded-2xl overflow-hidden shadow-xl">
          <div className="absolute inset-0"
            style={{ background: offer.is_active
              ? 'linear-gradient(135deg,#1a3a6b 0%,#2563eb 50%,#1a3a6b 100%)'
              : '#64748b' }} />

          {/* Animated shimmer */}
          {offer.is_active && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 -left-full w-1/2 h-full bg-white/10 skew-x-[-20deg]"
                style={{ animation: 'shimmerSlide 3s ease-in-out infinite' }} />
            </div>
          )}

          {/* Floating orbs */}
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
          <div className="absolute -left-4 -bottom-4 w-20 h-20 rounded-full bg-white/8" />

          <div className="relative h-full flex flex-col p-5 text-white">
            <div className="flex items-start justify-between mb-3">
              <span className="text-4xl drop-shadow-lg">{offer.emoji || '🎯'}</span>
              <div className="flex flex-col items-end gap-1">
                {offer.is_active
                  ? <span className="flex items-center gap-1 bg-emerald-400/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      <Zap size={9} className="animate-pulse" /> Live
                    </span>
                  : <span className="bg-white/10 text-white/60 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Inactive</span>
                }
                {urgency && <span className="flex items-center gap-1 bg-red-500/20 border border-red-400/40 text-red-300 text-[10px] font-black px-2 py-0.5 rounded-full">
                  <Flame size={9} /> Expiring
                </span>}
              </div>
            </div>

            <p className="font-black text-lg leading-tight mb-1">{offer.title}</p>
            <p className="text-white/75 text-xs leading-relaxed line-clamp-2 flex-1">{offer.description}</p>

            <div className="mt-auto pt-3 border-t border-white/15 flex items-center justify-between">
              {offer.reward && (
                <div className="bg-white/15 backdrop-blur rounded-xl px-3 py-1.5 text-center">
                  <p className="text-[9px] text-white/60 uppercase tracking-widest font-bold">Reward</p>
                  <p className="text-white font-black text-sm leading-tight">{offer.reward}</p>
                </div>
              )}
              <div className="ml-auto flex items-center gap-1 text-white/50 text-[10px] font-medium">
                <span>Tap for details</span>
                <ChevronRight size={11} className="animate-bounce-x" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Back ── */}
        <div style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          className="absolute inset-0 rounded-2xl overflow-hidden shadow-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
          <div className="h-1.5 w-full bg-gradient-to-r from-accent to-amber-500" />
          <div className="p-5 flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{offer.emoji || '🎯'}</span>
              <p className="font-black text-gray-800 dark:text-white text-sm leading-tight">{offer.title}</p>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed flex-1">{offer.description}</p>

            <div className="space-y-2 mt-3">
              {offer.reward && (
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
                  <Trophy size={14} className="text-amber-500 shrink-0" />
                  <div>
                    <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest">Reward</p>
                    <p className="text-amber-700 dark:text-amber-400 font-bold text-sm">{offer.reward}</p>
                  </div>
                </div>
              )}
              {countdown && (
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2">
                  <Clock size={13} className={urgency ? 'text-red-500' : 'text-gray-400'} />
                  <p className={`text-xs font-bold ${urgency ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>{countdown}</p>
                </div>
              )}
            </div>

            <button
              onClick={e => { e.stopPropagation(); setClaimed(true); }}
              disabled={claimed || !offer.is_active}
              className={`mt-3 w-full py-2.5 rounded-xl text-sm font-black transition-all ${
                claimed
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 cursor-default'
                  : offer.is_active
                    ? 'bg-gradient-to-r from-accent to-amber-500 text-white hover:opacity-90 active:scale-95'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}>
              {claimed ? '✓ Accepted!' : offer.is_active ? '🚀 Accept Offer' : 'Inactive'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function StaffOffers() {
  const [offers, setOffers] = useState([]);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => {
    offersApi.active()
      .then(r => setOffers(r.data.results || r.data || []))
      .catch(() => {});
  }, []);

  const triggerConfetti = () => {
    setConfetti(true);
    setTimeout(() => setConfetti(false), 3500);
  };

  return (
    <div>
      <Confetti active={confetti} />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-gradient-to-br from-accent to-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Gift size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-white">Offers & Incentives</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Tap a card to flip and see full details</p>
          </div>
        </div>
      </div>

      {/* Active count banner */}
      {offers.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl mb-6 p-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg,#1a3a6b,#2563eb)' }}>
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 -left-full w-1/2 h-full bg-white/10 skew-x-[-20deg]"
              style={{ animation: 'shimmerSlide 3s ease-in-out infinite' }} />
          </div>
          <div className="relative flex items-center gap-3">
            <span className="text-3xl">🔥</span>
            <div>
              <p className="text-white font-black text-sm">{offers.length} Active Offer{offers.length !== 1 ? 's' : ''} Available</p>
              <p className="text-blue-200 text-xs">Flip cards to accept and earn rewards</p>
            </div>
          </div>
          <button onClick={triggerConfetti}
            className="relative bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 flex items-center gap-1.5">
            <Star size={13} className="text-amber-300" /> Celebrate!
          </button>
        </div>
      )}

      {/* Offers grid */}
      {offers.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
          <Gift size={44} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-bold">No active offers right now</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Check back later for new incentives</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {offers.map(o => <OfferCard key={o.id} offer={o} />)}
        </div>
      )}

      {/* Tip footer */}
      {offers.length > 0 && (
        <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-8">
          👆 Tap any card to flip · See reward details and accept offers
        </p>
      )}

      <style>{`
        @keyframes shimmerSlide {
          0%   { left: -100%; }
          60%  { left: 150%; }
          100% { left: 150%; }
        }
        @keyframes bounceX {
          0%,100% { transform: translateX(0); }
          50%      { transform: translateX(4px); }
        }
        .animate-bounce-x { animation: bounceX 1s infinite; }
      `}</style>
    </div>
  );
}
