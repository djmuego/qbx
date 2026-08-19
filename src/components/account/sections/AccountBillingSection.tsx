import React, { useState } from 'react';
import { AccountCard } from '../AccountShell';
import { useLocale } from '../../../i18n/LocaleContext';
import { useSubscription } from '../../../context/SubscriptionContext';
import { useAuth } from '../../../context/AuthContext';
import { getSupabaseClient } from '../../../infrastructure/supabase/client';
import { createBillingPortalSession } from '../../../data/adapters/supabase/billing-api';
import { EntitlementsService } from '../../../domain/commercial/entitlements';
import { subscriptionToContext } from '../../../application/commercial/subscription-context';
import { cloudHistoryRetentionLabel } from '../../../application/commercial/journal-retention';
import { QBX_PRO_MONTHLY_USD, isStripeConfigured } from '../../../config/commerce.config';

export const AccountBillingSection: React.FC = () => {
  const { t } = useLocale();
  const { subscription, hasPro, enforced, refreshSubscription, requestUpgrade } = useSubscription();
  const { activeWorkspaceId } = useAuth();
  const supabase = getSupabaseClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trialEnds = subscription?.trialEndsAt ? new Date(subscription.trialEndsAt) : null;
  const trialActive = subscription?.status === 'trialing' && trialEnds && trialEnds > new Date();

  const planLabel = hasPro
    ? trialActive
      ? t('billing.planTrial', 'Pro Trial')
      : subscription?.tier === 'pro'
        ? t('billing.planPro', 'QBX Pro')
        : t('billing.planPro', 'QBX Pro')
    : t('billing.planFree', 'Free');

  const openPortal = async () => {
    if (!supabase || !activeWorkspaceId) return;
    setBusy(true);
    setError(null);
    try {
      const { url } = await createBillingPortalSession(supabase, activeWorkspaceId);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Portal error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <AccountCard
        title={t('billing.title', 'Подписка')}
        description={t('billing.hint', 'Биллинг привязан к workspace (ферме). Runtime и Safety не зависят от тарифа.')}
      >
        {!enforced && (
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2 mb-3">
            {t('billing.commerceOff', 'Commerce выключен (sim / local / VITE_QBX_COMMERCE_MODE=off) — все Pro-фичи доступны.')}
          </p>
        )}

        {enforced && (
          <p
            className={`text-[11px] rounded-xl px-3 py-2 mb-3 border ${
              isStripeConfigured()
                ? 'text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800'
                : 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
            }`}
          >
            {isStripeConfigured()
              ? t('billing.stripeReady', 'Stripe keys настроены — checkout и portal доступны.')
              : t('billing.stripeMissing', 'Stripe не настроен — см. scripts/STRIPE_SETUP.md')}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
              hasPro
                ? 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200'
                : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300'
            }`}
          >
            {planLabel}
          </span>
          {trialActive && trialEnds && (
            <span className="text-[11px] text-slate-500">
              {t('billing.trialUntil', 'Trial до')} {trialEnds.toLocaleDateString()}
            </span>
          )}
          {subscription?.cancelAtPeriodEnd && (
            <span className="text-[11px] text-amber-600">{t('billing.cancelPending', 'Отмена в конце периода')}</span>
          )}
          {subscription?.hubLifetime && (
            <span className="text-[11px] font-bold text-violet-600 dark:text-violet-300">
              {t('billing.hubLifetime', 'Hub Lifetime Pro')}
            </span>
          )}
        </div>

        {subscription && enforced && (
          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-3">
            {t('billing.maxSpaces', 'Лимит пространств')}:{' '}
            {EntitlementsService.getMaxSpaces(subscriptionToContext(subscription))}
            {' · '}
            {t('billing.cloudJournal', 'Облачный журнал')}: {cloudHistoryRetentionLabel()}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          {!hasPro && (
            <button
              type="button"
              onClick={() => requestUpgrade()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white"
            >
              {t('billing.upgradeCta', 'Перейти на Pro')} — ${QBX_PRO_MONTHLY_USD}/мес
            </button>
          )}
          {hasPro && subscription?.stripeCustomerId && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void openPortal()}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-zinc-700"
            >
              {t('billing.manageStripe', 'Управление в Stripe')}
            </button>
          )}
          <button
            type="button"
            onClick={() => void refreshSubscription()}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400"
          >
            {t('billing.refresh', 'Обновить статус')}
          </button>
        </div>

        {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
      </AccountCard>
    </div>
  );
};
