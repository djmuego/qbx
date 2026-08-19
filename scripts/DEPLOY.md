# Deploy QBX (Vercel)

Static Vite SPA. MQTT/HA/Tuya **dev proxy** (`/api/integrations/*`) is the Vite plugin — it is **not** included in the Vercel static build. Production health-checks need a Node host later (or keep them for local `npm run dev`).

## 1. Frontend

```bash
npm run build
```

Vercel: import `djmuego/qbx`, framework Vite, output `dist`.

Environment variables (Production):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PRO_MONTHLY_PRICE_ID=
VITE_STRIPE_PRO_YEARLY_PRICE_ID=
```

Never put `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, or LLM keys in `VITE_*`.

Auth: Supabase → Authentication → URL configuration

- Site URL = `https://<your-app>.vercel.app`
- Redirect URLs = that origin

## 2. Database

```bash
npm run db:bundle   # dist/all-migrations.sql → SQL Editor
# or
supabase link --project-ref YOUR_REF
npm run db:push
```

Includes `013_grow_runs.sql` (GrowRun cloud sync).

## 3. Knowledge + Stripe

```bash
npm run verify:ops
npm run verify:stripe
QBX_KNOWLEDGE_ROOT=/path/to/Obsibian/QBX npm run kb:sync
```

Stripe edge functions: `scripts/STRIPE_SETUP.md`.

## 4. Smoke

- Open production URL, sign in
- Create space, start GrowRun (syncs if logged in)
- Account → Integrations (MQTT/HA/Tuya forms save; live proxy tests work on `npm run dev`)
