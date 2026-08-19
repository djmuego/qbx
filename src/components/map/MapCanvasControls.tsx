import React from 'react';
import { Maximize2, Minus, Plus } from '../common/Icons';
import { useLocale } from '../../i18n/LocaleContext';

interface MapCanvasControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  panHint?: boolean;
}

export const MapCanvasControls: React.FC<MapCanvasControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onFit,
  panHint,
}) => {
  const { t } = useLocale();
  return (
    <div className="absolute right-3 bottom-3 z-10 flex flex-col gap-1.5 pointer-events-none">
      {panHint && (
        <span className="pointer-events-none self-end rounded-lg bg-white/90 dark:bg-zinc-900/90 px-2 py-1 text-[10px] text-zinc-500 shadow-sm border border-zinc-200/80 dark:border-zinc-700">
          {t('map.panHint', 'Пробел + тянуть — панорама')}
        </span>
      )}
      <div className="pointer-events-auto flex flex-col gap-1 rounded-xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/80 dark:border-zinc-700 shadow-md p-1">
        <button
          type="button"
          onClick={onZoomIn}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          title={t('map.zoomIn', 'Приблизить')}
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          title={t('map.zoomOut', 'Отдалить')}
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onFit}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          title={t('map.fitRoom', 'Вписать помещение')}
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
