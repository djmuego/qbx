# Stripe production setup (QBX Pro)

## 1. Stripe Dashboard

1. Create product **QBX Pro** with two prices:
   - Monthly: $9.99 (`price_...`)
   - Yearly: $99 (`price_...`)
2. Enable Customer Portal (Billing → Customer portal).
3. Create webhook endpoint pointing to Supabase Edge Function (see below).

## 2. Supabase Edge Functions

From project root with [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase link --project-ref YOUR_REF

supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  STRIPE_PRO_MONTHLY_PRICE_ID=price_... \
  STRIPE_PRO_YEARLY_PRICE_ID=price_... \
  SITE_URL=https://app.quantumbotanix.com

supabase functions deploy create-checkout-session create-billing-portal stripe-webhook
```

Webhook URL: `https://YOUR_REF.supabase.co/functions/v1/stripe-webhook`

Events to subscribe: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

## 3. App environment (Vite)

```env
VITE_STRIPE_PRO_MONTHLY_PRICE_ID=price_...
VITE_STRIPE_PRO_YEARLY_PRICE_ID=price_...
VITE_QBX_COMMERCE_MODE=enforce
```

`isStripeConfigured()` in the app requires both price IDs. Commerce stays off in `npm run dev:sim` and local auth.

## 4. Verify

1. Log in → Account → Billing → Upgrade to Pro.
2. Complete Stripe Checkout (use test mode first: `sk_test_` / test prices).
3. Webhook updates `subscriptions` table → reload app → Pro features unlocked.
4. **Manage in Stripe** opens Customer Portal when `stripe_customer_id` exists.

## Safety

- Never put `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` in `VITE_*` variables.
- Runtime Core and Safety do not depend on subscription tier.
