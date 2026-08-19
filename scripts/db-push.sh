#!/usr/bin/env bash
# Apply all Supabase migrations (006–012) to linked project.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found. Install: https://supabase.com/docs/guides/cli"
  exit 1
fi

echo "Pushing migrations from supabase/migrations/ ..."
supabase db push

echo "Done. Verify with: npm run db:verify"
