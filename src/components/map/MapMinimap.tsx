import React from 'react';
import type { SpaceDimensions } from '../../domain/space/space.types';
import type { SpaceMap } from '../../domain/map/space-map.types';
import { MAP_KIND_COLORS } from './map-colors';

interface MapMinimapProps {
  bounds: SpaceDimensions;
  map: SpaceMap;
  selectedIds: string[];
}

export const MapMinimap: React.FC<MapMinimapProps> = ({ bounds, map, selectedIds }) => {
  const w = 160;
  const h = Math.max(72, (w * bounds.widthM) / Math.max(bounds.lengthM, 0.1));
  const sx = w / bounds.lengthM;
  const sy = h / bounds.widthM;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2">
      <p className="text-[10px] font-bold text-zinc-500 mb-1">План</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" aria-hidden>
        <rect width={w} height={h} fill="#18181b" />
        {map.zones.map((z) => (
          <rect
            key={z.id}
            x={z.xM * sx}
            y={(bounds.widthM - z.yM - z.heightM) * sy}
            width={z.widthM * sx}
            height={z.heightM * sy}
            fill="#10b98122"
            stroke="#10b981"
            strokeWidth={0.5}
          />
        ))}
        {map.placements.map((p) => {
          const c = MAP_KIND_COLORS[p.kind];
          return (
            <rect
              key={p.id}
              x={p.xM * sx}
              y={(bounds.widthM - p.yM - p.heightM) * sy}
              width={Math.max(p.widthM * sx, 3)}
              height={Math.max(p.heightM * sy, 3)}
              fill={c.stroke}
              opacity={selectedIds.includes(p.id) ? 1 : 0.75}
              stroke={selectedIds.includes(p.id) ? '#fff' : 'none'}
              strokeWidth={0.8}
            />
          );
        })}
      </svg>
    </div>
  );
};
