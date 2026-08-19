#!/usr/bin/env tsx
/**
 * Sync Obsidian / Markdown knowledge vault → Supabase pgvector (production RAG index).
 *
 * Sources (under QBX_KNOWLEDGE_ROOT):
 *   wiki/agent/ (recursive .md)
 *   wiki/knowledge-vault/ (recursive .md)
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY (embeddings)
 */
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatter } from './knowledge/parse-agent-markdown.ts';
import { chunkMarkdown } from '../src/application/ai/knowledge/knowledge-chunker.ts';

loadEnv();

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const knowledgeRoot = resolve(process.env.QBX_KNOWLEDGE_ROOT || join(projectRoot, '../Obsibian/Obsibian/QBX'));

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIM = 1536;

interface VaultDoc {
  filePath: string;
  slug: string;
  title: string;
  categorySlug: string;
  tags: string[];
  body: string;
  isPublished: boolean;
}

const CATEGORY_BY_FOLDER: Record<string, string> = {
  '00-foundations': 'climate',
  '01-plant-physiology': 'climate',
  '02-environment': 'climate',
  '03-lighting': 'lighting',
  '04-irrigation': 'hydroponics',
  '05-root-zone': 'hydroponics',
  '06-nutrition': 'nutrition',
  '07-co2': 'climate',
  '08-crop-steering': 'cultivars',
  '09-stress': 'defects',
  '11-ipm': 'defects',
  '12-crops': 'cultivars',
  '15-automation': 'climate',
  agronomy: 'climate',
  deficiencies: 'defects',
  hardware: 'hydroponics',
};

function fail(msg: string): never {
  console.error(`sync-knowledge: ${msg}`);
  process.exit(1);
}

function walkMarkdown(dir: string): string[] {
  const out: string[] = [];
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walkMarkdown(full));
      continue;
    }
    if (entry.endsWith('.md') && entry !== 'index.md' && entry !== 'README.md') {
      out.push(full);
    }
  }
  return out;
}

function slugFromPath(root: string, filePath: string): string {
  const rel = relative(root, filePath).replace(/\.md$/, '');
  return rel.replace(/\//g, '--').toLowerCase();
}

function inferCategory(filePath: string, meta: Record<string, unknown>): string {
  const explicit = meta.kbCategory ?? meta.category;
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim();
  const rel = filePath.replace(/\\/g, '/');
  for (const [folder, cat] of Object.entries(CATEGORY_BY_FOLDER)) {
    if (rel.includes(`/${folder}/`) || rel.includes(`knowledge-vault/${folder}/`)) return cat;
  }
  return 'climate';
}

function parseVaultDoc(root: string, filePath: string): VaultDoc {
  const raw = readFileSync(filePath, 'utf8');
  const { meta, body } = parseFrontmatter(raw);
  const titleMatch = body.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1]?.trim() || basename(filePath, '.md');
  const slug = (meta.slug as string | undefined) || slugFromPath(root, filePath);
  const tags = Array.isArray(meta.topics) ? meta.topics.map(String) : [];
  const trust = String(meta.trust ?? 'PROJECT_DECISION');
  return {
    filePath,
    slug: slug.toLowerCase(),
    title,
    categorySlug: inferCategory(filePath, meta as Record<string, unknown>),
    tags,
    body: body.trim(),
    isPublished: trust !== 'UNVERIFIED',
  };
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) fail('OPENAI_API_KEY required for embeddings');

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
    data?: { embedding: number[] }[];
  };
  if (!response.ok) fail(payload.error?.message ?? `OpenAI embeddings ${response.status}`);

  const vectors = (payload.data ?? []).map((d) => d.embedding);
  for (const v of vectors) {
    if (v.length !== EMBEDDING_DIM) fail(`Unexpected embedding dim ${v.length}`);
  }
  return vectors;
}

async function main() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    fail('Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
  }

  const agentDir = join(knowledgeRoot, 'wiki/agent');
  const vaultDir = join(knowledgeRoot, 'wiki/knowledge-vault');
  const fileEntries: { root: string; file: string }[] = [];
  if (statSync(agentDir, { throwIfNoEntry: false })?.isDirectory()) {
    walkMarkdown(agentDir).forEach((f) => fileEntries.push({ root: agentDir, file: f }));
  }
  if (statSync(vaultDir, { throwIfNoEntry: false })?.isDirectory()) {
    walkMarkdown(vaultDir).forEach((f) => fileEntries.push({ root: vaultDir, file: f }));
  }

  if (fileEntries.length === 0) {
    fail(`No knowledge sources under ${knowledgeRoot}/wiki/agent or wiki/knowledge-vault`);
  }

  const docs = fileEntries.map(({ root, file }) => parseVaultDoc(root, file));

  console.log(`Found ${docs.length} markdown documents`);

  const client = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: categories, error: catErr } = await client.from('knowledge_categories').select('id, slug');
  if (catErr) fail(catErr.message);
  const catBySlug = new Map((categories ?? []).map((c) => [c.slug, c.id]));

  const report: { slug: string; chunks: number; status: string }[] = [];

  for (const doc of docs) {
    const categoryId = catBySlug.get(doc.categorySlug) ?? null;

    const { data: existing } = await client
      .from('knowledge_articles')
      .select('id')
      .eq('slug', doc.slug)
      .maybeSingle();

    const row = {
      category_id: categoryId,
      title: doc.title,
      slug: doc.slug,
      content_markdown: doc.body,
      tags: doc.tags,
      is_published: doc.isPublished,
      updated_at: new Date().toISOString(),
    };

    let articleId: string;
    if (existing?.id) {
      const { error } = await client.from('knowledge_articles').update(row).eq('id', existing.id);
      if (error) fail(error.message);
      articleId = existing.id;
    } else {
      const { data: inserted, error } = await client.from('knowledge_articles').insert(row).select('id').single();
      if (error) fail(error.message);
      articleId = inserted.id;
    }

    const chunks = chunkMarkdown(doc.body);
    await client.from('knowledge_embeddings').delete().eq('article_id', articleId);

    if (chunks.length === 0) {
      report.push({ slug: doc.slug, chunks: 0, status: 'empty' });
      continue;
    }

    const vectors = await embedTexts(chunks.map((c) => c.content));
    const embeddingRows = chunks.map((chunk, i) => ({
      article_id: articleId,
      chunk_content: chunk.content,
      embedding: vectors[i],
      chunk_index: chunk.chunkIndex,
    }));

    const { error: embErr } = await client.from('knowledge_embeddings').insert(embeddingRows);
    if (embErr) fail(embErr.message);

    report.push({ slug: doc.slug, chunks: chunks.length, status: 'indexed' });
    console.log(`  ✓ ${doc.slug} (${chunks.length} chunks)`);
  }

  const outPath = join(projectRoot, 'src/application/ai/knowledge/generated/kb-sync-report.json');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify({ syncedAt: new Date().toISOString(), report }, null, 2));
  console.log(`Done. ${report.length} articles → ${outPath}`);
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
