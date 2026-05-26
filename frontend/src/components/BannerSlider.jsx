import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { bannersApi } from '../services/api';

export default function BannerSlider() {
  const [banners, setBanners] = useState([]);
  const [current, setCurrent] = useState(0);
  const [fading, setFading]   = useState(false);

  useEffect(() => {
    bannersApi.active().then(r => setBanners(r.data.results || r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => slide(1), 5000);
    return () => clearInterval(t);
  }, [banners.length, current]);          // eslint-disable-line

  const slide = (dir) => {
    setFading(true);
    setTimeout(() => {
      setCurrent(c => (c + dir + banners.length) % banners.length);
      setFading(false);
    }, 280);
  };

  const goTo = (i) => {
    setFading(true);
    setTimeout(() => { setCurrent(i); setFading(false); }, 280);
  };

  if (banners.length === 0) return null;

  const banner = banners[current];

  return (
    /*
     * 16:5 aspect ratio is the enforced standard for banner images.
     * aspect-ratio handles mobile/tablet perfectly.
     * max-height: 300px prevents excessive height on ultra-wide desktop.
     * object-cover centres the image inside the constrained box.
     */
    <div
      className="relative w-full overflow-hidden bg-gray-900"
      style={{ aspectRatio: '16/5', maxHeight: '300px' }}
    >

      {/* Slide image */}
      <img
        key={banner.id}
        src={banner.image_url}
        alt={banner.title || 'Banner'}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
        style={{ opacity: fading ? 0 : 1 }}
      />

      {/* Subtle gradient overlay — bottom only so text stays readable */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

      {/* Title / subtitle */}
      {(banner.title || banner.subtitle) && (
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 sm:px-5 sm:py-4">
          {banner.title && (
            <p className="text-white font-black text-sm sm:text-base md:text-lg leading-tight drop-shadow-md line-clamp-1">
              {banner.title}
            </p>
          )}
          {banner.subtitle && (
            <p className="text-white/75 text-xs sm:text-sm mt-0.5 drop-shadow line-clamp-1 hidden sm:block">
              {banner.subtitle}
            </p>
          )}
        </div>
      )}

      {/* Navigation arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => slide(-1)}
            className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8
              bg-black/30 hover:bg-black/55 backdrop-blur-sm text-white rounded-full
              flex items-center justify-center transition-all hover:scale-110"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => slide(1)}
            className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8
              bg-black/30 hover:bg-black/55 backdrop-blur-sm text-white rounded-full
              flex items-center justify-center transition-all hover:scale-110"
          >
            <ChevronRight size={15} />
          </button>

          {/* Progress dots */}
          <div className="absolute bottom-2 sm:bottom-3 right-3 sm:right-4 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? 'bg-white w-5 sm:w-6' : 'bg-white/40 w-1.5 hover:bg-white/70'
                }`}
              />
            ))}
          </div>

          {/* Slide counter */}
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-black/40 backdrop-blur-sm
            text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full">
            {current + 1}/{banners.length}
          </div>
        </>
      )}
    </div>
  );
}
