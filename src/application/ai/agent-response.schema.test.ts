import { describe, expect, it } from 'vitest';
import { agentBriefingSchema } from './agent-response.schema';

describe('agentBriefingSchema', () => {
  it('parses a valid agent briefing payload', () => {
    const parsed = agentBriefingSchema.parse({
      status: 'attention',
      headline: 'Влажность выше нормы',
      summary: 'RH 68% при целевых 55–65%. Рекомендуется проверить вентиляцию.',
      insights: [
        {
          severity: 'warning',
          title: 'Влажность',
          detail: 'Показание 68% выше оптимума фазы vegetation.',
        },
      ],
      watchItems: ['Влажность воздуха', 'Работа вентилятора'],
      nextSteps: ['Включить автоматизацию вентиляции при RH > 65%'],
    });

    expect(parsed.status).toBe('attention');
    expect(parsed.insights).toHaveLength(1);
  });

  it('rejects invalid status', () => {
    expect(() =>
      agentBriefingSchema.parse({
        status: 'unknown',
        headline: 'x',
        summary: 'y',
        insights: [],
        watchItems: [],
        nextSteps: [],
      }),
    ).toThrow();
  });
});
