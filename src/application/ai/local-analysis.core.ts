import type { GrowContext } from '../../domain/ai/grow-context.types';
import type { GrowAgentAnalysis } from '../../domain/ai/grow-agent-response.types';
import { attachAnalysisMetadata } from './grow-agent-prompt';

export function createLocalAnalysis(context: GrowContext): GrowAgentAnalysis {
  const base = {
    confidence: context.dataQuality.confidenceHint,
    observations: [] as GrowAgentAnalysis['observations'],
    warnings: [] as GrowAgentAnalysis['warnings'],
    recommendations: [] as GrowAgentAnalysis['recommendations'],
    questions: [] as string[],
    proposedAutomations: [] as GrowAgentAnalysis['proposedAutomations'],
    missingSensors: context.dataQuality.missingSensors,
    evidenceSources: [] as string[],
    watchItems: [] as string[],
    nextSteps: [] as string[],
  };

  if (!context.space) {
    return attachAnalysisMetadata(
      {
        ...base,
        status: 'waiting',
        headline: 'Создайте пространство',
        summary: 'QBX Grow Agent готов следить за циклом выращивания. Сначала создайте гроу-пространство.',
        confidence: 'low',
        nextSteps: ['Создать пространство', 'Указать культуру и стадию'],
      },
      context,
    );
  }

  if (context.meta.runtimeMode === 'hardware' && !context.dataQuality.hasDevices) {
    return attachAnalysisMetadata(
      {
        ...base,
        status: 'waiting',
        headline: 'Устройства не подключены',
        summary:
          'Реальные устройства пока не подключены, поэтому я не могу оценить текущий микроклимат. Подключите QBX Hub и датчики.',
        confidence: 'low',
        nextSteps: ['Добавить устройство QBX', 'Настроить датчики температуры и влажности'],
      },
      context,
    );
  }

  if (!context.dataQuality.hasLiveSensorData) {
    return attachAnalysisMetadata(
      {
        ...base,
        status: 'waiting',
        headline: 'Нет live-данных',
        summary:
          context.meta.dataSource === 'simulator'
            ? 'Симулятор активен, но live-показаний пока нет. Дождитесь telemetry или проверьте конфигурацию портов.'
            : 'Устройства есть, но live-показаний нет. Я не могу оценить микроклимат без данных датчиков.',
        confidence: 'low',
        observations: context.environment.sensors.map((s) => ({
          title: s.name,
          detail: s.quality === 'stale' ? 'Данные датчика устарели.' : 'Нет данных с датчика.',
          evidence: [{ label: s.name, kind: 'UNKNOWN', detail: `quality=${s.quality}` }],
        })),
        nextSteps: ['Проверить online-статус контроллера', 'Дождаться первых показаний'],
      },
      context,
    );
  }

  if (context.alerts.emergencyActive) {
    return attachAnalysisMetadata(
      {
        ...base,
        status: 'critical',
        headline: 'Экстренное отключение активно',
        summary: 'Все выходы остановлены режимом Emergency Off. AI-рекомендации не управляют оборудованием.',
        confidence: 'high',
        warnings: [
          {
            severity: 'critical',
            title: 'Emergency Off',
            detail: 'Сначала снимите экстренный режим после проверки безопасности.',
            evidence: [{ label: 'Emergency Off', kind: 'FACT', detail: 'emergencyActive=true' }],
          },
        ],
        nextSteps: ['Проверить причину срабатывания', 'Снять Emergency Off когда безопасно'],
      },
      context,
    );
  }

  const temp = context.environment.sensors.find((s) => s.type === 'temperature' && s.value != null);
  const fan = context.equipment.find(
    (e) => (e.type === 'ventilation' || e.name.toLowerCase().includes('вент')) && e.reportedState === true,
  );

  const warnings: GrowAgentAnalysis['warnings'] = [];
  const recommendations: GrowAgentAnalysis['recommendations'] = [];
  const observations: GrowAgentAnalysis['observations'] = [];

  for (const s of context.environment.sensors.filter((x) => x.quality === 'stale')) {
    warnings.push({
      severity: 'attention',
      title: `Данные устарели: ${s.name}`,
      detail: 'Не использую устаревшие показания для агрономических выводов.',
      evidence: [{ label: s.name, kind: 'FACT', detail: 'quality=stale' }],
    });
  }

  if (temp && temp.optimalMax != null && temp.value! > temp.optimalMax) {
    observations.push({
      title: 'Температура выше цели',
      detail: `${temp.value}${temp.unit} при целевом max ${temp.optimalMax}${temp.unit}.`,
      evidence: [{ label: temp.name, kind: 'FACT', detail: `value=${temp.value}` }],
    });

    if (fan) {
      warnings.push({
        severity: 'attention',
        title: 'Вентиляция уже работает',
        detail: `${fan.name} уже ON — оцените, достаточно ли текущего воздействия по тренду.`,
        evidence: [
          { label: temp.name, kind: 'FACT', detail: `${temp.value}${temp.unit}` },
          { label: fan.name, kind: 'FACT', detail: 'reportedState=ON' },
        ],
      });
      recommendations.push({
        title: 'Проверить эффективность охлаждения',
        reason: 'Температура выше цели при работающей вентиляции.',
        priority: 'medium',
        evidence: [
          { label: temp.name, kind: 'FACT', detail: 'above target' },
          { label: fan.name, kind: 'FACT', detail: 'ON' },
        ],
        suggestedAction: 'Проверьте тренд за 1ч и убедитесь, что приток/вытяжка настроены правильно.',
        confidence: 'medium',
      });
    } else {
      recommendations.push({
        title: 'Снизить температуру',
        reason: 'Температура выше целевого диапазона.',
        priority: 'high',
        evidence: [{ label: temp.name, kind: 'FACT', detail: `${temp.value}${temp.unit}` }],
        suggestedAction: 'Рассмотрите вентиляцию или снижение нагрузки на освещение.',
        confidence: 'medium',
      });
    }
  }

  const soil = context.substrate.soilMoistureSensors.find((s) => s.value != null);
  const pumpAuto = context.irrigation.wateringOutputs?.some((o) => o.reportedState && o.controlMode === 'auto') ?? false;
  if (soil && soil.optimalMin != null && soil.value! < soil.optimalMin) {
    const summary24h = context.environment.telemetrySummary.find((t) => t.sensorId === soil.id);
    const trend = summary24h?.windows.find((w) => w.window === '1h')?.trend;
    observations.push({
      title: 'Влажность субстрата ниже цели',
      detail: `${soil.value}${soil.unit} при min ${soil.optimalMin}${soil.unit}${trend ? `, тренд ${trend}` : ''}.`,
      evidence: [{ label: soil.name, kind: 'FACT', detail: `value=${soil.value}` }],
    });
    if (pumpAuto) {
      recommendations.push({
        title: 'Проверить систему полива',
        reason: 'Влажность падает несмотря на автоматизацию полива.',
        priority: 'high',
        evidence: [{ label: soil.name, kind: 'FACT', detail: 'below target' }],
        suggestedAction:
          'Возможны проблемы подачи, датчика или настройки — проверьте насос и recent events. Не утверждаю конкретную неисправность без evidence.',
        confidence: 'medium',
      });
    }
  }

  const questions: string[] = [];
  if (!context.dataQuality.hasCropProfile) {
    questions.push('Какая культура и сорт выращиваются?');
  }

  const status =
    warnings.some((w) => w.severity === 'critical') ? 'critical' : warnings.length ? 'attention' : 'ok';

  return attachAnalysisMetadata(
    {
      ...base,
      status,
      headline: status === 'ok' ? 'Grow Agent на связи' : 'Требует внимания',
      summary:
        status === 'ok'
          ? context.meta.dataSource === 'simulator'
            ? 'Есть live-данные симулятора — локальный эксперт готов к анализу.'
            : 'Есть live-данные — локальный эксперт готов к анализу.'
          : `Обнаружено ${warnings.length} предупреждений на основе FACT-данных QBX.`,
      observations,
      warnings,
      recommendations,
      questions,
      watchItems: context.environment.sensors
        .filter((s) => s.quality === 'fresh')
        .map((s) => `${s.name}: ${s.value}${s.unit}`),
      nextSteps: recommendations.length
        ? recommendations.map((r) => r.suggestedAction)
        : ['Укажите культуру для точных целей'],
    },
    context,
  );
}
