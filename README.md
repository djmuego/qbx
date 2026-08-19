# QBX — Quantum Botanix

Controlled-environment agriculture platform: digital twin, hardware runtime, automations, and AI grow advisor.

## Quick start

```bash
npm install
cp .env.example .env   # add DEEPSEEK_API_KEY for AI (optional)
npm run dev:sim        # simulator — demo world, header shows SIM
npm run dev            # hardware mode — no fake sensors/telemetry
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Hardware mode (empty boot, real gateway) |
| `npm run dev:sim` | Simulator with seed data |
| `npm run lint` | TypeScript check |
| `npm test` | Vitest (290+ tests) |
| `npm run build` | Production bundle |
| `npm run sync:state` | Knowledge `state/` → `src/mock/generated/` |
| `npm run sync:agent-knowledge` | Obsidian wiki/agent → Local Expert bundle |
| `npm run kb:sync` | Obsidian → Supabase pgvector (needs service role + OpenAI) |
| `npm run db:bundle` | Single SQL file → `dist/all-migrations.sql` |
| `npm run db:push` | Apply migrations (Supabase CLI + linked project) |
| `npm run verify:ops` | Check `.env` for cloud/kb readiness |
| `npm run verify:stripe` | Check Stripe price IDs and secrets |

## Architecture

```
UI → Application → Domain → Repository → Adapter
UI → RuntimeService → QbxRuntime (1s) → AutomationEngine + DeviceGateway
```

- **Knowledge store** (Obsidian): separate from runtime — see companion vault workflow in `AGENTS.md`
- **Supabase** (optional): auth, workspaces, RLS, knowledge RAG — `scripts/SUPABASE_SETUP.md`
- **Integrations**: MQTT topic monitor + HA entity discovery (advisory; no fake hardware telemetry)
- **AI**: advisory only; SAFETY > AUTOMATION > AI

## Cloud setup (one-time)

```bash
# Fill .env — see .env.example and scripts/SUPABASE_SETUP.md
npm run verify:ops

# Migrations: paste dist/all-migrations.sql in Supabase SQL Editor, or:
supabase link --project-ref YOUR_REF && npm run db:push

# Knowledge index
QBX_KNOWLEDGE_ROOT=/path/to/Obsibian/QBX npm run kb:sync
```

Stripe: `scripts/STRIPE_SETUP.md` + `npm run verify:stripe`

## Invariants

1. `npm run dev` = hardware — no fake ONLINE / telemetry
2. 2D and 3D share one `SpaceMap`
3. Runtime Core is frozen — fix proven bugs only
4. Never put `service_role` or provider API keys in `VITE_*` env vars

## License

Proprietary — Quantum Botanix. All rights reserved.
