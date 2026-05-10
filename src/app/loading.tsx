export default function Loading() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#FFFFFF]">
      <svg
        viewBox="0 0 200 260"
        className="w-48 h-48"
      >
        <defs>
          <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#7C5CFF" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Build plate */}
        <rect x="40" y="210" width="120" height="8" rx="2" fill="rgba(124, 92, 255,0.2)" stroke="rgba(124, 92, 255,0.3)" strokeWidth="1" />

        {/* Printed layers building up */}
        <rect x="75" y="195" width="50" height="15" rx="2" fill="rgba(124, 92, 255,0.15)" stroke="rgba(124, 92, 255,0.25)" strokeWidth="1">
          <animate attributeName="y" values="210;195" dur="1.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
          <animate attributeName="height" values="0;15" dur="1.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
        </rect>
        <rect x="75" y="180" width="50" height="15" rx="2" fill="rgba(124, 92, 255,0.2)" stroke="rgba(124, 92, 255,0.3)" strokeWidth="1">
          <animate attributeName="y" values="210;180" dur="3s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
          <animate attributeName="height" values="0;15" dur="3s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
        </rect>
        <rect x="75" y="165" width="50" height="15" rx="2" fill="rgba(124, 92, 255,0.25)" stroke="rgba(124, 92, 255,0.35)" strokeWidth="1">
          <animate attributeName="y" values="210;165" dur="4.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
          <animate attributeName="height" values="0;15" dur="4.5s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1" />
        </rect>

        {/* Moving nozzle */}
        <g>
          <animateTransform attributeName="transform" type="translate" values="65,0;135,0;65,0" dur="1.2s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" />
          <rect x="-8" y="60" width="16" height="24" rx="3" fill="#FFFFFF" stroke="rgba(124, 92, 255,0.5)" strokeWidth="1.5" />
          <polygon points="-5,84 5,84 3,90 -3,90" fill="#7C5CFF" />
          <circle cx="0" cy="88" r="3" fill="#7C5CFF" opacity="0.8">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="0.6s" repeatCount="indefinite" />
          </circle>
        </g>

        {/* Support rail */}
        <line x1="20" y1="70" x2="180" y2="70" stroke="rgba(124, 92, 255,0.15)" strokeWidth="2" />
      </svg>

      {/* Loading text */}
      <div className="mt-8 flex items-center gap-2">
        <span className="font-[var(--font-syne)] text-lg font-semibold text-[#0F1B3D]">flux</span>
        <span className="font-[var(--font-syne)] text-lg font-semibold text-[#7C5CFF]">3d</span>
      </div>
      <p className="mt-2 text-sm text-[#6F7192] animate-pulse">Printing your experience...</p>
    </div>
  )
}
