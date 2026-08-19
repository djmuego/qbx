import React from 'react';
import type { MapObjectKind } from '../../domain/map/space-map.types';
import type { ObjectLibraryItem } from '../../domain/map/spatial-object-library';
import { OBJECT_LIBRARY, LIBRARY_CATEGORY_LABELS } from '../../domain/map/spatial-object-library';
import type { UnboundMapPort } from '../../domain/map/map-palette';

export type MapAddAction =
  | { type: 'kind'; kind: MapObjectKind; label: string }
  | { type: 'library'; item: ObjectLibraryItem }
  | { type: 'port'; port: UnboundMapPort };

interface MapAddMenuProps {
  open: boolean;
  onClose: () => void;
  unboundPorts: UnboundMapPort[];
  onSelect: (action: MapAddAction) => void;
}

const QUICK_ADD: { kind: MapObjectKind; label: string }[] = [
  { kind: 'plant', label: 'Растение' },
  { kind: 'plant_group', label: 'Группа растений' },
  { kind: 'light', label: 'Свет' },
  { kind: 'equipment', label: 'Вентиляция / климат' },
  { kind: 'sensor', label: 'Датчик' },
  { kind: 'camera', label: 'Камера' },
  { kind: 'irrigation', label: 'Полив' },
  { kind: 'structure', label: 'Конструкция' },
  { kind: 'hub', label: 'QBX контроллер' },
];

export const MapAddMenu: React.FC<MapAddMenuProps> = ({ open, onClose, unboundPorts, onSelect }) => {
  if (!open) return null;

  const categories = [...new Set(OBJECT_LIBRARY.map((i) => i.category))];

  return (
    <>
      <button type="button" className="fixed inset-0 z-40 bg-black/30" aria-label="Закрыть" onClick={onClose} />
      <div className="fixed z-50 inset-x-3 bottom-20 max-h-[70vh] overflow-auto rounded-2xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4 shadow-xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[min(420px,92vw)] sm:bottom-auto sm:top-[20%]">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Добавить на карту</h3>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {QUICK_ADD.map((item) => (
            <button
              key={item.kind + item.label}
              type="button"
              onClick={() => {
                onSelect({ type: 'kind', kind: item.kind, label: item.label });
                onClose();
              }}
              className="px-3 py-2.5 rounded-xl text-left text-xs font-semibold bg-slate-50 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              {item.label}
            </button>
          ))}
        </div>
        {categories.map((cat) => (
          <div key={cat} className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{LIBRARY_CATEGORY_LABELS[cat]}</p>
            <div className="flex flex-wrap gap-1.5">
              {OBJECT_LIBRARY.filter((i) => i.category === cat).slice(0, 8).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect({ type: 'library', item });
                    onClose();
                  }}
                  className="px-2 py-1.5 rounded-lg text-[11px] bg-slate-100 dark:bg-zinc-800"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        {unboundPorts.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1.5">Привязать устройство</p>
            <div className="space-y-1 max-h-32 overflow-auto">
              {unboundPorts.map((port) => (
                <button
                  key={port.key}
                  type="button"
                  onClick={() => {
                    onSelect({ type: 'port', port });
                    onClose();
                  }}
                  className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] bg-violet-50 dark:bg-violet-950/30 text-violet-800 dark:text-violet-200"
                >
                  {port.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
