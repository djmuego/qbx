import { describe, expect, it } from 'vitest';
import {
  getAgentKnowledgeContext,
  getAgentKnowledgeDocument,
  listAgentKnowledgeSlugs,
} from './agent-knowledge.loader';

describe('agent knowledge loader', () => {
  it('loads bundled plant knowledge markdown', () => {
    const slugs = listAgentKnowledgeSlugs();
    expect(slugs.length).toBeGreaterThanOrEqual(4);
    expect(slugs).toContain('plant-basics');
    expect(slugs).toContain('home-crops');
  });

  it('includes plant basics content in context', () => {
    const plantBasics = getAgentKnowledgeDocument('plant-basics');
    expect(plantBasics).toBeDefined();
    expect(plantBasics).toMatch(/фотосинтез|Свет/i);

    const context = getAgentKnowledgeContext();
    expect(context).toContain('plant-basics.md');
    expect(context.length).toBeGreaterThan(500);
  });
});
