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
| `npm test` | Vitest (280+ tests) |
| `npm run build` | Production bundle |
| `npm run sync:state` | Knowledge `state/` → `src/mock/generated/` |
| `npm run sync:agent-knowledge` | Obsidian wiki/agent → Local Expert bundle |
| `npm run kb:sync` | Obsidian → Supabase pgvector (needs service role) |

## Architecture

```
UI → Application → Domain → Repository → Adapter
UI → RuntimeService → QbxRuntime (1s) → AutomationEngine + DeviceGateway
```

- **Knowledge store** (Obsidian): separate from runtime — see companion vault workflow in `AGENTS.md`
- **Supabase** (optional): auth, workspaces, RLS, knowledge RAG — `scripts/SUPABASE_SETUP.md`
- **AI**: advisory only; SAFETY > AUTOMATION > AI

## Invariants

1. `npm run dev` = hardware — no fake ONLINE / telemetry
2. 2D and 3D share one `SpaceMap`
3. Runtime Core is frozen — fix proven bugs only
4. Never put `service_role` or provider API keys in `VITE_*` env vars

## License

Proprietary — Quantum Botanix. All rights reserved.
