import React, { useState } from 'react';
import { OBJECT_LIBRARY, LIBRARY_CATEGORY_LABELS, type ObjectLibraryCategory } from '../../domain/map/spatial-object-library';
import type { ObjectLibraryItem } from '../../domain/map/spatial-object-library';
import { resolveSpatialAsset } from '../../features/map3d/assets/resolve-spatial-asset';

interface MapObjectLibraryProps {
  onAdd: (item: ObjectLibraryItem) => void;
  compact?: boolean;
}

export const MapObjectLibrary: React.FC<MapObjectLibraryProps> = ({ onAdd, compact }) => {
  const [cat, setCat] = useState<ObjectLibraryCategory>('plants');
  const items = OBJECT_LIBRARY.filter((i) => i.category === cat);
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 space-y-2">
      <p className="text-[11px] font-bold">Библиотека</p>
      <div className={`flex gap-1 overflow-x-auto ${compact ? '' : 'flex-wrap'}`}>
        {(Object.keys(LIBRARY_CATEGORY_LABELS) as ObjectLibraryCategory[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setCat(id)}
            className={`px-2 py-1.5 rounded-lg text-[10px] font-semibold whitespace-nowrap min-h-[36px] ${cat === id ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-zinc-800'}`}
          >
            {LIBRARY_CATEGORY_LABELS[id]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1 max-h-56 overflow-auto">
        {items.map((item) => {
          const thumb = resolveSpatialAsset({ kind: item.kind, role: item.role, catalogId: item.id, widthM: item.widthM });
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onAdd(item)}
              className="text-left px-2 py-1.5 rounded-xl text-[11px] bg-slate-50 dark:bg-zinc-800 hover:bg-emerald-50 min-h-[40px] flex items-center gap-2"
            >
              {thumb.source && thumb.objectSprite ? (
                <img src={thumb.source} alt="" className="w-7 h-7 object-contain shrink-0 rounded bg-zinc-900" />
              ) : null}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
