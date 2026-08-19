# Supabase setup for QBX

## 1. Create project

1. Go to [supabase.com](https://supabase.com) → New project
2. Note **Project URL** and **anon public** key (Settings → API)

## 2. Run migrations (SQL Editor)

Run in order:

1. `supabase/migrations/001_initial_workspace_schema.sql`
2. `supabase/migrations/002_profile_email_invites.sql`
3. `supabase/migrations/003_platform_admin.sql`
4. `supabase/migrations/004_admin_v2.sql`
5. `supabase/migrations/005_subscriptions.sql`
6. `supabase/migrations/006_admin_v3_gdpr.sql`
7. `supabase/migrations/007_commercial_admin.sql`
8. `supabase/migrations/008_workspace_integrations.sql`
9. `supabase/migrations/009_admin_v4_expanded.sql`
10. `supabase/migrations/010_admin_ai_consciousness.sql`
11. `supabase/migrations/011_knowledge_rag.sql` — pgvector knowledge base + admin RPCs
12. `supabase/migrations/012_admin_ops_v5.sql` — admin V5: farm rename, member roles, audit filters, KB categories stats, AI farms overview

Or with Supabase CLI:

```bash
supabase link --project-ref YOUR_REF
supabase db push
```

## 3. Auth settings

Authentication → Providers → Email: **enabled** (password only, no magic link required)

For development you may disable **Confirm email** in Supabase → Authentication → Providers → Email — then users can sign in immediately after registration.

Authentication → URL configuration:

- Site URL: `http://localhost:3000` (dev) or your production URL
- Redirect URLs: `http://localhost:3000`, `http://localhost:3000/reset-password`, production URLs

## 4. App `.env`

```env
VITE_SUPABASE_URL=https://YOUR_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_QBX_REQUIRE_AUTH=true
VITE_QBX_DATA_BACKEND=supabase
```

Without valid keys the app shows a setup screen — **no anonymous access**.

For local simulator without login: `npm run dev:sim` (sets `VITE_QBX_REQUIRE_AUTH=false`).

`SUPABASE_SERVICE_ROLE_KEY` — only for server/CI scripts, never in Vite.

### Knowledge Base RAG (`kb:sync`)

After migration `011`:

```bash
export SUPABASE_URL=https://YOUR_REF.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJ...
export OPENAI_API_KEY=sk-...   # text-embedding-3-small
QBX_KNOWLEDGE_ROOT=/path/to/Obsibian/QBX npm run kb:sync
```

Syncs `wiki/agent/` + `wiki/knowledge-vault/` → `knowledge_articles` + pgvector embeddings.

## 5. Verify

```bash
npm run dev
```

- Register a new user → login screen appears
- After signup: default workspace **My Farm** is created
- Settings → grow spaces; **Account** tab → profile, members, import
- Data persists after reload (Postgres, not localStorage)

## 6. Stripe billing (optional)

1. Create products/prices in Stripe Dashboard ($9.99/mo, $99/yr).
2. Deploy edge functions:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_... STRIPE_WEBHOOK_SECRET=whsec_... SITE_URL=https://your-app.com
supabase functions deploy create-checkout-session create-billing-portal stripe-webhook
```

3. Set in app `.env`:

```env
VITE_STRIPE_PRO_MONTHLY_PRICE_ID=price_...
VITE_STRIPE_PRO_YEARLY_PRICE_ID=price_...
VITE_QBX_COMMERCE_MODE=enforce
```

4. Stripe webhook endpoint: `https://<project>.supabase.co/functions/v1/stripe-webhook`

New workspaces get a **14-day Pro trial** automatically (`subscriptions` table).


| Role | Can edit devices/maps/automations |
|------|-----------------------------------|
| owner | yes + members + delete workspace |
| operator | yes |
| viewer | read-only |

Invite members by **email** (user must register first).

## Platform admin (super-admin)

After migrations, register your account, then run **once** in SQL Editor:

```sql
select public.bootstrap_platform_admin_by_email('alexmuego@gmail.com');
```

Then reload the app → header button **Админка** (platform admin only). Opens full-screen admin modal.

Platform admins: users/workspaces/subscriptions, ban/delete users, farm AI prompts, platform consciousness, audit export. Farm team roles (owner/operator/viewer) are separate.

Local dev (`VITE_QBX_AUTH_BACKEND=local`): seed admin from `VITE_QBX_SEED_ADMIN_*` is auto platform admin.
