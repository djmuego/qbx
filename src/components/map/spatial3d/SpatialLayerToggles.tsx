import React from 'react';
import { SPATIAL_LAYER_LABELS, type SpatialLayerId } from '../../../domain/map/spatial-layers';

interface SpatialLayerTogglesProps {
  layers: Record<SpatialLayerId, boolean>;
  onChange: (id: SpatialLayerId, value: boolean) => void;
  compact?: boolean;
}

export const SpatialLayerToggles: React.FC<SpatialLayerTogglesProps> = ({ layers, onChange, compact }) => {
  return (
    <div className={compact ? 'flex flex-wrap gap-1.5' : 'grid grid-cols-2 gap-1.5'}>
      {(Object.keys(SPATIAL_LAYER_LABELS) as SpatialLayerId[]).map((id) => (
        <label
          key={id}
          className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800 text-[11px] font-medium min-h-[36px]"
        >
          <input type="checkbox" checked={layers[id]} onChange={(e) => onChange(id, e.target.checked)} />
          {SPATIAL_LAYER_LABELS[id]}
        </label>
      ))}
    </div>
  );
};
