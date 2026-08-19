import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkspaceSubscription } from '../../../domain/commercial/subscription.types';
import { parseSubscriptionRow } from '../../../application/commercial/subscription-context';

export async function fetchWorkspaceSubscription(
  client: SupabaseClient,
  workspaceId: string,
): Promise<WorkspaceSubscription> {
  const { data, error } = await client.rpc('get_workspace_subscription', { ws_id: workspaceId });
  if (error) throw new Error(error.message);
  return parseSubscriptionRow((data ?? {}) as Record<string, unknown>, workspaceId);
}

export async function createCheckoutSession(
  client: SupabaseClient,
  workspaceId: string,
  priceId: string,
): Promise<{ url: string }> {
  const { data, error } = await client.functions.invoke('create-checkout-session', {
    body: { workspaceId, priceId },
  });
  if (error) throw new Error(error.message);
  const url = (data as { url?: string })?.url;
  if (!url) throw new Error('Checkout URL missing');
  return { url };
}

export async function createBillingPortalSession(
  client: SupabaseClient,
  workspaceId: string,
): Promise<{ url: string }> {
  const { data, error } = await client.functions.invoke('create-billing-portal', {
    body: { workspaceId },
  });
  if (error) throw new Error(error.message);
  const url = (data as { url?: string })?.url;
  if (!url) throw new Error('Portal URL missing');
  return { url };
}
