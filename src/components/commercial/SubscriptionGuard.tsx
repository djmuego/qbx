import React from 'react';
import { Lock } from 'lucide-react';
import type { FeatureKey } from '../../domain/commercial/subscription.types';
import { useSubscriptionGuard } from '../../context/SubscriptionContext';
import { useLocale } from '../../i18n/LocaleContext';

interface SubscriptionGuardProps {
  feature: FeatureKey;
  children: React.ReactNode;
  /** When true, replaces children with locked overlay instead of hiding. */
  overlay?: boolean;
  className?: string;
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
  feature,
  children,
  overlay = true,
  className = '',
}) => {
  const { allowed, requestAccess } = useSubscriptionGuard(feature);
  const { t } = useLocale();

  if (allowed) return <>{children}</>;

  if (!overlay) {
    return (
      <button
        type="button"
        onClick={requestAccess}
        className={`inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 ${className}`}
      >
        <Lock className="w-3.5 h-3.5" />
        {t('billing.unlockPro', 'QBX Pro')}
      </button>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="pointer-events-none select-none opacity-40 blur-[1px]">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center p-4 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-[2px] rounded-2xl">
        <button
          type="button"
          onClick={requestAccess}
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-lg inline-flex items-center gap-2"
        >
          <Lock className="w-4 h-4" />
          {t('billing.unlockCta', 'Разблокировать в QBX Pro')}
        </button>
      </div>
    </div>
  );
};
