import type { ParsedAgentDocument } from './parse-agent-markdown.ts';

export interface ExtractedClaim {
  id: string;
  docSlug: string;
  metric: string;
  unit?: string;
  min?: number;
  max?: number;
  raw: string;
  trust: string;
  sourceIds: string[];
}

const RANGE_RE = /(\d+(?:[.,]\d+)?)\s*[–-]\s*(\d+(?:[.,]\d+)?)\s*(°C|°F|%|kPa|mS\/cm|mol\/m²\/day|ч|h)?/i;
const UNIT_RE = /(°C|%|kPa|mS\/cm|mol\/m²\/day)/;

function parseRangeCell(cell: string): { min?: number; max?: number; unit?: string } {
  const m = cell.match(RANGE_RE);
  if (!m) {
    const unit = cell.match(UNIT_RE)?.[1];
    return unit ? { unit } : {};
  }
  return {
    min: Number(m[1].replace(',', '.')),
    max: Number(m[2].replace(',', '.')),
    unit: m[3],
  };
}

export function extractClaimsFromDocument(slug: string, doc: ParsedAgentDocument): ExtractedClaim[] {
  const claims: ExtractedClaim[] = [];
  const trust = doc.meta.trust ?? 'PROJECT_DECISION';
  const sourceIds = doc.meta.sourceIds ?? [];
  let claimIdx = 0;

  for (const line of doc.body.split('\n')) {
    if (!line.trim().startsWith('|') || line.includes('---')) continue;
    const cells = line
      .split('|')
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 2) continue;

    for (const cell of cells) {
      const parsed = parseRangeCell(cell);
      if (parsed.min == null && parsed.max == null) continue;
      claims.push({
        id: `${slug}--${++claimIdx}`,
        docSlug: slug,
        metric: cells[0] ?? 'target',
        unit: parsed.unit,
        min: parsed.min,
        max: parsed.max,
        raw: cell,
        trust,
        sourceIds,
      });
    }
  }

  return claims;
}
