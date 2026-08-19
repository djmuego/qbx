import React from 'react';
import type { MapViewModeId } from '../../domain/map/map-view-modes';
import { MAP_VIEW_MODE_LABELS } from '../../domain/map/map-view-modes';
import { Layers, Plus, Maximize2, LayoutGrid } from '../common/Icons';
import { useLocale } from '../../i18n/LocaleContext';

export type SnapStepOption = 0 | 0.05 | 0.1 | 0.25 | 0.5;

interface MapToolbarProps {
  mapViewMode: '2d' | '3d';
  onMapViewModeChange: (mode: '2d' | '3d') => void;
  spatialMode: MapViewModeId;
  onSpatialModeChange: (mode: MapViewModeId) => void;
  editMode: boolean;
  onEditModeChange: (edit: boolean) => void;
  showGrid: boolean;
  onShowGridChange: (show: boolean) => void;
  snapStepM: SnapStepOption;
  onSnapStepChange: (step: SnapStepOption) => void;
  onFitToRoom: () => void;
  onOpenLayers: () => void;
  onOpenAdd: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  readOnly?: boolean;
  saveState?: 'saved' | 'saving' | 'error';
}

const SPATIAL_MODES: MapViewModeId[] = ['plan', 'climate', 'light', 'irrigation', 'electrical'];

export const MapToolbar: React.FC<MapToolbarProps> = ({
  mapViewMode,
  onMapViewModeChange,
  spatialMode,
  onSpatialModeChange,
  editMode,
  onEditModeChange,
  showGrid,
  onShowGridChange,
  snapStepM,
  onSnapStepChange,
  onFitToRoom,
  onOpenLayers,
  onOpenAdd,
  onUndo,
  onRedo,
  readOnly,
  saveState,
}) => {
  const { t } = useLocale();

  return (
  <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/50 p-2 sm:p-2.5 backdrop-blur-sm">
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="inline-flex rounded-xl bg-zinc-100/90 dark:bg-zinc-800/90 p-0.5">
        <button
          type="button"
          onClick={() => onMapViewModeChange('2d')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold min-h-[40px] ${mapViewMode === '2d' ? 'bg-white dark:bg-zinc-900 shadow-xs text-emerald-700' : 'text-slate-600 dark:text-zinc-400'}`}
        >
          2D
        </button>
        <button
          type="button"
          onClick={() => onMapViewModeChange('3d')}
          className={`px-3 py-2 rounded-lg text-xs font-semibold min-h-[40px] ${mapViewMode === '3d' ? 'bg-white dark:bg-zinc-900 shadow-xs text-emerald-700' : 'text-slate-600 dark:text-zinc-400'}`}
        >
          3D
        </button>
      </div>
      <div className="hidden sm:flex flex-wrap gap-1">
        {SPATIAL_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onSpatialModeChange(mode)}
            className={`px-2.5 py-2 rounded-xl text-[11px] font-semibold min-h-[40px] ${spatialMode === mode ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300'}`}
          >
            {MAP_VIEW_MODE_LABELS[mode]}
          </button>
        ))}
      </div>
      <div className="inline-flex rounded-xl bg-slate-100 dark:bg-zinc-800 p-0.5 ml-auto sm:ml-0">
        <button
          type="button"
          onClick={() => onEditModeChange(false)}
          className={`px-3 py-2 rounded-lg text-xs font-semibold min-h-[40px] ${!editMode ? 'bg-white dark:bg-zinc-900 shadow-xs' : ''}`}
        >
          {t('map.view', 'Просмотр')}
        </button>
        <button
          type="button"
          disabled={readOnly}
          onClick={() => onEditModeChange(true)}
          className={`px-3 py-2 rounded-lg text-xs font-semibold min-h-[40px] disabled:opacity-40 ${editMode ? 'bg-white dark:bg-zinc-900 shadow-xs text-emerald-700' : ''}`}
        >
          {t('map.edit', 'Редактирование')}
        </button>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={onOpenAdd}
        disabled={readOnly || !editMode}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold min-h-[40px] bg-emerald-600 text-white disabled:opacity-40"
      >
        <Plus className="w-4 h-4" /> {t('map.add', 'Добавить')}
      </button>
      <button type="button" onClick={onOpenLayers} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold min-h-[40px] bg-slate-100 dark:bg-zinc-800">
        <Layers className="w-3.5 h-3.5" /> {t('map.layers', 'Слои')}
      </button>
      <button type="button" onClick={onFitToRoom} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold min-h-[40px] bg-slate-100 dark:bg-zinc-800" title={t('map.fitRoom', 'Вписать помещение')}>
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onShowGridChange(!showGrid)}
        className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold min-h-[40px] ${showGrid ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-zinc-800'}`}
      >
        <LayoutGrid className="w-3.5 h-3.5" /> {t('map.grid', 'Сетка')}
      </button>
      <select
        value={snapStepM}
        onChange={(e) => onSnapStepChange(Number(e.target.value) as SnapStepOption)}
        disabled={!editMode}
        className="px-2 py-2 rounded-xl text-xs bg-slate-100 dark:bg-zinc-800 min-h-[40px] disabled:opacity-50"
      >
        <option value={0}>Snap OFF</option>
        <option value={0.05}>5 cm</option>
        <option value={0.1}>10 cm</option>
        <option value={0.25}>25 cm</option>
        <option value={0.5}>50 cm</option>
      </select>
      {onUndo && (
        <button type="button" onClick={onUndo} disabled={!editMode} className="px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-zinc-800 min-h-[40px] disabled:opacity-50">
          Undo
        </button>
      )}
      {onRedo && (
        <button type="button" onClick={onRedo} disabled={!editMode} className="px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-zinc-800 min-h-[40px] disabled:opacity-50">
          Redo
        </button>
      )}
      {saveState && (
        <span className="text-[11px] text-slate-400 ml-auto">
          {saveState === 'saving' ? t('map.saving', 'Сохранение…') : saveState === 'error' ? t('map.error', 'Ошибка') : t('map.saved', 'Сохранено')}
        </span>
      )}
    </div>
  </div>
  );
};
