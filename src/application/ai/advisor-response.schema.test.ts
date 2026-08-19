import { describe, expect, it } from 'vitest';
import { advisorResponseSchema } from './advisor-response.schema';

describe('advisorResponseSchema', () => {
  it('parses a valid advisor JSON payload', () => {
    const parsed = advisorResponseSchema.parse({
      growPhase: 'vegetation',
      spaceNameSuggestion: 'Гроубокс томаты',
      spaceDescription: 'Компактный бокс 120×60 для вегетации томатов.',
      targets: {
        temperature: '24–26 °C',
        humidity: '55–65%',
        lightCycle: '18/6',
        soilMoisture: '40–60%',
      },
      criteria: ['Стабильная температура днём', 'Без резких скачков влажности'],
      nextSteps: ['Добавить датчик температуры', 'Настроить автоматизацию вентиляции'],
      automationHints: ['Включать вентилятор при RH > 65%'],
      summary: 'Для вегетации томатов подходит фаза vegetation с умеренной влажностью.',
    });

    expect(parsed.growPhase).toBe('vegetation');
    expect(parsed.criteria).toHaveLength(2);
  });

  it('rejects invalid grow phase', () => {
    expect(() =>
      advisorResponseSchema.parse({
        growPhase: 'harvest',
        spaceNameSuggestion: 'x',
        spaceDescription: 'y',
        targets: { temperature: 'a', humidity: 'b', lightCycle: 'c' },
        criteria: ['one'],
        nextSteps: ['two'],
        automationHints: [],
        summary: 'z',
      }),
    ).toThrow();
  });
});
