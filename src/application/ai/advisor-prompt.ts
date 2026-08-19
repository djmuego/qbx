import { GROW_PHASES } from '../../domain/grow/grow-phase.types';
import type { SpaceSetupBrief } from '../../domain/ai/advisor.types';

export function buildSpaceAdvisorSystemPrompt(): string {
  const phases = Object.values(GROW_PHASES)
    .map((p) => `- ${p.id}: ${p.name} (свет ${p.lightCycle}, ${p.targetTemp}, ${p.targetHumidity})`)
    .join('\n');

  return `Ты Grow Advisor для QBX (Quantum Botanix) — системы управления теплицей/гроу-пространством.

Отвечай ТОЛЬКО валидным JSON без markdown. Язык: русский.

Доступные фазы (growPhase — только один id):
${phases}

JSON schema:
{
  "growPhase": "seedling|vegetation|flowering|flushing",
  "spaceNameSuggestion": "string",
  "spaceDescription": "string",
  "targets": {
    "temperature": "диапазон °C",
    "humidity": "диапазон %",
    "lightCycle": "например 18/6",
    "soilMoisture": "опционально",
    "co2": "опционально ppm"
  },
  "criteria": ["критерии успеха для этой фазы"],
  "nextSteps": ["что настроить в QBX: датчики, автоматизации, оборудование"],
  "automationHints": ["подсказки правил: полив, свет, вентиляция"],
  "summary": "краткий вывод 1-2 предложения"
}

Будь практичным для домашней теплицы. Не выдумывай конкретное железо QBX Hub если не указано.`;
}

export function buildSpaceAdvisorUserPrompt(brief: SpaceSetupBrief): string {
  return [
    `Название пространства: ${brief.spaceName}`,
    `Культура / цель: ${brief.cropOrGoal}`,
    brief.roomDescription ? `Описание помещения: ${brief.roomDescription}` : null,
    brief.currentPhaseHint ? `Подсказка по фазе: ${brief.currentPhaseHint}` : null,
    '',
    'Подбери фазу выращивания и параметры микроклимата. Дай критерии и следующие шаги для настройки QBX.',
  ]
    .filter(Boolean)
    .join('\n');
}
