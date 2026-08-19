import React from 'react';
import { useApp } from '../../context/AppContext';
import { Leaf, ChevronRight, Sparkles } from '../common/Icons';

export const GrowPhaseTile: React.FC = () => {
  const { currentGrowPhaseInfo, setIsGrowPhaseModalOpen, setIsSpaceAdvisorOpen } = useApp();

  return (
    <div
      onClick={() => setIsGrowPhaseModalOpen(true)}
      className="group h-full rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 p-4 sm:p-5 shadow-xs flex flex-col justify-between cursor-pointer transition-all hover:border-emerald-500/50 dark:hover:border-emerald-500/40 active:scale-[0.99] select-none"
    >
      {/* Top row: Tag & Action */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
          <Leaf className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>{currentGrowPhaseInfo.name}</span>
        </div>

        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 group-hover:underline flex items-center gap-0.5">
          Изменить
          <ChevronRight className="w-3.5 h-3.5" />
        </span>
      </div>

      {/* Middle info */}
      <div className="my-2 space-y-1">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 font-medium">
          <span>Световой цикл:</span>
          <span className="font-semibold text-slate-800 dark:text-zinc-200 font-mono">{currentGrowPhaseInfo.lightCycle}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 font-medium">
          <span>Оптимально:</span>
          <span className="font-semibold text-slate-800 dark:text-zinc-200 font-mono">
            {currentGrowPhaseInfo.targetTemp} · {currentGrowPhaseInfo.targetHumidity}
          </span>
        </div>
      </div>

      {/* Bottom hint */}
      <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500 gap-2">
        <span className="truncate">{currentGrowPhaseInfo.subtitle}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsSpaceAdvisorOpen(true);
          }}
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 dark:text-violet-400 hover:underline shrink-0"
        >
          <Sparkles className="w-3 h-3" />
          AI
        </button>
      </div>
    </div>
  );
};
