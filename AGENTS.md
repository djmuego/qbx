# QBX — Cursor Agent Context

## Roots

| Root | Role |
|------|------|
| Code | `/Users/alex/project/QBX` |
| Knowledge Store | `/Users/alex/project/Obsibian/Obsibian/QBX` |

**Current checkpoint:** Knowledge `wiki/synthesis/project-checkpoint-2026-08-19.md`

## Architecture

```
UI → Application → Domain → Repository → Adapter
UI → RuntimeService → QbxRuntime (1s) → AutomationEngine + DeviceGateway
```

React **never** reads Obsidian/Knowledge paths. Knowledge sync writes `src/mock/generated/` only.

| Store | SoT |
|-------|-----|
| Knowledge | `state/`, `raw/`, `wiki/` |
| App config (offline) | `LocalDemoDataLayer` → localStorage (`qbx_hardware_*` / `qbx_simulator_*`) |
| App config (logged in) | Supabase Postgres (`workspaces`, JSONB payloads) + RLS |
| Ephemeral runtime | `QbxRuntime` (outputs OFF after reload) |

## Invariants (do not break)

1. `npm run dev` = hardware — no fake sensors / ONLINE / telemetry.
2. `npm run dev:sim` = simulator only (header **SIM**).
3. 2D and 3D share one `SpaceMap`.
4. Spatial object ≠ Device (`deviceId` is a bind). Deleting a Device unbinds; deleting a placement does not delete hardware.
5. AI is advisory. SAFETY > AUTOMATION > AI. DeepSeek optional (`DEEPSEEK_API_KEY` in `.env`, never `VITE_`).
6. Runtime works without cloud. Runtime Core (Pass 2) is **frozen**.
7. Supabase: frontend only `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`; `service_role` never in Vite bundle.
8. Multi-tenant via `workspace_id` + RLS; roles Owner / Operator / Viewer enforced in DB + UI guards.

## Commands

```bash
npm run dev              # hardware mode — http://localhost:3000
npm run dev:sim          # simulator
npm run lint             # tsc --noEmit
npm run build
npm test
QBX_KNOWLEDGE_ROOT=/Users/alex/project/Obsibian/Obsibian/QBX npm run sync:state
npm run sync:agent-knowledge   # Obsidian wiki/agent → bundled Local Expert
npm run kb:sync                # Obsidian → Supabase pgvector (needs SERVICE_ROLE + OPENAI_API_KEY)
npm run lint:knowledge
npm run db:push                # linked Supabase project
npm run db:bundle              # dist/all-migrations.sql for SQL Editor
npm run verify:ops             # .env readiness
npm run verify:stripe          # Stripe price IDs + secrets
```

## Boot order

1. This file
2. Knowledge `AGENTS.md`
3. `wiki/index.md` + last 5 lines of `wiki/log.md`
4. Checkpoint `wiki/synthesis/project-checkpoint-2026-08-19.md`

## Frozen / next

- **Frozen:** Runtime Core, AutomationEngine internals (fix proven bugs only). **Hardware / Zigbee hub** — deferred until branded hub arrives.
- **Done:** Twin Controls ON/OFF/AUTO. Auth + Supabase workspaces. Platform Admin V4 + consciousness. **Platform Admin V5** (farm rename, member roles, audit filters, KB admin, AI farms tab). Commercial V1. Spatial Intelligence + heatmap. Account UX. **Knowledge Base RAG** (migrations 011–012, admin KB editor, `kb:sync`, hybrid retrieval, Twin AI Advisor widget with inline answers).
- **Next:** `npm run verify:ops` + `npm run db:push` (prod migrations). `npm run kb:sync` (needs `OPENAI_API_KEY`). Live Stripe (`npm run verify:stripe`, `scripts/STRIPE_SETUP.md`). External hub runtime mapping (MQTT→device) after hub transport. Hardware Pass 3 deferred (hub pending).

## Product phases

| Phase | Focus | Status |
|-------|--------|--------|
| 1 | Twin Controls (ON/OFF/AUTO) + Simulator | Done |
| 2 | Hardware Pass 3 (ESP32 Zigbee Bridge) | Deferred (hub pending) |
| 3 | Knowledge Base RAG + AI Advisor Widget | Done (011–012 + kb:sync + widget inline RAG) |

Knowledge workflow: `/Users/alex/project/Obsibian/Obsibian/QBX/AGENTS.md`
