import type { KnowledgeRetrievalRequest, KnowledgeTopic } from '../../../domain/ai/knowledge-provider.types';
import { getAgentKnowledgeDocument } from '../agent-knowledge.loader';
import { AGENT_KNOWLEDGE_INDEX, type AgentKnowledgeIndexEntry } from './generated/agent-knowledge.index.ts';

const QUESTION_TOPIC_PATTERNS: { topic: KnowledgeTopic; pattern: RegExp }[] = [
  { topic: 'humidity-vpd', pattern: /vpd|влажност|rh|испар/i },
  { topic: 'irrigation', pattern: /полив|water|soil|субстрат|dryback|влаж.*почв/i },
  { topic: 'lighting', pattern: /свет|dli|ppfd|фото|освещ|photoperiod/i },
  { topic: 'climate', pattern: /температ|климат|тепл|холод|micro|вент/i },
  { topic: 'plant-stress', pattern: /стресс|вян|жёлт|желт|болезн|плесен|ipm|вредит/i },
  { topic: 'sensors', pattern: /датчик|sensor/i },
  { topic: 'co2', pattern: /co2|углекисл/i },
  { topic: 'ph-ec', pattern: /\bec\b|ph|питан|nutrition|fert/i },
  { topic: 'hydroponics', pattern: /гидроп|nft|dwc|aero|кокос|substrate/i },
  { topic: 'grow-stages', pattern: /стади|фаз|цветен|вегет|расса|цикл|growrun|grow.run|телеметр/i },
];

function scoreEntry(entry: AgentKnowledgeIndexEntry, request: KnowledgeRetrievalRequest, cropSlug?: string): number {
  let score = 0;
  if (cropSlug && entry.slug === cropSlug) score += 100;
  if (entry.type === 'crop' && cropSlug && entry.slug === cropSlug) score += 50;
  if (request.topics?.length) {
    for (const t of request.topics) {
      if (entry.topics.includes(t)) score += 15;
    }
  }
  if (request.question) {
    const q = request.question.toLowerCase();
    if (entry.commonName && q.includes(entry.commonName.toLowerCase())) score += 20;
    for (const alias of entry.aliases) {
      if (alias.length >= 3 && q.includes(alias.toLowerCase())) score += 10;
    }
    for (const { topic, pattern } of QUESTION_TOPIC_PATTERNS) {
      if (pattern.test(q) && entry.topics.includes(topic)) score += 12;
    }
  }
  if (entry.type === 'guide') score += 5;
  if (entry.type === 'core') score += 2;
  if (entry.trust === 'VERIFIED') score += 3;
  if (entry.trust === 'UNVERIFIED') score -= 5;
  return score;
}

export function inferTopicsFromQuestion(question?: string): KnowledgeTopic[] {
  if (!question) return [];
  const topics = new Set<KnowledgeTopic>();
  for (const { topic, pattern } of QUESTION_TOPIC_PATTERNS) {
    if (pattern.test(question)) topics.add(topic);
  }
  return [...topics];
}

export function retrieveKnowledgeContext(request: KnowledgeRetrievalRequest = {}): string {
  const maxChars = request.maxCharacters ?? 8000;
  const cropSlug = request.cropSlug;

  const ranked = AGENT_KNOWLEDGE_INDEX.map((entry) => ({
    entry,
    score: scoreEntry(entry, request, cropSlug),
  }))
    .filter((r) => r.score > 0 || r.entry.type === 'core')
    .sort((a, b) => b.score - a.score);

  const selected: AgentKnowledgeIndexEntry[] = [];
  const seen = new Set<string>();

  // Always include essentials
  for (const slug of ['plant-basics', 'microclimate']) {
    const entry = AGENT_KNOWLEDGE_INDEX.find((e) => e.slug === slug);
    if (entry && !seen.has(entry.slug)) {
      selected.push(entry);
      seen.add(entry.slug);
    }
  }

  if (cropSlug) {
    const cropEntry = AGENT_KNOWLEDGE_INDEX.find((e) => e.slug === cropSlug);
    if (cropEntry && !seen.has(cropEntry.slug)) {
      selected.unshift(cropEntry);
      seen.add(cropEntry.slug);
    }
  }

  for (const { entry } of ranked) {
    if (seen.has(entry.slug)) continue;
    selected.push(entry);
    seen.add(entry.slug);
    if (selected.length >= 8) break;
  }

  const parts = selected
    .map((entry) => {
      const body = getAgentKnowledgeDocument(entry.slug);
      if (!body) return '';
      return `## ${entry.title} (${entry.slug})\n[trust: ${entry.trust}] sources: ${entry.sourceIds?.join(', ') || 'none'} — ${entry.provenance}\n\n${body}`;
    })
    .filter(Boolean);

  return parts.join('\n\n---\n\n').slice(0, maxChars);
}

export function getKnowledgeStats() {
  return {
    total: AGENT_KNOWLEDGE_INDEX.length,
    crops: AGENT_KNOWLEDGE_INDEX.filter((e) => e.type === 'crop').length,
    guides: AGENT_KNOWLEDGE_INDEX.filter((e) => e.type === 'guide').length,
  };
}
