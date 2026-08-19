import { describe, expect, it } from 'vitest';
import { AGENT_KNOWLEDGE_INDEX } from './generated/agent-knowledge.index.ts';
import { inferTopicsFromQuestion, retrieveKnowledgeContext } from './knowledge-retrieval';

describe('knowledge retrieval', () => {
  it('maps VPD questions to humidity-vpd topics', () => {
    const topics = inferTopicsFromQuestion('Какой VPD на вегетации?');
    expect(topics).toContain('humidity-vpd');
  });

  it('retrieves VPD-related knowledge for humidity questions', () => {
    const ctx = retrieveKnowledgeContext({
      question: 'VPD слишком низкий, что делать?',
      topics: ['humidity-vpd'],
      maxCharacters: 12000,
    });
    expect(ctx).toMatch(/vpd|влажност/i);
    expect(ctx).toMatch(/guides--vpd-and-humidity|VPD и влажность/i);
  });

  it('prioritizes crop profile when cropSlug set', () => {
    const ctx = retrieveKnowledgeContext({
      question: 'полив и dryback',
      cropSlug: 'crops--tomato',
      topics: ['irrigation'],
      maxCharacters: 6000,
    });
    expect(ctx.indexOf('crops--tomato')).toBeLessThan(ctx.indexOf('plant-basics'));
  });

  it('includes trust headers in context', () => {
    const ctx = retrieveKnowledgeContext({ question: 'освещение PPFD DLI', maxCharacters: 3000 });
    expect(ctx).toMatch(/\[trust:/);
  });

  it('flowering tomato query retrieves tomato doc', () => {
    const ctx = retrieveKnowledgeContext({
      question: 'томат цветение VPD полив',
      cropSlug: 'crops--tomato',
      topics: ['grow-stages', 'humidity-vpd', 'irrigation'],
      maxCharacters: 8000,
    });
    expect(ctx).toMatch(/crops--tomato|Томат/i);
  });

  it('coco irrigation prefers substrate guide', () => {
    const ctx = retrieveKnowledgeContext({
      question: 'кокос dryback полив',
      topics: ['irrigation', 'substrate', 'hydroponics'],
      maxCharacters: 8000,
    });
    expect(ctx).toMatch(/dryback|substrate|субстрат/i);
  });

  it('UNVERIFIED trust deprioritized in ranking', () => {
    const unverified = AGENT_KNOWLEDGE_INDEX.filter((e) => e.trust === 'UNVERIFIED');
    expect(unverified.length).toBe(0);
  });
});
