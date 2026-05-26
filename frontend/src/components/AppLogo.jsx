/**
 * i5 Nexus Logo Component
 * Orange background, blue i5 mark + "nexus" text
 * Props: size (number px), className, variant ("full"|"icon")
 */
export default function AppLogo({ size = 48, className = '', variant = 'full' }) {
  const r = Math.round(size * 0.18); // corner radius

  if (variant === 'icon') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx={r * 5} ry={r * 5} fill="#f26522" />
        {/* i — left column */}
        <rect x="16" y="18" width="13" height="64" rx="3" fill="#1a3a6b" />
        {/* 5 — top bar */}
        <rect x="34" y="18" width="50" height="13" rx="3" fill="#1a3a6b" />
        {/* 5 — middle bar */}
        <rect x="34" y="42" width="38" height="12" rx="3" fill="#1a3a6b" />
        {/* 5 — right side going down */}
        <rect x="60" y="42" width="24" height="40" rx="3" fill="#1a3a6b" />
        {/* 5 — bottom bar */}
        <rect x="34" y="69" width="50" height="13" rx="3" fill="#1a3a6b" />
      </svg>
    );
  }

  // Full logo with "nexus" text — taller
  const h = Math.round(size * 1.2);
  return (
    <svg width={size} height={h} viewBox="0 0 100 120" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="120" rx="18" ry="18" fill="#f26522" />
      {/* i — left column */}
      <rect x="14" y="14" width="13" height="62" rx="3" fill="#1a3a6b" />
      {/* 5 — top horizontal bar */}
      <rect x="32" y="14" width="54" height="13" rx="3" fill="#1a3a6b" />
      {/* 5 — middle bar */}
      <rect x="32" y="38" width="42" height="12" rx="3" fill="#1a3a6b" />
      {/* 5 — right vertical drop */}
      <rect x="62" y="38" width="24" height="38" rx="3" fill="#1a3a6b" />
      {/* 5 — bottom bar */}
      <rect x="32" y="63" width="54" height="13" rx="3" fill="#1a3a6b" />
      {/* nexus text */}
      <text x="50" y="106" textAnchor="middle" fontFamily="Arial Black, sans-serif"
        fontSize="17" fontWeight="900" fill="#1a3a6b" letterSpacing="3">nexus</text>
    </svg>
  );
}
