import type { CropProfile } from '../../../domain/grow/crop-profile.types';
import type { GrowContext } from '../../../domain/ai/grow-context.types';
import { AGENT_KNOWLEDGE_INDEX, type AgentKnowledgeIndexEntry } from './generated/agent-knowledge.index.ts';

export interface ResolvedCrop {
  cropId: string;
  commonName: string;
  slug: string;
  source: 'profile' | 'space-text' | 'default';
}

const CROP_ENTRIES = AGENT_KNOWLEDGE_INDEX.filter((e) => e.type === 'crop' && e.cropId);

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim();
}

function scoreCropMatch(text: string, entry: AgentKnowledgeIndexEntry): number {
  const norm = normalize(text);
  if (!norm) return 0;
  let score = 0;
  if (entry.cropId && norm.includes(entry.cropId.replace(/-/g, ' '))) score += 5;
  if (entry.commonName && norm.includes(normalize(entry.commonName))) score += 8;
  for (const alias of entry.aliases) {
    if (alias.length >= 3 && norm.includes(normalize(alias))) score += 4;
  }
  return score;
}

export function resolveCrop(context: GrowContext, profile?: CropProfile | null): ResolvedCrop | null {
  if (profile?.cropId) {
    const entry = CROP_ENTRIES.find((e) => e.cropId === profile.cropId);
    if (entry) {
      return {
        cropId: entry.cropId!,
        commonName: profile.commonName || entry.commonName || entry.cropId!,
        slug: entry.slug,
        source: 'profile',
      };
    }
  }

  const haystack = [context.space?.name, context.space?.description, profile?.commonName, profile?.notes]
    .filter(Boolean)
    .join(' ');

  let best: { entry: AgentKnowledgeIndexEntry; score: number } | null = null;
  for (const entry of CROP_ENTRIES) {
    const score = scoreCropMatch(haystack, entry);
    if (score > 0 && (!best || score > best.score)) {
      best = { entry, score };
    }
  }

  if (best && best.score >= 4) {
    return {
      cropId: best.entry.cropId!,
      commonName: best.entry.commonName || best.entry.cropId!,
      slug: best.entry.slug,
      source: 'space-text',
    };
  }

  return null;
}

export function listCropOptions(): { cropId: string; commonName: string; slug: string }[] {
  return CROP_ENTRIES.filter((e) => e.cropId).map((e) => ({
    cropId: e.cropId!,
    commonName: e.commonName || e.cropId!,
    slug: e.slug,
  }));
}

export function getCropKnowledgeSlug(cropId: string): string | undefined {
  return CROP_ENTRIES.find((e) => e.cropId === cropId)?.slug;
}
