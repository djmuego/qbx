import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Sparkles } from '../common/Icons';
import {
  formatGrowthTimelineLabel,
  resolvePlantGrowthVisual,
  visualStageLabel,
} from '../../domain/grow/plant-growth-visual';
import {
  PLANT_AGE_PRESETS,
  ageDaysFromPreset,
  suggestPlantAgeDays,
} from '../../domain/grow/plant-setup-age';

interface PlantSetupAgeFieldProps {
  ageDays: number;
  cycleDays?: number;
  crop?: string;
  description?: string;
  growMethod?: string;
  onChange: (ageDays: number) => void;
  compact?: boolean;
}

export const PlantSetupAgeField: React.FC<PlantSetupAgeFieldProps> = ({
  ageDays,
  cycleDays = 90,
  crop,
  description,
  growMethod,
  onChange,
  compact,
}) => {
  const [aiHint, setAiHint] = useState<string | null>(null);
  const growth = useMemo(
    () =>
      resolvePlantGrowthVisual(ageDays, cycleDays, undefined, {
        matureWidthM: 0.3,
        matureHeightM: 0.3,
        matureSizeZM: 0.45,
      }),
    [ageDays, cycleDays],
  );

  useEffect(() => {
    setAiHint(null);
  }, [crop, description, growMethod]);

  const applySuggestion = () => {
    const s = suggestPlantAgeDays({ description, crop, growMethod, cycleDays });
    onChange(s.ageDays);
    setAiHint(s.reason);
  };

  return (
    <div
      className={`space-y-2 ${compact ? '' : 'rounded-xl border border-emerald-200/70 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 p-3'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-200">Возраст растений</p>
        <button
          type="button"
          onClick={applySuggestion}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-violet-600 text-white"
          title="QBX подберёт возраст по описанию"
        >
          <Sparkles className="w-3 h-3" />
          Подсказка
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {PLANT_AGE_PRESETS.map((p) => {
          const days = ageDaysFromPreset(p.id, cycleDays);
          const active = ageDays === days;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(days)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold ${active ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-zinc-800 border border-emerald-200/80 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <input
        type="range"
        min={0}
        max={cycleDays}
        step={1}
        value={ageDays}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-600"
      />
      <div className="flex justify-between text-[10px] text-emerald-700 dark:text-emerald-300">
        <span>День {ageDays}</span>
        <span>{formatGrowthTimelineLabel(ageDays, cycleDays)}</span>
        <span>{visualStageLabel(growth.visualStageIndex)}</span>
      </div>
      <p className="text-[10px] text-emerald-700/90 dark:text-emerald-300/90">
        На карте: крона ~{(growth.canopyDiameterM * 100).toFixed(0)} см, высота ~{(growth.plantHeightM * 100).toFixed(0)} см
      </p>
      {aiHint && (
        <p className="text-[10px] text-violet-700 dark:text-violet-300 flex items-start gap-1">
          <Bot className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {aiHint}
        </p>
      )}
    </div>
  );
};
