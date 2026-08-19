#!/usr/bin/env tsx
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseAgentDocument,
  resolveDocType,
  type KnowledgeTrustLevel,
} from './knowledge/parse-agent-markdown.ts';
import { extractClaimsFromDocument, type ExtractedClaim } from './knowledge/extract-claims.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const knowledgeRoot = resolve(process.env.QBX_KNOWLEDGE_ROOT || join(projectRoot, '../Obsibian/Obsibian/QBX'));
const agentWikiDir = join(knowledgeRoot, 'wiki/agent');
const outputDir = join(projectRoot, 'src/application/ai/knowledge/generated');

interface IndexEntry {
  slug: string;
  path: string;
  title: string;
  type: 'core' | 'crop' | 'guide' | 'reference';
  trust: KnowledgeTrustLevel;
  provenance: string;
  sourceIds: string[];
  updated?: string;
  cropId?: string;
  commonName?: string;
  aliases: string[];
  topics: string[];
  bytes: number;
}

function fail(message: string): never {
  console.error(`sync-agent-knowledge: ${message}`);
  process.exit(1);
}

function escapeTemplateLiteral(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

function walkMarkdown(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...walkMarkdown(full));
      continue;
    }
    if (entry.endsWith('.md') && entry !== 'index.md') {
      results.push(full);
    }
  }
  return results;
}

function slugFromPath(filePath: string): string {
  const rel = relative(agentWikiDir, filePath).replace(/\.md$/, '');
  const cropMatch = rel.match(/^(?:\d+-)?crops\/(.+)$/);
  if (cropMatch) return `crops--${cropMatch[1]}`;
  // Taxonomy folders: stable slug = filename (backward compatible)
  if (/^\d+-[^/]+\/.+/.test(rel)) return rel.split('/').pop()!;
  return rel.replace(/\//g, '--');
}

function main() {
  console.log(`Reading agent wiki (recursive): ${agentWikiDir}`);

  let files: string[];
  try {
    files = walkMarkdown(agentWikiDir).filter((f) => !f.endsWith('source-registry.json'));
  } catch {
    fail(`Cannot read ${agentWikiDir}`);
  }

  if (files.length === 0) {
    fail('No agent knowledge markdown files found.');
  }

  mkdirSync(outputDir, { recursive: true });

  const index: IndexEntry[] = [];
  const bundleEntries: string[] = [];
  const order: string[] = [];
  const allClaims: ExtractedClaim[] = [];
  const compileWarnings: string[] = [];

  for (const filePath of files.sort()) {
    const slug = slugFromPath(filePath);
    const raw = readFileSync(filePath, 'utf8');
    const { meta, body, title } = parseAgentDocument(raw);
    const trust = (meta.trust ?? 'PROJECT_DECISION') as KnowledgeTrustLevel;
    const provenance = meta.provenance ?? 'QBX curated agent knowledge';
    const sourceIds = meta.sourceIds ?? [];

    writeFileSync(join(outputDir, `${slug}.md`), `${body.trim()}\n`, 'utf8');

    index.push({
      slug,
      path: relative(agentWikiDir, filePath),
      title,
      type: resolveDocType(meta, slug),
      trust,
      provenance,
      sourceIds,
      updated: meta.updated,
      cropId: meta.cropId,
      commonName: meta.commonName,
      aliases: meta.aliases ?? [],
      topics: meta.topics ?? [],
      bytes: Buffer.byteLength(body, 'utf8'),
    });

    order.push(slug);
    bundleEntries.push(`  '${slug}': \`${escapeTemplateLiteral(body.trim())}\`,`);
    allClaims.push(...extractClaimsFromDocument(slug, { meta, body, title }));

    if (trust === 'VERIFIED' && sourceIds.length === 0) {
      compileWarnings.push(`${slug}: VERIFIED without sourceIds`);
    }
  }

  const manifest = {
    schemaVersion: 5,
    generatedAt: new Date().toISOString(),
    source: agentWikiDir,
    documentCount: index.length,
    trustCounts: {
      VERIFIED: index.filter((e) => e.trust === 'VERIFIED').length,
      PROJECT_DECISION: index.filter((e) => e.trust === 'PROJECT_DECISION').length,
      UNVERIFIED: index.filter((e) => e.trust === 'UNVERIFIED').length,
    },
    crops: index.filter((e) => e.type === 'crop').map((e) => e.cropId),
    claimCount: allClaims.length,
    warnings: compileWarnings,
    files: index,
  };

  writeFileSync(join(outputDir, 'knowledge-claims.json'), JSON.stringify(allClaims, null, 2));
  writeFileSync(
    join(outputDir, 'compile-report.json'),
    JSON.stringify(
      {
        generatedAt: manifest.generatedAt,
        documentCount: index.length,
        claimCount: allClaims.length,
        trustCounts: manifest.trustCounts,
        warnings: compileWarnings,
        topics: [...new Set(index.flatMap((e) => e.topics))].sort(),
      },
      null,
      2,
    ),
  );

  writeFileSync(join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  writeFileSync(
    join(outputDir, 'agent-knowledge.bundle.ts'),
    `/** AUTO-GENERATED by npm run sync:agent-knowledge — do not edit */\n\nexport const AGENT_KNOWLEDGE_ORDER: string[] = ${JSON.stringify(order, null, 2)};\n\nexport const AGENT_KNOWLEDGE_DOCS: Record<string, string> = {\n${bundleEntries.join('\n')}\n};\n`,
    'utf8',
  );

  writeFileSync(
    join(outputDir, 'agent-knowledge.index.ts'),
    `/** AUTO-GENERATED by npm run sync:agent-knowledge — do not edit */\n\nexport type KnowledgeTrustLevel = 'VERIFIED' | 'UNVERIFIED' | 'PROJECT_DECISION';\n\nexport interface AgentKnowledgeIndexEntry {\n  slug: string;\n  path: string;\n  title: string;\n  type: 'core' | 'crop' | 'guide' | 'reference';\n  trust: KnowledgeTrustLevel;\n  provenance: string;\n  sourceIds: string[];\n  updated?: string;\n  cropId?: string;\n  commonName?: string;\n  aliases: string[];\n  topics: string[];\n  bytes: number;\n}\n\nexport const AGENT_KNOWLEDGE_INDEX: AgentKnowledgeIndexEntry[] = ${JSON.stringify(index, null, 2)};\n`,
    'utf8',
  );

  console.log(`Generated ${index.length} documents in ${outputDir}`);
  console.log(`  crops: ${index.filter((e) => e.type === 'crop').length}`);
  console.log(`  guides: ${index.filter((e) => e.type === 'guide').length}`);
  console.log(`  claims: ${allClaims.length}`);
  if (compileWarnings.length) console.log(`  compile warnings: ${compileWarnings.length}`);
}

main();
