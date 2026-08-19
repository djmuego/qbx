import { describe, expect, it } from 'vitest';
import { growAgentResponseSchema } from './grow-agent-response.schema';

describe('growAgentResponseSchema', () => {
  it('parses structured grow agent response', () => {
    const parsed = growAgentResponseSchema.parse({
      status: 'attention',
      headline: 'Климат требует внимания',
      summary: 'Температура выше цели.',
      confidence: 'medium',
      observations: [{ title: 'Heat', detail: '31°C', evidence: [{ label: 'temp', kind: 'FACT', detail: '31' }] }],
      warnings: [],
      recommendations: [],
      questions: [],
      proposedAutomations: [],
      missingSensors: ['co2'],
      evidenceSources: ['Temperature sensor'],
      watchItems: [],
      nextSteps: ['Check ventilation'],
    });
    expect(parsed.confidence).toBe('medium');
  });
});
