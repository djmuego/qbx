#!/usr/bin/env tsx
import { config as loadEnv } from 'dotenv';

loadEnv();

function present(name: string): boolean {
  const value = process.env[name];
  return Boolean(value && value.trim().length > 0);
}

const checks = [
  { name: 'VITE_SUPABASE_URL', ok: present('VITE_SUPABASE_URL') },
  { name: 'VITE_SUPABASE_ANON_KEY', ok: present('VITE_SUPABASE_ANON_KEY') },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', ok: present('SUPABASE_SERVICE_ROLE_KEY') },
  { name: 'OPENAI_API_KEY (kb:sync)', ok: present('OPENAI_API_KEY') },
  { name: 'DEEPSEEK_API_KEY (grow agent)', ok: present('DEEPSEEK_API_KEY') },
];

console.log('Migrations: npm run db:bundle → dist/all-migrations.sql (SQL Editor)');
console.log('Or: supabase link && npm run db:push\n');

let failed = 0;
for (const c of checks) {
  const mark = c.ok ? '✓' : '✗';
  if (!c.ok) failed += 1;
  console.log(`${mark} ${c.name}${!c.ok ? ' (empty or missing in .env)' : ''}`);
}

console.log('\nCommands:');
console.log('  npm run db:bundle');
console.log('  QBX_KNOWLEDGE_ROOT=... npm run kb:sync');
console.log('  npm run verify:stripe');

if (failed > 0) {
  console.log(`\n${failed} check(s) need values in .env — see scripts/SUPABASE_SETUP.md`);
  process.exit(1);
}
