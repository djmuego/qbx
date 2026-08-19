import React from 'react';
import type { MapVisualCategory } from '../../domain/map/map-visual-language';

interface MapCategoryIconProps {
  category: MapVisualCategory;
  /** 1..9 for plant stage variation */
  plantStage?: number;
  size?: number;
  color?: string;
}

const STROKE = 'currentColor';

function PlantIcon({ size, color, stage = 5 }: { size: number; color: string; stage?: number }) {
  const leaves = stage <= 2 ? 1 : stage <= 5 ? 2 : 3;
  return (
    <g fill="none" stroke={color} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx={size / 2} cy={size * 0.72} rx={size * 0.18} ry={size * 0.08} fill={color} fillOpacity={0.15} stroke="none" />
      <line x1={size / 2} y1={size * 0.72} x2={size / 2} y2={size * 0.38} />
      {leaves >= 1 && <path d={`M${size / 2} ${size * 0.55} Q${size * 0.3} ${size * 0.42} ${size * 0.35} ${size * 0.28}`} />}
      {leaves >= 2 && <path d={`M${size / 2} ${size * 0.5} Q${size * 0.7} ${size * 0.38} ${size * 0.65} ${size * 0.24}`} />}
      {leaves >= 3 && <path d={`M${size / 2} ${size * 0.42} Q${size * 0.5} ${size * 0.2} ${size * 0.5} ${size * 0.12}`} />}
    </g>
  );
}

export const MapCategoryIcon: React.FC<MapCategoryIconProps> = ({ category, plantStage, size = 20, color = STROKE }) => {
  const s = size;
  const c = color;
  switch (category) {
    case 'plant':
      return <PlantIcon size={s} color={c} stage={plantStage} />;
    case 'light':
      return (
        <g fill="none" stroke={c} strokeWidth={1.4}>
          <rect x={s * 0.15} y={s * 0.35} width={s * 0.7} height={s * 0.3} rx={2} />
          <line x1={s * 0.3} y1={s * 0.5} x2={s * 0.7} y2={s * 0.5} />
        </g>
      );
    case 'climate':
      return (
        <g fill="none" stroke={c} strokeWidth={1.4}>
          <circle cx={s / 2} cy={s / 2} r={s * 0.28} />
          <path d={`M${s / 2} ${s * 0.22} L${s / 2} ${s * 0.78} M${s * 0.22} ${s / 2} L${s * 0.78} ${s / 2}`} />
        </g>
      );
    case 'sensor':
      return (
        <g fill="none" stroke={c} strokeWidth={1.4}>
          <rect x={s * 0.28} y={s * 0.22} width={s * 0.44} height={s * 0.56} rx={3} />
          <circle cx={s / 2} cy={s * 0.42} r={s * 0.08} fill={c} />
        </g>
      );
    case 'irrigation':
      return (
        <g fill="none" stroke={c} strokeWidth={1.4}>
          <circle cx={s * 0.35} cy={s * 0.55} r={s * 0.12} />
          <path d={`M${s * 0.47} ${s * 0.55} L${s * 0.72} ${s * 0.35} M${s * 0.72} ${s * 0.35} L${s * 0.72} ${s * 0.65}`} />
        </g>
      );
    case 'water':
      return (
        <g fill="none" stroke={c} strokeWidth={1.4}>
          <path d={`M${s / 2} ${s * 0.2} Q${s * 0.75} ${s * 0.45} ${s / 2} ${s * 0.78} Q${s * 0.25} ${s * 0.45} ${s / 2} ${s * 0.2}`} />
        </g>
      );
    case 'camera':
      return (
        <g fill="none" stroke={c} strokeWidth={1.4}>
          <rect x={s * 0.18} y={s * 0.32} width={s * 0.64} height={s * 0.38} rx={3} />
          <circle cx={s / 2} cy={s * 0.51} r={s * 0.1} />
        </g>
      );
    case 'controller':
      return (
        <g fill="none" stroke={c} strokeWidth={1.4}>
          <rect x={s * 0.2} y={s * 0.28} width={s * 0.6} height={s * 0.44} rx={3} />
          <circle cx={s * 0.35} cy={s * 0.5} r={s * 0.05} fill={c} />
          <circle cx={s * 0.5} cy={s * 0.5} r={s * 0.05} fill={c} />
          <circle cx={s * 0.65} cy={s * 0.5} r={s * 0.05} fill={c} />
        </g>
      );
    case 'infrastructure':
      return (
        <g fill="none" stroke={c} strokeWidth={1.4}>
          <rect x={s * 0.2} y={s * 0.25} width={s * 0.6} height={s * 0.5} rx={2} />
          <line x1={s * 0.2} y1={s * 0.42} x2={s * 0.8} y2={s * 0.42} />
          <line x1={s * 0.2} y1={s * 0.58} x2={s * 0.8} y2={s * 0.58} />
        </g>
      );
    case 'electrical':
      return (
        <g fill="none" stroke={c} strokeWidth={1.4}>
          <rect x={s * 0.22} y={s * 0.38} width={s * 0.56} height={s * 0.24} rx={2} />
          <circle cx={s * 0.35} cy={s * 0.5} r={s * 0.04} fill={c} />
          <circle cx={s * 0.5} cy={s * 0.5} r={s * 0.04} fill={c} />
          <circle cx={s * 0.65} cy={s * 0.5} r={s * 0.04} fill={c} />
        </g>
      );
    case 'zone':
      return (
        <g fill="none" stroke={c} strokeWidth={1.4} strokeDasharray="3 2">
          <rect x={s * 0.15} y={s * 0.15} width={s * 0.7} height={s * 0.7} rx={4} />
        </g>
      );
    default:
      return <circle cx={s / 2} cy={s / 2} r={s * 0.2} fill="none" stroke={c} strokeWidth={1.4} />;
  }
};
