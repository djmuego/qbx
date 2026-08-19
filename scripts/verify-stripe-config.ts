#!/usr/bin/env tsx
/**
 * Verify Stripe + commerce env for production checkout.
 * Run: npm run verify:stripe
 */
import { config as loadEnv } from 'dotenv';

loadEnv();

const checks: { name: string; ok: boolean; hint?: string }[] = [];

const monthly = process.env.VITE_STRIPE_PRO_MONTHLY_PRICE_ID?.trim();
const yearly = process.env.VITE_STRIPE_PRO_YEARLY_PRICE_ID?.trim();
const secret = process.env.STRIPE_SECRET_KEY?.trim();

checks.push({
  name: 'VITE_STRIPE_PRO_MONTHLY_PRICE_ID',
  ok: Boolean(monthly),
  hint: 'price_... from Stripe Dashboard',
});
checks.push({
  name: 'VITE_STRIPE_PRO_YEARLY_PRICE_ID',
  ok: Boolean(yearly),
  hint: 'price_... from Stripe Dashboard',
});
checks.push({
  name: 'STRIPE_SECRET_KEY (edge functions)',
  ok: Boolean(secret),
  hint: 'sk_test_... or sk_live_... — Supabase function secret only',
});
checks.push({
  name: 'VITE_SUPABASE_URL',
  ok: Boolean(process.env.VITE_SUPABASE_URL?.trim()),
});
checks.push({
  name: 'SUPABASE_SERVICE_ROLE_KEY',
  ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
});

let failed = 0;
for (const c of checks) {
  const mark = c.ok ? '✓' : '✗';
  if (!c.ok) failed += 1;
  console.log(`${mark} ${c.name}${c.hint && !c.ok ? ` — ${c.hint}` : ''}`);
}

if (failed > 0) {
  console.log('\nSee scripts/STRIPE_SETUP.md');
  process.exit(1);
}

console.log('\nStripe commerce env looks complete. Deploy edge functions:');
console.log('  supabase functions deploy create-checkout-session create-billing-portal stripe-webhook');
