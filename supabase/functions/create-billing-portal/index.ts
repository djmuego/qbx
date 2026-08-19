// Supabase Edge Function: create-billing-portal
// Deploy: supabase functions deploy create-billing-portal

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

  const { workspaceId } = await req.json();
  if (!workspaceId) {
    return new Response('Missing workspaceId', { status: 400, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader ?? '' } } },
  );

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return new Response('No Stripe customer', { status: 404, headers: corsHeaders });
  }

  const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:3000';
  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${siteUrl}/?tab=account`,
  });

  return new Response(JSON.stringify({ url: portal.url }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
