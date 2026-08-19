#!/usr/bin/env tsx
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isValidTrust,
  parseAgentDocument,
  resolveDocType,
  type ParsedAgentFrontmatter,
} from './knowledge/parse-agent-markdown.ts';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const knowledgeRoot = resolve(process.env.QBX_KNOWLEDGE_ROOT || join(projectRoot, '../Obsibian/Obsibian/QBX'));
const agentWikiDir = join(knowledgeRoot, 'wiki/agent');
const registryPath = join(knowledgeRoot, 'wiki/sources/registry.json');
const registryFallback = join(agentWikiDir, 'reference/source-registry.json');

interface LintIssue {
  file: string;
  level: 'error' | 'warn';
  message: string;
}

interface SourceRegistry {
  sources: { id: string; authority?: string }[];
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

function loadRegistry(): Set<string> {
  let raw: string;
  try {
    raw = readFileSync(registryPath, 'utf8');
  } catch {
    raw = readFileSync(registryFallback, 'utf8');
  }
  const parsed = JSON.parse(raw) as SourceRegistry;
  return new Set(parsed.sources.map((s) => s.id));
}

function hasSection(body: string, pattern: RegExp): boolean {
  return pattern.test(body);
}

function lintBodyStructure(type: ReturnType<typeof resolveDocType>, body: string, issues: LintIssue[], rel: string) {
  const chain = {
    target: /##.*(цел|target|ориентир|базов|smart irrigation|накапливать|pipeline|фазы|температур|влажnost|субстрат|co2|стресс|ipm|шаблон|культур|категор|симптом|обогащ|профилакт|типы|связк|для agent|модель|temp)/i,
    symptom: /##.*(симптом|проблем|стресс|типичн|предупрежден)/i,
    automation: /##.*(автоматиз|automation|шаблон)/i,
    qbx: /##.*(для qbx|принцип для qbx|fact|датчик)/i,
  };

  if (type === 'crop') {
    if (!hasSection(body, chain.target)) {
      issues.push({ file: rel, level: 'warn', message: 'Crop doc: missing targets section (## Цели / ## Targets)' });
    }
    if (!hasSection(body, chain.symptom)) {
      issues.push({ file: rel, level: 'warn', message: 'Crop doc: missing symptom/problems section' });
    }
  }

  if (type === 'guide' || type === 'core') {
    if (!hasSection(body, chain.target) && !hasSection(body, /##.*(что такое|определ|четыре опоры)/i)) {
      issues.push({ file: rel, level: 'warn', message: 'Guide/core: missing definitions or targets section' });
    }
  }

  if (type !== 'reference' && !hasSection(body, chain.qbx) && !hasSection(body, /fact|inference|датчик/i)) {
    issues.push({ file: rel, level: 'warn', message: 'Missing QBX/FACT boundary section (## Для QBX or inline FACT rule)' });
  }
}

function lintFrontmatter(meta: ParsedAgentFrontmatter, body: string, rel: string, registry: Set<string>, issues: LintIssue[]) {
  if (meta.kind !== 'agent-knowledge') {
    issues.push({ file: rel, level: 'error', message: 'Missing or invalid kind: agent-knowledge' });
  }

  if (!meta.trust || !isValidTrust(meta.trust)) {
    issues.push({ file: rel, level: 'error', message: 'Missing or invalid trust (VERIFIED | PROJECT_DECISION | UNVERIFIED)' });
  }

  if (!meta.provenance?.trim()) {
    issues.push({ file: rel, level: 'error', message: 'Missing provenance (one-line source summary)' });
  }

  if (!meta.updated?.trim()) {
    issues.push({ file: rel, level: 'warn', message: 'Missing updated date (YYYY-MM-DD)' });
  }

  if (!meta.topics?.length) {
    issues.push({ file: rel, level: 'warn', message: 'Missing topics[] — retrieval may not rank this doc' });
  }

  const slug = rel.replace(/\.md$/, '').replace(/\//g, '--');
  const type = resolveDocType(meta, slug);

  if (type === 'crop') {
    if (!meta.cropId) issues.push({ file: rel, level: 'error', message: 'Crop doc missing cropId' });
    if (!meta.commonName) issues.push({ file: rel, level: 'error', message: 'Crop doc missing commonName' });
    if (!meta.stages?.length) issues.push({ file: rel, level: 'warn', message: 'Crop doc missing stages[]' });
  }

  if (meta.trust === 'VERIFIED') {
    if (!meta.sourceIds?.length) {
      issues.push({
        file: rel,
        level: 'error',
        message: 'VERIFIED requires sourceIds[] pointing to source-registry.json',
      });
    } else {
      for (const id of meta.sourceIds) {
        if (!registry.has(id)) {
          issues.push({ file: rel, level: 'error', message: `Unknown sourceId: ${id}` });
        }
        if (id === 'src-qbx-project-decision') {
          issues.push({ file: rel, level: 'error', message: 'VERIFIED cannot use src-qbx-project-decision' });
        }
      }
    }
  }

  if (meta.trust === 'PROJECT_DECISION' && meta.sourceIds?.some((id) => id !== 'src-qbx-project-decision')) {
    issues.push({ file: rel, level: 'warn', message: 'PROJECT_DECISION usually omits external sourceIds or uses src-qbx-project-decision only' });
  }

  lintBodyStructure(type, body, issues, rel);
}

function main() {
  const strict = process.argv.includes('--strict');
  const registry = loadRegistry();
  const files = walkMarkdown(agentWikiDir);
  const issues: LintIssue[] = [];
  const cropIds = new Map<string, string>();

  for (const filePath of files.sort()) {
    const rel = relative(agentWikiDir, filePath);
    if (rel === 'reference/source-registry.json') continue;

    const doc = parseAgentDocument(readFileSync(filePath, 'utf8'));
    lintFrontmatter(doc.meta, doc.body, rel, registry, issues);

    if (doc.meta.cropId) {
      const prev = cropIds.get(doc.meta.cropId);
      if (prev) {
        issues.push({ file: rel, level: 'error', message: `Duplicate cropId ${doc.meta.cropId} (also in ${prev})` });
      } else {
        cropIds.set(doc.meta.cropId, rel);
      }
    }
  }

  const errors = issues.filter((i) => i.level === 'error');
  const warns = issues.filter((i) => i.level === 'warn');

  for (const issue of issues) {
    const tag = issue.level === 'error' ? 'ERROR' : 'WARN';
    console.log(`${tag} ${issue.file}: ${issue.message}`);
  }

  console.log(`\nlint:knowledge — ${files.length} files, ${errors.length} errors, ${warns.length} warnings`);

  if (errors.length > 0) {
    process.exit(1);
  }
  if (strict && warns.length > 0) {
    process.exit(1);
  }
}

main();
