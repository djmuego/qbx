import React, { useEffect, useRef } from 'react';
import type { MapPlacement } from '../../domain/map/space-map.types';
import type { PlantGrowthVisual } from '../../domain/grow/plant-growth-visual';
import {
  formatGrowthTimelineLabel,
  placementCycleDays,
  visualStageLabel,
} from '../../domain/grow/plant-growth-visual';

interface PlantGrowthCycleScrubberProps {
  placement: MapPlacement;
  growth: PlantGrowthVisual;
  liveAgeDays: number;
  previewDays: number | null;
  playing: boolean;
  onPlayingChange: (playing: boolean) => void;
  onPreviewChange: (days: number | null) => void;
}

export const PlantGrowthCycleScrubber: React.FC<PlantGrowthCycleScrubberProps> = ({
  placement,
  growth,
  liveAgeDays,
  previewDays,
  playing,
  onPlayingChange,
  onPreviewChange,
}) => {
  const cycleDays = placementCycleDays(placement);
  const displayDay = previewDays ?? liveAgeDays;
  const tickRef = useRef(previewDays ?? liveAgeDays);

  useEffect(() => {
    tickRef.current = previewDays ?? liveAgeDays;
  }, [previewDays, liveAgeDays]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const next = tickRef.current >= cycleDays ? 0 : tickRef.current + 1;
      tickRef.current = next;
      onPreviewChange(next);
    }, 120);
    return () => clearInterval(id);
  }, [playing, cycleDays, onPreviewChange]);

  const handleSlider = (value: number) => {
    onPlayingChange(false);
    if (value === liveAgeDays) onPreviewChange(null);
    else onPreviewChange(value);
  };

  return (
    <div className="space-y-2 pt-1 border-t border-emerald-200/80 dark:border-emerald-800">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-200 uppercase tracking-wide">
          Перемотка цикла
        </p>
        {previewDays != null && (
          <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            превью
          </span>
        )}
      </div>
      <input
        type="range"
        min={0}
        max={cycleDays}
        step={1}
        value={displayDay}
        onChange={(e) => handleSlider(Number(e.target.value))}
        className="w-full accent-emerald-600"
      />
      <div className="flex justify-between text-[10px] text-emerald-700 dark:text-emerald-300">
        <span>День {displayDay}</span>
        <span>{formatGrowthTimelineLabel(displayDay, cycleDays)}</span>
        <span>{visualStageLabel(growth.visualStageIndex)}</span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 text-[10px] font-semibold py-1 rounded-lg bg-white dark:bg-zinc-800 border border-emerald-200 dark:border-emerald-800 text-emerald-700"
          onClick={() => {
            onPlayingChange(false);
            onPreviewChange(null);
          }}
        >
          Сейчас
        </button>
        <button
          type="button"
          className="flex-1 text-[10px] font-semibold py-1 rounded-lg bg-emerald-600 text-white"
          onClick={() => {
            if (!playing && previewDays == null) onPreviewChange(liveAgeDays);
            onPlayingChange(!playing);
          }}
        >
          {playing ? '⏸ Пауза' : '▶ Цикл'}
        </button>
      </div>
      <p className="text-[9px] text-emerald-600/80 dark:text-emerald-400/80">
        Крона {(growth.canopyDiameterM * 100).toFixed(0)} см · высота {(growth.plantHeightM * 100).toFixed(0)} см
      </p>
    </div>
  );
};
