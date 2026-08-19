import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { GROW_PHASES } from '../../types';
import { adviseSpaceSetup } from '../../application/ai/advisor.service';
import { AiClientError } from '../../application/ai/ai-client';
import type { SpaceAdvisorRecommendation } from '../../domain/ai/advisor.types';
import { Sparkles, RefreshCw, Check, Leaf, Thermometer, Droplets } from '../common/Icons';

type Step = 'form' | 'loading' | 'result';

export const SpaceAdvisorModal: React.FC = () => {
  const {
    isSpaceAdvisorOpen,
    setIsSpaceAdvisorOpen,
    aiSettings,
    applySpaceAdvisorRecommendation,
  } = useApp();
  const { isFeatureAvailable, requestUpgrade } = useSubscription();

  useEffect(() => {
    if (isSpaceAdvisorOpen && !isFeatureAvailable('AI_GROW_ADVISOR')) {
      setIsSpaceAdvisorOpen(false);
      requestUpgrade('AI_GROW_ADVISOR');
    }
  }, [isSpaceAdvisorOpen, isFeatureAvailable, requestUpgrade, setIsSpaceAdvisorOpen]);

  const [step, setStep] = useState<Step>('form');
  const [spaceName, setSpaceName] = useState('');
  const [cropOrGoal, setCropOrGoal] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [phaseHint, setPhaseHint] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<SpaceAdvisorRecommendation | null>(null);

  const reset = () => {
    setStep('form');
    setSpaceName('');
    setCropOrGoal('');
    setRoomDescription('');
    setPhaseHint('');
    setError(null);
    setRecommendation(null);
  };

  const handleClose = () => {
    setIsSpaceAdvisorOpen(false);
    reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceName.trim() || !cropOrGoal.trim()) return;

    setStep('loading');
    setError(null);

    try {
      const result = await adviseSpaceSetup(
        {
          spaceName: spaceName.trim(),
          cropOrGoal: cropOrGoal.trim(),
          roomDescription: roomDescription.trim() || undefined,
          currentPhaseHint: phaseHint.trim() || undefined,
        },
        aiSettings,
      );
      setRecommendation(result);
      setStep('result');
    } catch (err) {
      const message =
        err instanceof AiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Не удалось получить рекомендацию AI';
      setError(message);
      setStep('form');
    }
  };

  const handleApply = async () => {
    if (!recommendation) return;
    await applySpaceAdvisorRecommendation(recommendation);
    handleClose();
  };

  if (!isSpaceAdvisorOpen) return null;

  const phaseInfo = recommendation ? GROW_PHASES[recommendation.growPhase] : null;

  return (
    <Modal
      isOpen={isSpaceAdvisorOpen}
      onClose={handleClose}
      maxWidth="2xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 dark:text-white">Grow Advisor</div>
            <div className="text-xs font-normal text-slate-500 dark:text-zinc-400">
              AI поможет выбрать фазу и параметры микроклимата
            </div>
          </div>
        </div>
      }
    >
      {step === 'form' && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Название пространства</label>
            <input
              value={spaceName}
              onChange={(e) => setSpaceName(e.target.value)}
              placeholder="Например: Гроубокс 120×60"
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Культура / цель</label>
            <input
              value={cropOrGoal}
              onChange={(e) => setCropOrGoal(e.target.value)}
              placeholder="Томаты, салат, проращивание семян..."
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Описание помещения (опционально)</label>
            <textarea
              value={roomDescription}
              onChange={(e) => setRoomDescription(e.target.value)}
              placeholder="Размер, тип освещения, вентиляция, опыт..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-zinc-400">Фаза (если уже знаете)</label>
            <select
              value={phaseHint}
              onChange={(e) => setPhaseHint(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">AI выберет сам</option>
              <option value="seedling">Проращивание / рассада</option>
              <option value="vegetation">Вегетация</option>
              <option value="flowering">Цветение</option>
              <option value="flushing">Созревание</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!aiSettings.enabled}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Получить рекомендацию
            </button>
          </div>

          {!aiSettings.enabled && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              AI отключён в настройках. Включите Grow Advisor в разделе «Настройки → AI».
            </p>
          )}
        </form>
      )}

      {step === 'loading' && (
        <div className="py-12 flex flex-col items-center gap-3 text-slate-500 dark:text-zinc-400">
          <RefreshCw className="w-8 h-8 animate-spin text-violet-500" />
          <p className="text-sm font-medium">AI анализирует параметры...</p>
        </div>
      )}

      {step === 'result' && recommendation && phaseInfo && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-violet-50/70 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900">
            <p className="text-sm text-slate-800 dark:text-zinc-200 leading-relaxed">{recommendation.summary}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                <Leaf className="w-3.5 h-3.5" />
                {phaseInfo.name}
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-400">{recommendation.spaceDescription}</p>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/40 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-400">
                <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                {recommendation.targets.temperature}
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-400">
                <Droplets className="w-3.5 h-3.5 text-sky-500" />
                {recommendation.targets.humidity}
              </div>
              <div className="text-slate-600 dark:text-zinc-400">
                Свет: <span className="font-semibold">{recommendation.targets.lightCycle}</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500 mb-2">
              Критерии успеха
            </h4>
            <ul className="space-y-1">
              {recommendation.criteria.map((item) => (
                <li key={item} className="flex items-start gap-2 text-xs text-slate-700 dark:text-zinc-300">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500 mb-2">
              Следующие шаги в QBX
            </h4>
            <ul className="space-y-1">
              {recommendation.nextSteps.map((item) => (
                <li key={item} className="text-xs text-slate-700 dark:text-zinc-300 pl-3 border-l-2 border-violet-300 dark:border-violet-800">
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {recommendation.automationHints.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-500 mb-2">
                Подсказки по автоматизациям
              </h4>
              <ul className="space-y-1">
                {recommendation.automationHints.map((item) => (
                  <li key={item} className="text-xs text-slate-600 dark:text-zinc-400">
                    • {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setStep('form')}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl"
            >
              Изменить запрос
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
            >
              <Check className="w-3.5 h-3.5" />
              Создать «{recommendation.spaceNameSuggestion}»
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
