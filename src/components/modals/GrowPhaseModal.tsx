import React from 'react';
import { useApp } from '../../context/AppContext';
import { GROW_PHASES } from '../../types';
import { GrowPhaseId } from '../../types';
import { X, Check, Leaf, Sun, Thermometer, Droplets } from '../common/Icons';

export const GrowPhaseModal: React.FC = () => {
  const { isGrowPhaseModalOpen, setIsGrowPhaseModalOpen, growPhase, setGrowPhase } = useApp();

  if (!isGrowPhaseModalOpen) return null;

  const phasesList: GrowPhaseId[] = ['seedling', 'vegetation', 'flowering', 'flushing'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Фаза выращивания
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Выберите текущий этап для автоматической оптимизации микроклимата
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsGrowPhaseModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Phase selection list */}
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {phasesList.map(pId => {
            const phase = GROW_PHASES[pId];
            const isSelected = growPhase === pId;

            return (
              <div
                key={pId}
                onClick={() => {
                  setGrowPhase(pId);
                  setIsGrowPhaseModalOpen(false);
                }}
                className={`group p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2.5 ${
                  isSelected
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500 shadow-xs'
                    : 'bg-slate-50/50 dark:bg-zinc-800/40 border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {phase.name}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-zinc-700/60 text-slate-700 dark:text-zinc-300">
                        {phase.lightCycle}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">
                      {phase.description}
                    </p>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ml-3 transition-colors ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'border border-slate-300 dark:border-zinc-600 group-hover:border-emerald-500'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>

                {/* Target parameters summary */}
                <div className="flex items-center gap-4 pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-xs text-slate-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                    <span>Цель: <strong className="text-slate-800 dark:text-zinc-200">{phase.targetTemp}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-sky-500" />
                    <span>Влажность: <strong className="text-slate-800 dark:text-zinc-200">{phase.targetHumidity}</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-zinc-950 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
          <button
            onClick={() => setIsGrowPhaseModalOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 rounded-xl transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
