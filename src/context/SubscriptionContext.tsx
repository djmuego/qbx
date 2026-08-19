import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { getSupabaseClient } from '../infrastructure/supabase/client';
import { isCommerceEnforced } from '../config/commerce.config';
import type { FeatureKey, WorkspaceSubscription } from '../domain/commercial/subscription.types';
import { EntitlementsService } from '../domain/commercial/entitlements';
import {
  subscriptionToContext,
  UNLOCKED_SUBSCRIPTION_CONTEXT,
} from '../application/commercial/subscription-context';
import { fetchWorkspaceSubscription } from '../data/adapters/supabase/billing-api';
import { getLocalWorkspaceSubscription } from '../infrastructure/auth/local-subscription.store';
import { UpgradeModal } from '../components/commercial/UpgradeModal';
import { setJournalRetentionContext } from '../application/commercial/journal-retention';

interface SubscriptionContextValue {
  loading: boolean;
  enforced: boolean;
  subscription: WorkspaceSubscription | null;
  hasPro: boolean;
  isFeatureAvailable: (feature: FeatureKey) => boolean;
  canAddSpace: (currentCount: number) => boolean;
  maxSpaces: number;
  refreshSubscription: () => Promise<void>;
  requestUpgrade: (feature?: FeatureKey) => void;
}

const SubscriptionCtx = createContext<SubscriptionContextValue | null>(null);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeWorkspaceId, localAuthEnabled, supabaseEnabled } = useAuth();
  const supabase = getSupabaseClient();
  const enforced = isCommerceEnforced();
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<WorkspaceSubscription | null>(null);
  const [upgradeFeature, setUpgradeFeature] = useState<FeatureKey | undefined>();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const load = useCallback(async () => {
    if (!activeWorkspaceId) {
      setSubscription(null);
      return;
    }
    if (!enforced) {
      setSubscription({
        workspaceId: activeWorkspaceId,
        tier: 'pro',
        status: 'active',
        trialEndsAt: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        stripeCustomerId: null,
        hubLifetime: false,
      });
      return;
    }
    setLoading(true);
    try {
      if (localAuthEnabled) {
        setSubscription(getLocalWorkspaceSubscription(activeWorkspaceId));
      } else if (supabase && supabaseEnabled) {
        setSubscription(await fetchWorkspaceSubscription(supabase, activeWorkspaceId));
      }
    } catch {
      setSubscription(getLocalWorkspaceSubscription(activeWorkspaceId));
    } finally {
      setLoading(false);
    }
  }, [activeWorkspaceId, enforced, localAuthEnabled, supabase, supabaseEnabled]);

  const entitlementsCtx = useMemo(() => {
    if (!enforced) return UNLOCKED_SUBSCRIPTION_CONTEXT;
    if (!subscription) {
      return { tier: 'free' as const, status: 'canceled' as const, trialEndsAt: null };
    }
    return subscriptionToContext(subscription);
  }, [enforced, subscription]);

  const hasPro = EntitlementsService.hasProAccess(entitlementsCtx);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setJournalRetentionContext({
      subscription: entitlementsCtx,
      enforced,
    });
  }, [entitlementsCtx, enforced]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') === 'success') {
      void load();
      params.delete('billing');
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
      window.history.replaceState({}, '', next);
    }
  }, [load]);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      loading,
      enforced,
      subscription,
      hasPro,
      isFeatureAvailable: (feature) =>
        !enforced || EntitlementsService.isFeatureAvailable(feature, entitlementsCtx),
      canAddSpace: (count) => !enforced || EntitlementsService.canAddSpace(count, entitlementsCtx),
      maxSpaces: enforced ? EntitlementsService.getMaxSpaces(entitlementsCtx) : 999,
      refreshSubscription: load,
      requestUpgrade: (feature) => {
        setUpgradeFeature(feature);
        setUpgradeOpen(true);
      },
    }),
    [loading, enforced, subscription, hasPro, entitlementsCtx, load],
  );

  return (
    <SubscriptionCtx.Provider value={value}>
      {children}
      <UpgradeModal
        open={upgradeOpen}
        feature={upgradeFeature}
        subscription={subscription}
        hasPro={hasPro}
        onClose={() => setUpgradeOpen(false)}
      />
    </SubscriptionCtx.Provider>
  );
};

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionCtx);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}

export function useSubscriptionGuard(feature: FeatureKey) {
  const { isFeatureAvailable, requestUpgrade } = useSubscription();
  const allowed = isFeatureAvailable(feature);
  return {
    allowed,
    requestAccess: () => requestUpgrade(feature),
  };
}
