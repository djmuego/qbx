#!/usr/bin/env bash
# Apply all Supabase migrations to linked project.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Pushing migrations from supabase/migrations/ ..."

if command -v supabase >/dev/null 2>&1; then
  supabase db push
elif command -v npx >/dev/null 2>&1; then
  echo "supabase CLI not in PATH — trying npx supabase@latest ..."
  npx --yes supabase@latest db push
else
  echo "supabase CLI not found. Install: https://supabase.com/docs/guides/cli"
  echo "Or run SQL files manually — see scripts/SUPABASE_SETUP.md"
  exit 1
fi

echo "Done. Verify with: npm run db:verify"
