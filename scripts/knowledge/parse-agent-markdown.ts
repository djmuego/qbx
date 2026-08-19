import { readFileSync } from 'node:fs';

export type KnowledgeTrustLevel = 'VERIFIED' | 'UNVERIFIED' | 'PROJECT_DECISION';

export interface ParsedAgentFrontmatter {
  kind?: string;
  type?: string;
  trust?: KnowledgeTrustLevel;
  provenance?: string;
  cropId?: string;
  commonName?: string;
  aliases?: string[];
  topics?: string[];
  stages?: string[];
  sourceIds?: string[];
  updated?: string;
  slug?: string;
}

export interface ParsedAgentDocument {
  meta: ParsedAgentFrontmatter;
  body: string;
  title: string;
}

const TRUST_LEVELS = new Set<KnowledgeTrustLevel>(['VERIFIED', 'UNVERIFIED', 'PROJECT_DECISION']);

export function parseFrontmatter(markdown: string): { meta: ParsedAgentFrontmatter; body: string } {
  if (!markdown.startsWith('---')) {
    return { meta: {}, body: markdown.trim() };
  }
  const end = markdown.indexOf('---', 3);
  if (end === -1) return { meta: {}, body: markdown.trim() };

  const raw = markdown.slice(3, end).trim();
  const body = markdown.slice(end + 3).trim();
  const meta: ParsedAgentFrontmatter = {};

  for (const line of raw.split('\n')) {
    const m = line.match(/^([\w-]+):\s*(.+)$/);
    if (!m) continue;
    const key = m[1] as keyof ParsedAgentFrontmatter;
    let value = m[2].trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      meta[key] = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, '')) as never;
    } else {
      meta[key] = value.replace(/^['"]|['"]$/g, '') as never;
    }
  }

  return { meta, body };
}

export function parseAgentDocument(markdown: string): ParsedAgentDocument {
  const { meta, body } = parseFrontmatter(markdown);
  const titleMatch = body.match(/^#\s+(.+)$/m);
  return {
    meta,
    body,
    title: titleMatch?.[1]?.trim() ?? meta.slug ?? 'untitled',
  };
}

export function parseAgentFile(filePath: string): ParsedAgentDocument {
  return parseAgentDocument(readFileSync(filePath, 'utf8'));
}

export function isValidTrust(value: unknown): value is KnowledgeTrustLevel {
  return typeof value === 'string' && TRUST_LEVELS.has(value as KnowledgeTrustLevel);
}

export function resolveDocType(meta: ParsedAgentFrontmatter, slug: string): 'core' | 'crop' | 'guide' | 'reference' {
  if (meta.type === 'crop' || slug.includes('crops--') || slug.includes('-crops--')) return 'crop';
  if (meta.type === 'guide') return 'guide';
  if (meta.type === 'reference') return 'reference';
  return 'core';
}
