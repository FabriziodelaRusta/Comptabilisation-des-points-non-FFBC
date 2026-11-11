import React from 'react';
import { CLUB_COLORS } from './HeaderBanner';

interface BikeWheelLoaderProps {
  message?: string;
  subMessage?: string;
  seasonYear?: number;
  maxTimeoutMs?: number;
  onClose?: () => void;
}

export const BikeWheelLoader: React.FC<BikeWheelLoaderProps> = ({
  message = 'Chargement des données...',
  subMessage = 'Synchronisation Google Sheets & FFBC',
  seasonYear = 2027,
  maxTimeoutMs = 7000,
  onClose,
}) => {
  // Sécurité absolue : le loader s'arrête automatiquement après maxTimeoutMs (7s max)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, maxTimeoutMs);
    return () => clearTimeout(timer);
  }, [maxTimeoutMs, onClose]);

  // 24 rayons de vélo répartis à intervalles réguliers
  const spokeCount = 24;
  const spokes = Array.from({ length: spokeCount }, (_, i) => {
    const angleDeg = (i * 360) / spokeCount;
    const angleRad = (angleDeg * Math.PI) / 180;
    const isEven = i % 2 === 0;
    const hubOffsetAngle = angleRad + (isEven ? 0.35 : -0.35);
    const hubRadius = 22;
    const rimRadius = 102;
    const cx = 150;
    const cy = 150;

    return {
      id: i,
      x1: cx + hubRadius * Math.cos(hubOffsetAngle),
      y1: cy + hubRadius * Math.sin(hubOffsetAngle),
      x2: cx + rimRadius * Math.cos(angleRad),
      y2: cy + rimRadius * Math.sin(angleRad),
    };
  });

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300 p-4"
    >
      {/* Conteneur principal compact adapté aux smartphones et tablettes */}
      <div className="relative flex flex-col items-center max-w-[250px] sm:max-w-[280px] w-full">
        {/* Roue de vélo compacte et responsive (80px mobile / 96px écran standard) */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
          <svg
            viewBox="0 0 300 300"
            className="w-full h-full animate-spin filter drop-shadow-md"
            style={{ animationDuration: '1.8s', animationTimingFunction: 'linear' }}
          >
            <defs>
              {/* Gradient carbone pour la jante aéro */}
              <linearGradient id="carbonRim" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="50%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>

              {/* Gradient pour le moyeu central */}
              <radialGradient id="hubGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="60%" stopColor="#009ee2" />
                <stop offset="100%" stopColor="#0369a1" />
              </radialGradient>
            </defs>

            {/* 1. Pneu extérieur (Gomme noire structurée avec bande de roulement) */}
            <circle
              cx="150"
              cy="150"
              r="142"
              fill="none"
              stroke="#0f172a"
              strokeWidth="15"
            />
            {/* Liseré bleu club sur le flanc du pneu */}
            <circle
              cx="150"
              cy="150"
              r="134.5"
              fill="none"
              stroke="#009ee2"
              strokeWidth="1.5"
              strokeOpacity="0.85"
            />

            {/* 2. Jante carbone haute aéro (Rim profilée) */}
            <circle
              cx="150"
              cy="150"
              r="118"
              fill="none"
              stroke="url(#carbonRim)"
              strokeWidth="28"
            />
            {/* Rebords de jante aluminium/carbone finitions */}
            <circle
              cx="150"
              cy="150"
              r="132"
              fill="none"
              stroke="#475569"
              strokeWidth="1"
              strokeOpacity="0.6"
            />
            <circle
              cx="150"
              cy="150"
              r="104"
              fill="none"
              stroke="#475569"
              strokeWidth="1.2"
              strokeOpacity="0.7"
            />

            {/* 3. TEXTE « RPA » ET BRANDING PRO SUR LA JANTE DU VÉLO */}
            {/* Décal haut : RPA blanc éclatant gravé sur la jante */}
            <text
              x="150"
              y="34"
              textAnchor="middle"
              dominantBaseline="central"
              fill="#ffffff"
              fontSize="16"
              fontWeight="900"
              letterSpacing="6"
              className="select-none font-sans"
            >
              RPA
            </text>

            {/* Décal bas opposé (180°) : RPA bleu officiel club sur la jante */}
            <g transform="rotate(180 150 150)">
              <text
                x="150"
                y="34"
                textAnchor="middle"
                dominantBaseline="central"
                fill="#009ee2"
                fontSize="16"
                fontWeight="900"
                letterSpacing="6"
                className="select-none font-sans"
              >
                RPA
              </text>
            </g>

            {/* Décal latéral 90° : ALLAIN en vert club */}
            <g transform="rotate(90 150 150)">
              <text
                x="150"
                y="34"
                textAnchor="middle"
                dominantBaseline="central"
                fill="#5daf32"
                fontSize="10"
                fontWeight="800"
                letterSpacing="3"
                className="select-none font-sans opacity-90"
              >
                ALLAIN
              </text>
            </g>

            {/* Décal latéral 270° : CYCLO en bleu ciel */}
            <g transform="rotate(270 150 150)">
              <text
                x="150"
                y="34"
                textAnchor="middle"
                dominantBaseline="central"
                fill="#38bdf8"
                fontSize="10"
                fontWeight="800"
                letterSpacing="3"
                className="select-none font-sans opacity-90"
              >
                CYCLO
              </text>
            </g>

            {/* 4. Valve Presta avec bouchon anodisé bleu */}
            <g transform="rotate(45 150 150)">
              <rect
                x="148"
                y="104"
                width="4"
                height="16"
                fill="#cbd5e1"
                rx="1"
              />
              <rect
                x="147.5"
                y="114"
                width="5"
                height="8"
                fill="#009ee2"
                rx="1.5"
              />
            </g>

            {/* 5. Rayons de vélo aérodynamiques croisés */}
            {spokes.map((spoke) => (
              <line
                key={spoke.id}
                x1={spoke.x1}
                y1={spoke.y1}
                x2={spoke.x2}
                y2={spoke.y2}
                stroke="#cbd5e1"
                strokeWidth="1.2"
                strokeOpacity="0.75"
              />
            ))}

            {/* 6. Moyeu central CNC avec roulement et couleurs officielles RPA */}
            <circle
              cx="150"
              cy="150"
              r="24"
              fill="#0f172a"
              stroke="#334155"
              strokeWidth="2"
            />
            <circle
              cx="150"
              cy="150"
              r="17"
              fill="url(#hubGradient)"
            />
            {/* Bague blanche centrale */}
            <circle
              cx="150"
              cy="150"
              r="10"
              fill="#ffffff"
            />
            {/* Axe central vert club */}
            <circle
              cx="150"
              cy="150"
              r="5.5"
              fill="#5daf32"
            />
          </svg>
        </div>

        {/* Ombre portée au sol discrète */}
        <div className="w-20 sm:w-24 h-2 bg-black/25 rounded-full filter blur-[2px] mt-1.5 animate-pulse" />

        {/* Carte de statut compacte et adaptée aux smartphones */}
        <div className="mt-3 bg-white/95 backdrop-blur-md px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl shadow-lg border border-slate-200/80 flex flex-col items-center text-center w-full mx-auto relative">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-1.5 right-2 text-slate-400 hover:text-slate-700 text-xs font-bold p-1 cursor-pointer"
              title="Fermer"
              aria-label="Fermer"
            >
              ✕
            </button>
          )}

          {/* Liseré tricolore du club RPA */}
          <div className="flex items-center gap-1 mb-1.5">
            {CLUB_COLORS.map((c, i) => (
              <div
                key={i}
                style={{ backgroundColor: c.color }}
                className="h-1 w-5 rounded-full"
              />
            ))}
          </div>

          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
            <span>RPA</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800">
              {seasonYear}
            </span>
          </h3>

          <p className="text-[11px] sm:text-xs font-semibold text-[#009ee2] mt-0.5">
            {message}
          </p>

          <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" />
            <span className="truncate max-w-[200px]">{subMessage}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
