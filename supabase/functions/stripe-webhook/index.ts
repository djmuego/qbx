// Supabase Edge Function: stripe-webhook
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2023-10-16' });
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const upsertPro = async (workspaceId: string, customerId: string, subscriptionId: string, sub: Stripe.Subscription) => {
    const status =
      sub.status === 'trialing'
        ? 'trialing'
        : sub.status === 'past_due' || sub.status === 'unpaid'
          ? 'past_due'
          : sub.status === 'canceled'
            ? 'canceled'
            : 'active';
    await admin.from('subscriptions').upsert({
      workspace_id: workspaceId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      tier: status === 'canceled' ? 'free' : 'pro',
      status,
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: sub.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    });
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.metadata?.workspace_id;
      if (!workspaceId || !session.subscription) break;
      const sub = await stripe.subscriptions.retrieve(String(session.subscription));
      await upsertPro(workspaceId, String(session.customer), String(session.subscription), sub);
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const workspaceId = sub.metadata?.workspace_id;
      if (!workspaceId) break;
      await upsertPro(workspaceId, String(sub.customer), sub.id, sub);
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const workspaceId = sub.metadata?.workspace_id;
      if (!workspaceId) break;
      await admin
        .from('subscriptions')
        .update({ tier: 'free', status: 'canceled', stripe_subscription_id: null, updated_at: new Date().toISOString() })
        .eq('workspace_id', workspaceId);
      break;
    }
    default:
      break;
  }

  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
});
