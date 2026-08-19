import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useLocale } from '../../i18n/LocaleContext';
import { isSimulatorMode } from '../../config/runtime-mode';
import { X, Zap } from '../common/Icons';

const DISMISS_KEY = 'qbx_shared_twin_controls_hint_dismissed';

export const TwinControlsOnboarding: React.FC = () => {
  const { allOutputsInCurrentSpace } = useApp();
  const { t } = useLocale();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  if (!isSimulatorMode() || dismissed || allOutputsInCurrentSpace.length === 0) {
    return null;
  }

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="rounded-2xl border border-sky-200/80 dark:border-sky-900/60 bg-sky-50/80 dark:bg-sky-950/30 p-4 sm:p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-sky-600 text-white shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {t('twinControl.onboardingTitle', 'Попробуйте Twin Controls')}
            </h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">
              {t(
                'twinControl.onboardingBody',
                'На карточках оборудования и на карте: Выкл / Вкл / Авто. В режиме Авто правило «Демо Twin: пульс света» включает боковую подсветку каждые 2 мин на 45 сек.',
              )}
            </p>
            <ol className="mt-2.5 space-y-1 text-[11px] text-slate-600 dark:text-zinc-400 list-decimal list-inside">
              <li>{t('twinControl.onboardingStep1', 'Выберите «Боковая подсветка» → режим Авто')}</li>
              <li>{t('twinControl.onboardingStep2', 'Подождите до 2 мин — свет включится по правилу')}</li>
              <li>{t('twinControl.onboardingStep3', 'Переключите на Вкл/Выкл — автоматика приостановится')}</li>
            </ol>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-white/60 dark:hover:bg-zinc-800/60 shrink-0"
          aria-label={t('common.close', 'Закрыть')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
