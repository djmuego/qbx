import React from 'react';

interface NorthCompassProps {
  northAngleDeg: number;
  className?: string;
  size?: number;
}

/** Compass indicator — orientation only, no solar simulation. */
export const NorthCompass: React.FC<NorthCompassProps> = ({ northAngleDeg, className = '', size = 40 }) => {
  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      style={{ width: size, height: size }}
      aria-label={`Север ${northAngleDeg}°`}
      title={`Север: ${northAngleDeg}°`}
    >
      <svg viewBox="0 0 40 40" width={size} height={size} className="text-stone-500 dark:text-stone-400">
        <circle cx="20" cy="20" r="18" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1" />
        <g transform={`rotate(${northAngleDeg} 20 20)`}>
          <polygon points="20,6 24,18 20,14 16,18" fill="#ef4444" />
          <text x="20" y="34" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor">
            N
          </text>
        </g>
      </svg>
    </div>
  );
};
