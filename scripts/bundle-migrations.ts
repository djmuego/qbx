#!/usr/bin/env tsx
/**
 * Bundle all SQL migrations into one file for Supabase SQL Editor.
 * Run: npm run db:bundle
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const migrationsDir = join(process.cwd(), 'supabase/migrations');
const outDir = join(process.cwd(), 'dist');
const outFile = join(outDir, 'all-migrations.sql');

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

const parts = files.map((file) => {
  const sql = readFileSync(join(migrationsDir, file), 'utf8').trim();
  return `-- ========== ${file} ==========\n\n${sql}\n`;
});

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, parts.join('\n'), 'utf8');

console.log(`Wrote ${files.length} migrations → ${outFile}`);
console.log('Paste into Supabase Dashboard → SQL Editor (or use npm run db:push after supabase link)');
