import React from 'react';
import { MAP_KIND_LABELS, type MapObjectKind } from '../../domain/map/space-map.types';
import type { UnboundMapPort } from '../../domain/map/map-palette';
import { Plus } from '../common/Icons';
import { MAP_KIND_EMOJI } from './map-colors';

const STRUCTURE_KINDS: MapObjectKind[] = ['plant', 'structure', 'plant_group', 'camera'];

interface MapPaletteProps {
  unboundPorts: UnboundMapPort[];
  onAddKind: (kind: MapObjectKind) => void;
  onAddPort: (port: UnboundMapPort) => void;
}

export const MapPalette: React.FC<MapPaletteProps> = ({ unboundPorts, onAddKind, onAddPort }) => {
  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs p-3 sm:p-4 space-y-4">
      <div>
        <h3 className="text-xs font-bold text-slate-900 dark:text-white">Добавить</h3>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">Растения и конструкции — без устройства</p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {STRUCTURE_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => onAddKind(kind)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-zinc-200 bg-slate-50 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-transparent hover:border-emerald-200/80"
            >
              <Plus className="w-3 h-3" />
              {MAP_KIND_EMOJI[kind]} {MAP_KIND_LABELS[kind]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-900 dark:text-white">Устройства пространства</h3>
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">Назначаем координаты, не создаём заново</p>
        {unboundPorts.length === 0 ? (
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-2">Все порты уже на карте — или устройств нет.</p>
        ) : (
          <div className="mt-2 space-y-1 max-h-56 overflow-auto">
            {unboundPorts.map((port) => (
              <button
                key={port.key}
                type="button"
                onClick={() => onAddPort(port)}
                className="w-full text-left px-2 py-1.5 rounded-xl text-[11px] bg-slate-50 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                <span className="font-semibold text-slate-800 dark:text-zinc-100">
                  {MAP_KIND_EMOJI[port.kind]} {port.label}
                </span>
                <span className="block text-slate-400 dark:text-zinc-500">{port.deviceName}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
