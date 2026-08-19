import React from 'react';
import { Bot, Box, Layers, Sparkles, Zap } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useLocale } from '../../i18n/LocaleContext';
import type { FeatureKey, WorkspaceSubscription } from '../../domain/commercial/subscription.types';
import {
  QBX_PRO_MONTHLY_USD,
  QBX_PRO_YEARLY_USD,
  STRIPE_PRO_MONTHLY_PRICE_ID,
  STRIPE_PRO_YEARLY_PRICE_ID,
  isStripeConfigured,
} from '../../config/commerce.config';
import { useAuth } from '../../context/AuthContext';
import { getSupabaseClient } from '../../infrastructure/supabase/client';
import { createCheckoutSession } from '../../data/adapters/supabase/billing-api';

interface UpgradeModalProps {
  open: boolean;
  feature?: FeatureKey;
  subscription: WorkspaceSubscription | null;
  hasPro: boolean;
  onClose: () => void;
}

const FEATURE_COPY: Partial<Record<FeatureKey, { title: string; detail: string }>> = {
  '3D_DIGITAL_TWIN': {
    title: '3D Digital Twin',
    detail: 'Полноценный 3D-редактор пространства, тепловые карты и пространственный анализ.',
  },
  AI_GROW_ADVISOR: {
    title: 'QBX AI Grow Advisor',
    detail: 'Сценарии под сорт, предиктивные подсказки и Space Advisor.',
  },
  UNLIMITED_SPACES: {
    title: 'Неограниченные пространства',
    detail: 'Несколько боксов, теплиц и зон в одной ферме.',
  },
  SPATIAL_HEATMAP: {
    title: 'Теплокарта',
    detail: 'Интерполяция T°C и RH по карте пространства.',
  },
  SPATIAL_INTELLIGENCE: {
    title: 'Пространственный анализ',
    detail: 'Рекомендации по датчикам и зонам без автодвижения объектов.',
  },
  EXTERNAL_HUB_INTEGRATION: {
    title: 'Сторонние хабы',
    detail: 'Home Assistant, MQTT, Tuya и мосты без белого IP.',
  },
  CLOUD_GROW_JOURNAL: {
    title: 'Облачный Grow Journal',
    detail: 'Полная история грова и телеметрии в облаке.',
  },
};

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ open, feature, subscription, hasPro, onClose }) => {
  const { t } = useLocale();
  const { activeWorkspaceId } = useAuth();
  const supabase = getSupabaseClient();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!open || hasPro) return null;

  const copy = feature ? FEATURE_COPY[feature] : null;
  const trialEnds = subscription?.trialEndsAt ? new Date(subscription.trialEndsAt) : null;
  const trialExpired = trialEnds && trialEnds.getTime() < Date.now();

  const startCheckout = async (priceId: string) => {
    if (!isStripeConfigured()) {
      setError(t('billing.stripeNotConfigured', 'Stripe ещё не настроен. Добавьте Edge Functions и price ID.'));
      return;
    }
    if (!supabase || !activeWorkspaceId || !priceId) {
      setError(t('billing.stripeNotConfigured', 'Stripe ещё не настроен. Добавьте Edge Functions и price ID.'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { url } = await createCheckoutSession(supabase, activeWorkspaceId, priceId);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={t('billing.upgradeTitle', 'QBX Pro')}
      subtitle={t('billing.upgradeSubtitle', 'Hardware-agnostic гровинг с 3D, AI и облаком')}
      maxWidth="md"
    >
      <div className="space-y-4">
        {copy && (
          <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-900">
            <p className="text-sm font-bold text-slate-900 dark:text-white">{copy.title}</p>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1">{copy.detail}</p>
          </div>
        )}

        {trialExpired && (
          <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2">
            {t('billing.trialEnded', '14-дневный Pro trial завершён. Twin Controls и локальная автоматика работают как прежде.')}
          </p>
        )}

        <ul className="grid sm:grid-cols-2 gap-2 text-xs">
          {[
            { icon: <Box className="w-4 h-4" />, text: t('billing.perk3d', '3D Digital Twin') },
            { icon: <Bot className="w-4 h-4" />, text: t('billing.perkAi', 'AI Grow Advisor') },
            { icon: <Layers className="w-4 h-4" />, text: t('billing.perkSpaces', '∞ пространств') },
            { icon: <Zap className="w-4 h-4" />, text: t('billing.perkHubs', 'HA / MQTT / Tuya') },
          ].map((item) => (
            <li
              key={item.text}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300"
            >
              <span className="text-violet-600">{item.icon}</span>
              {item.text}
            </li>
          ))}
        </ul>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void startCheckout(STRIPE_PRO_MONTHLY_PRICE_ID)}
            className="flex-1 py-3 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4 inline mr-1.5" />
            Pro ${QBX_PRO_MONTHLY_USD}/мес
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void startCheckout(STRIPE_PRO_YEARLY_PRICE_ID)}
            className="flex-1 py-3 rounded-xl text-sm font-semibold border border-slate-200 dark:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-60"
          >
            ${QBX_PRO_YEARLY_USD}/год
          </button>
        </div>

        {error && <p className="text-xs text-rose-600">{error}</p>}

        <p className="text-[10px] text-slate-400 leading-relaxed">
          {t(
            'billing.runtimeNote',
            'Runtime Core и Safety не зависят от подписки: локальная автоматика и Twin Controls работают всегда.',
          )}
        </p>
      </div>
    </Modal>
  );
};
