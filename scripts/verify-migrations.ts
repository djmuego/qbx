#!/usr/bin/env tsx
/**
 * List expected Supabase migrations for manual verification.
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'supabase/migrations');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

console.log('Expected migrations (apply in order):');
for (const file of files) {
  console.log(`  - supabase/migrations/${file}`);
}
console.log(`\nTotal: ${files.length} files`);
console.log('\nApply: npm run db:push  (requires supabase link)');
console.log('Or paste each file in Supabase SQL Editor — see scripts/SUPABASE_SETUP.md');
