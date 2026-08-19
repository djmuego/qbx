import React from 'react';
import type { SpatialLayerId } from '../../domain/map/spatial-layers';
import { SPATIAL_LAYER_LABELS } from '../../domain/map/spatial-layers';
import { SpatialLayerToggles } from './spatial3d/SpatialLayerToggles';

interface MapLayersPopoverProps {
  open: boolean;
  onClose: () => void;
  layers: Record<SpatialLayerId, boolean>;
  onChange: (id: SpatialLayerId, value: boolean) => void;
}

export const MapLayersPopover: React.FC<MapLayersPopoverProps> = ({ open, onClose, layers, onChange }) => {
  if (!open) return null;
  return (
    <>
      <button type="button" className="fixed inset-0 z-40 bg-black/20 lg:bg-transparent" aria-label="Закрыть слои" onClick={onClose} />
      <div className="fixed z-50 inset-x-3 bottom-20 max-h-[60vh] overflow-auto rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-xl lg:absolute lg:inset-auto lg:left-4 lg:top-full lg:mt-2 lg:w-72 lg:bottom-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">Слои карты</h3>
          <button type="button" onClick={onClose} className="text-xs text-slate-500">
            Закрыть
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mb-2">Тонкая настройка видимости. Режимы «План / Свет / …» задают пресет.</p>
        <SpatialLayerToggles layers={layers} onChange={onChange} compact />
        <div className="mt-3 pt-2 border-t border-slate-100 dark:border-zinc-800 text-[10px] text-slate-400">
          {Object.entries(SPATIAL_LAYER_LABELS).filter(([id]) => layers[id as SpatialLayerId]).length} слоёв включено
        </div>
      </div>
    </>
  );
};
