import React from 'react';
import type { MapPlacement } from '../../domain/map/space-map.types';

interface MapContextToolbarProps {
  selected: MapPlacement[];
  editMode: boolean;
  onMove?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onInspect?: () => void;
}

export const MapContextToolbar: React.FC<MapContextToolbarProps> = ({
  selected,
  editMode,
  onDuplicate,
  onDelete,
  onInspect,
}) => {
  if (selected.length === 0) return null;
  const item = selected[0]!;
  const isPlant = item.kind === 'plant';

  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-3 z-20 flex items-center gap-1 px-2 py-1.5 rounded-2xl bg-white/95 dark:bg-zinc-900/95 border border-slate-200 dark:border-zinc-700 shadow-lg backdrop-blur-sm">
      {isPlant && onInspect && (
        <button type="button" onClick={onInspect} className="px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800">
          Инспектор
        </button>
      )}
      {editMode && onDuplicate && selected.length === 1 && (
        <button type="button" onClick={onDuplicate} className="px-3 py-1.5 rounded-xl text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800">
          Дублировать
        </button>
      )}
      {editMode && onDelete && (
        <button type="button" onClick={onDelete} className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-red-600">
          Удалить
        </button>
      )}
      <span className="text-[10px] text-slate-400 px-1">
        {selected.length > 1 ? `${selected.length} объектов` : item.label ?? item.kind}
      </span>
    </div>
  );
};
