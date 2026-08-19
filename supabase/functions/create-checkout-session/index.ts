// Supabase Edge Function: create-checkout-session
// Deploy: supabase functions deploy create-checkout-session
// Secrets: STRIPE_SECRET_KEY, STRIPE_PRO_MONTHLY_PRICE_ID, STRIPE_PRO_YEARLY_PRICE_ID, SUPABASE_SERVICE_ROLE_KEY

import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2023-10-16' });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  const { workspaceId, priceId } = await req.json();
  if (!workspaceId || !priceId) {
    return new Response('Missing workspaceId or priceId', { status: 400, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader ?? '' } } },
  );
  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userData.user.id)
    .maybeSingle();
  if (!member || !['owner', 'admin'].includes(member.role)) {
    return new Response('Forbidden', { status: 403, headers: corsHeaders });
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  let customerId = sub?.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData.user.email,
      metadata: { workspace_id: workspaceId, user_id: userData.user.id },
    });
    customerId = customer.id;
    await admin.rpc('set_workspace_stripe_customer', {
      ws_id: workspaceId,
      customer_id: customerId,
    });
  }

  const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:3000';
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${siteUrl}/?billing=success&tab=account`,
    cancel_url: `${siteUrl}/?billing=cancel&tab=account`,
    metadata: { workspace_id: workspaceId },
    subscription_data: { metadata: { workspace_id: workspaceId } },
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
