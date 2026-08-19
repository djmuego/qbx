import type { CropProfile } from '../../domain/grow/crop-profile.types';
import type { CultivationContext } from '../../domain/ai/cultivation-context.types';
import { isCultivationContext } from '../../domain/ai/cultivation-context.types';
import type { GrowContext } from '../../domain/ai/grow-context.types';
import type {
  GrowAgentAnalysis,
  GrowAgentRecommendation,
  ProposedAutomation,
} from '../../domain/ai/grow-agent-response.types';
import type { GrowStageId } from '../../domain/grow/grow-stage.types';
import { attachAnalysisMetadata } from './grow-agent-prompt';
import { createLocalAnalysis } from './local-analysis.core';
import { resolveCrop } from './knowledge/crop-resolver';
import { inferTopicsFromQuestion, retrieveKnowledgeContext } from './knowledge/knowledge-retrieval';
import { answerSpatialQuestion } from '../intelligence/spatial-agent.local';
import { createEmptySpaceMap } from '../../domain/map/space-map.geometry';
import type { IntelligenceContext } from '../../domain/intelligence/intelligence-context.types';

export const LOCAL_EXPERT_VERSION = 'local-expert-1.0.0';

interface StageClimateHint {
  tempMin: number;
  tempMax: number;
  rhMin: number;
  rhMax: number;
  vpdMin?: number;
  vpdMax?: number;
}

const CROP_STAGE_HINTS: Partial<Record<string, Partial<Record<GrowStageId, StageClimateHint>>>> = {
  tomato: {
    seedling: { tempMin: 23, tempMax: 25, rhMin: 65, rhMax: 75, vpdMin: 0.6, vpdMax: 0.9 },
    vegetative: { tempMin: 24, tempMax: 26, rhMin: 55, rhMax: 65, vpdMin: 0.8, vpdMax: 1.0 },
    flowering: { tempMin: 22, tempMax: 24, rhMin: 45, rhMax: 55, vpdMin: 1.0, vpdMax: 1.2 },
    fruiting: { tempMin: 22, tempMax: 26, rhMin: 45, rhMax: 50, vpdMin: 0.9, vpdMax: 1.2 },
  },
  cucumber: {
    vegetative: { tempMin: 24, tempMax: 28, rhMin: 60, rhMax: 75, vpdMin: 0.7, vpdMax: 1.0 },
    flowering: { tempMin: 22, tempMax: 26, rhMin: 55, rhMax: 70, vpdMin: 0.8, vpdMax: 1.1 },
    fruiting: { tempMin: 22, tempMax: 26, rhMin: 55, rhMax: 65, vpdMin: 0.9, vpdMax: 1.2 },
  },
  'pepper-sweet': {
    seedling: { tempMin: 24, tempMax: 26, rhMin: 60, rhMax: 70 },
    vegetative: { tempMin: 24, tempMax: 28, rhMin: 50, rhMax: 65, vpdMin: 0.8, vpdMax: 1.1 },
    flowering: { tempMin: 22, tempMax: 26, rhMin: 45, rhMax: 55, vpdMin: 1.0, vpdMax: 1.3 },
    fruiting: { tempMin: 22, tempMax: 26, rhMin: 45, rhMax: 55 },
  },
  'lettuce-leafy': {
    seedling: { tempMin: 18, tempMax: 22, rhMin: 60, rhMax: 75 },
    vegetative: { tempMin: 18, tempMax: 24, rhMin: 50, rhMax: 70, vpdMin: 0.6, vpdMax: 0.9 },
  },
  basil: {
    vegetative: { tempMin: 22, tempMax: 26, rhMin: 50, rhMax: 65, vpdMin: 0.8, vpdMax: 1.1 },
    flowering: { tempMin: 20, tempMax: 24, rhMin: 45, rhMax: 55 },
  },
  strawberry: {
    vegetative: { tempMin: 18, tempMax: 24, rhMin: 60, rhMax: 75 },
    flowering: { tempMin: 18, tempMax: 22, rhMin: 55, rhMax: 70, vpdMin: 0.7, vpdMax: 1.0 },
    fruiting: { tempMin: 18, tempMax: 24, rhMin: 50, rhMax: 65 },
  },
  microgreens: {
    seedling: { tempMin: 18, tempMax: 22, rhMin: 50, rhMax: 70 },
    vegetative: { tempMin: 18, tempMax: 22, rhMin: 45, rhMax: 65 },
  },
};

function getStageHint(cropId: string, stageId: string): StageClimateHint | null {
  const crop = CROP_STAGE_HINTS[cropId];
  if (!crop) return null;
  return crop[stageId as GrowStageId] ?? crop.vegetative ?? crop.seedling ?? null;
}

function enrichWithCropAndClimate(
  base: GrowAgentAnalysis,
  context: GrowContext,
  cropProfile?: CropProfile | null,
): GrowAgentAnalysis {
  const resolved = resolveCrop(context, cropProfile);
  const observations = [...base.observations];
  const warnings = [...base.warnings];
  const recommendations = [...base.recommendations];
  const proposedAutomations = [...base.proposedAutomations];
  const questions = [...base.questions];
  const evidenceSources = ['SOURCE: LOCAL EXPERT', ...base.evidenceSources];

  if (resolved) {
    evidenceSources.push(`Crop library: ${resolved.commonName} (${resolved.cropId})`);
    const hint = getStageHint(resolved.cropId, context.growStage.stageId);
    if (hint) {
      evidenceSources.push(
        `Stage targets (${context.growStage.stageName}): ${hint.tempMin}–${hint.tempMax}°C, RH ${hint.rhMin}–${hint.rhMax}%`,
      );
    }
  } else if (!context.dataQuality.hasCropProfile) {
    questions.push('Укажите культуру в Agent — точнее подберу цели по температуре, VPD и поливу.');
  }

  const temp = context.environment.sensors.find((s) => s.type === 'temperature' && s.quality === 'fresh' && s.value != null);
  const rh = context.environment.sensors.find((s) => s.type === 'humidity' && s.quality === 'fresh' && s.value != null);
  const vpd = context.environment.derivedMetrics.find((m) => m.id === 'vpd' && m.available && m.value != null);

  if (resolved && temp && rh) {
    const hint = getStageHint(resolved.cropId, context.growStage.stageId);
    if (hint) {
      if (temp.value! > hint.tempMax + 1) {
        const fan = context.equipment.find(
          (e) => (e.type === 'ventilation' || e.name.toLowerCase().includes('вент')) && e.reportedState === true,
        );
        if (!recommendations.some((r) => r.title.includes('температур'))) {
          recommendations.push({
            title: fan ? 'Охлаждение при работающей вентиляции' : 'Снизить температуру',
            reason: `${resolved.commonName}, ${context.growStage.stageName}: цель до ${hint.tempMax}°C, сейчас ${temp.value}°C.`,
            priority: 'high',
            evidence: [
              { label: temp.name, kind: 'FACT', detail: `${temp.value}${temp.unit}` },
              { label: 'Crop target', kind: 'INFERENCE', detail: `max ${hint.tempMax}°C` },
            ],
            suggestedAction: fan
              ? 'Проверьте тренд за 1 ч: если температура не падает — усильте приток/вытяжку или снизьте нагрузку на свет.'
              : 'Включите вентиляцию или снизьте нагрузку на освещение.',
            confidence: 'medium',
          });
        }
      }

      if (rh.value! > hint.rhMax + 5) {
        warnings.push({
          severity: 'attention',
          title: 'Влажность выше цели для культуры',
          detail: `${resolved.commonName}: RH ${rh.value}% при целевом max ${hint.rhMax}%. Высокая RH повышает риск грибка и мешает транспирации.`,
          evidence: [
            { label: rh.name, kind: 'FACT', detail: `${rh.value}${rh.unit}` },
            { label: 'Crop target', kind: 'INFERENCE', detail: `RH ${hint.rhMin}–${hint.rhMax}%` },
          ],
        });
      } else if (rh.value! < hint.rhMin - 5) {
        warnings.push({
          severity: 'attention',
          title: 'Влажность ниже цели для культуры',
          detail: `${resolved.commonName}: RH ${rh.value}% при min ${hint.rhMin}%. Возможен стресс и замедление роста.`,
          evidence: [
            { label: rh.name, kind: 'FACT', detail: `${rh.value}${rh.unit}` },
            { label: 'Crop target', kind: 'INFERENCE', detail: `RH ${hint.rhMin}–${hint.rhMax}%` },
          ],
        });
      }
    }
  }

  if (vpd && resolved) {
    const hint = getStageHint(resolved.cropId, context.growStage.stageId);
    if (hint?.vpdMin != null && hint.vpdMax != null) {
      if (vpd.value! < hint.vpdMin - 0.15) {
        observations.push({
          title: 'VPD ниже оптимума',
          detail: `VPD ${vpd.value?.toFixed(2)} kPa — для ${resolved.commonName} на ${context.growStage.stageName} ориентир ${hint.vpdMin}–${hint.vpdMax} kPa. Возможна избыточная влажность.`,
          evidence: [
            { label: 'VPD', kind: 'DERIVED', detail: `${vpd.value} kPa` },
            { label: 'Crop target', kind: 'INFERENCE', detail: `${hint.vpdMin}–${hint.vpdMax} kPa` },
          ],
        });
      } else if (vpd.value! > hint.vpdMax + 0.2) {
        observations.push({
          title: 'VPD выше оптимума',
          detail: `VPD ${vpd.value?.toFixed(2)} kPa — растение может испытывать жажду. Проверьте полив и RH.`,
          evidence: [
            { label: 'VPD', kind: 'DERIVED', detail: `${vpd.value} kPa` },
            { label: 'Crop target', kind: 'INFERENCE', detail: `${hint.vpdMin}–${hint.vpdMax} kPa` },
          ],
        });
      } else {
        observations.push({
          title: 'VPD в рабочем диапазоне',
          detail: `VPD ${vpd.value?.toFixed(2)} kPa — соответствует ориентиру для ${resolved.commonName}.`,
          evidence: [{ label: 'VPD', kind: 'DERIVED', detail: `${vpd.value} kPa` }],
        });
      }
    }
  }

  const hasVentAutomation = context.automations.some(
    (a) => a.enabled && /вент|vent|вытяж/i.test(`${a.name} ${a.actionSummary}`),
  );
  const tempHigh = temp && temp.optimalMax != null && temp.value! > temp.optimalMax;
  const fanOff = !context.equipment.some(
    (e) => (e.type === 'ventilation' || e.name.toLowerCase().includes('вент')) && e.reportedState,
  );

  if (tempHigh && fanOff && !hasVentAutomation && context.dataQuality.hasOutputs) {
    proposedAutomations.push({
      title: 'Автовентиляция по температуре',
      description: 'Шаблон AC Infinity / QBX: включать вентиляцию при перегреве, выключать с гистерезисом.',
      triggerSummary: `Temp > ${(temp!.optimalMax ?? 28) + 1}°C`,
      actionSummary: 'Вентиляция ON → OFF при temp < целевой max',
      reason: 'Температура выше цели, вентиляция выключена, автоматизации нет.',
      confidence: 'medium',
    });
  }

  const soilLow = context.substrate.soilMoistureSensors.find(
    (s) => s.quality === 'fresh' && s.value != null && s.optimalMin != null && s.value < s.optimalMin,
  );
  const hasIrrigationAuto = context.irrigation.wateringOutputs?.some((o) => o.controlMode === 'auto') ?? false;
  if (soilLow && !hasIrrigationAuto && context.dataQuality.hasOutputs) {
    proposedAutomations.push({
      title: 'Автополив по влажности субстрата',
      description: 'Полив до целевого диапазона с ограничением длительности цикла.',
      triggerSummary: `Soil moisture < ${soilLow.optimalMin}%`,
      actionSummary: 'Насос ON до 55% или N минут',
      reason: 'Влажность субстрата ниже цели, автополива нет.',
      confidence: 'medium',
    });
  }

  let summary = base.summary;
  let headline = base.headline;

  if (base.status === 'ok' && context.dataQuality.hasLiveSensorData) {
    headline = resolved
      ? `${resolved.commonName}: микроклимат под контролем`
      : 'Grow Agent на связи';
    summary = resolved
      ? `Локальный анализ для ${resolved.commonName} (${context.growStage.stageName}). ${warnings.length ? `Обнаружено ${warnings.length} предупреждений.` : 'Критичных отклонений по FACT-данным нет.'}`
      : `Локальный анализ по данным QBX${context.meta.dataSource === 'simulator' ? ' (симулятор)' : ''}. Укажите культуру для точных целей.`;
  }

  const nextSteps =
    base.nextSteps.filter((s) => !/запустите ai|ai-анализ/i.test(s)).length > 0
      ? base.nextSteps.filter((s) => !/запустите ai|ai-анализ/i.test(s))
      : recommendations.length
        ? recommendations.slice(0, 3).map((r) => r.suggestedAction)
        : resolved
          ? ['Следите за трендами temp/RH/soil в Agent', 'При необходимости — DeepSeek углубление']
          : ['Укажите культуру в Agent', 'Проверьте датчики temp + RH'];

  const status =
    warnings.some((w) => w.severity === 'critical') ? 'critical' : warnings.length ? 'attention' : base.status;

  const cultivation = isCultivationContext(context) ? context : null;
  const healthScore = cultivation?.health.score;
  const healthLabel = cultivation?.health.label;
  const missingData = cultivation?.missingData ?? base.missingSensors;
  const possibleCauses: string[] = [];

  if (cultivation?.intelligentAlerts.length) {
    for (const alert of cultivation.intelligentAlerts.slice(0, 5)) {
      if (alert.type === 'rapid_change' || alert.type === 'threshold_deviation') {
        observations.push({
          title: alert.title,
          detail: alert.message,
          evidence: alert.evidence.map((e) => ({ label: alert.type, kind: 'DERIVED' as const, detail: e })),
        });
      } else if (alert.severity === 'critical' || alert.severity === 'warning') {
        warnings.push({
          severity: alert.severity === 'critical' ? 'critical' : 'attention',
          title: alert.title,
          detail: alert.trendSummary ? `${alert.message} (${alert.trendSummary})` : alert.message,
          evidence: alert.evidence.map((e) => ({ label: alert.type, kind: 'DERIVED' as const, detail: e })),
        });
        if (alert.type === 'substrate_dryback_anomaly') {
          possibleCauses.push('Ускоренная dryback субстрата — проверьте полив и transpiration');
        }
      }
    }
  }

  const enrichedRecommendations = recommendations.map((r) => ({
    ...r,
    expectedEffect: r.expectedEffect ?? 'Стабилизация микроклимата в целевом диапазоне',
    risk: r.risk ?? 'Требует проверки пользователем — AI не управляет оборудованием',
    requiresUserAction: r.requiresUserAction ?? true,
  }));

  return {
    ...base,
    status,
    headline,
    summary,
    healthScore,
    healthLabel,
    possibleCauses,
    missingData,
    observations: observations.slice(0, 5),
    warnings,
    recommendations: enrichedRecommendations.slice(0, 3),
    questions: [...new Set(questions)],
    proposedAutomations,
    nextSteps,
    evidenceSources: [...new Set(evidenceSources)],
  };
}

export function createExpertAnalysis(
  context: GrowContext | CultivationContext,
  cropProfile?: CropProfile | null,
): GrowAgentAnalysis {
  const base = createLocalAnalysis(context);
  const enriched = enrichWithCropAndClimate(base, context, cropProfile);
  const analysis = attachAnalysisMetadata(enriched, context);
  return { ...analysis, promptVersion: LOCAL_EXPERT_VERSION };
}

export function tryAnswerLocalQuestion(
  context: GrowContext,
  question: string,
  cropProfile?: CropProfile | null,
): string | null {
  const q = question.trim().toLowerCase();
  if (!q) return null;

  const intel = context as GrowContext & Partial<IntelligenceContext>;
  if (intel.digitalTwin && context.space && intel.spatial && context.space.geometry) {
    const map = createEmptySpaceMap(context.space.id);
    map.zones = (intel.spatial.zoneSummaries ?? []).map((z, i) => ({
      id: z.zoneId,
      name: z.name,
      xM: 0,
      yM: 0,
      widthM: (context.space?.lengthM ?? 4) / Math.max(intel.spatial.zoneSummaries.length, 1),
      heightM: context.space?.widthM ?? 3,
    }));
    map.placements = (context.space.geometry.placements ?? []).map((p, i) => ({
      id: `g-${i}`,
      kind: p.kind,
      xM: p.xM,
      yM: p.yM,
      widthM: 0.3,
      heightM: 0.3,
      rotationDeg: 0,
      zoneId: p.zoneId,
      plantId: p.plantId,
      sensorId: p.sensorId,
      outputId: p.outputId,
      deviceId: p.deviceId,
      label: p.kind,
    }));
    const spatialAnswer = answerSpatialQuestion(question, {
      space: {
        id: context.space.id,
        name: context.space.name,
        dimensions: context.space.lengthM
          ? { lengthM: context.space.lengthM, widthM: context.space.widthM ?? 0, heightM: context.space.heightM ?? 0 }
          : undefined,
        areaM2: context.space.areaM2,
      },
      map,
      devices: [],
    });
    if (spatialAnswer) return spatialAnswer;
    if (intel.spatial.insights.length && /карт|зон|датчик|компонов/.test(q)) {
      return `**Карта**\n${intel.spatial.insights
        .slice(0, 5)
        .map((i) => `- ${i.title}: ${i.detail}`)
        .join('\n')}`;
    }
  }

  const analysis = createExpertAnalysis(context, cropProfile);
  const resolved = resolveCrop(context, cropProfile);
  const topics = inferTopicsFromQuestion(question);
  const knowledgeUsed = retrieveKnowledgeContext({
    question,
    topics,
    cropSlug: resolved?.slug,
    maxCharacters: 2000,
  });

  if (/что проверить|что сейчас|что делать сейчас/.test(q)) {
    const parts = [
      `**Сейчас (${analysis.headline})**`,
      analysis.summary,
      analysis.warnings.length
        ? `\n**Внимание:**\n${analysis.warnings.map((w) => `- ${w.title}: ${w.detail}`).join('\n')}`
        : '',
      analysis.recommendations.length
        ? `\n**Рекомендации:**\n${analysis.recommendations.map((r) => `- ${r.title}: ${r.suggestedAction}`).join('\n')}`
        : '',
      analysis.watchItems.length ? `\n**На контроле:** ${analysis.watchItems.join('; ')}` : '',
    ];
    return parts.filter(Boolean).join('\n');
  }

  if (/что делать дальше|следующ/.test(q)) {
    return analysis.nextSteps.length
      ? `**Следующие шаги:**\n${analysis.nextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
      : 'Добавьте датчики и укажите культуру — тогда смогу дать конкретные шаги.';
  }

  if (/включить полив|запустить полив|turn on.*water/.test(q)) {
    const soil = context.substrate.soilMoistureSensors.find((s) => s.quality === 'fresh' && s.value != null);
    return (
      '**Рекомендация (ADVISORY ONLY):**\n' +
      'Я **не включаю** полив автоматически — это решаете вы или Automation Engine.\n' +
      (soil
        ? `Soil moisture: ${soil.value}${soil.unit}. ${soil.optimalMin != null && soil.value! < soil.optimalMin ? 'Ниже цели — можно рассмотреть полив вручную.' : 'В пределах или выше min — спешить не обязательно.'}`
        : 'Нет live soil moisture — не могу обоснованно рекомендовать включение полива.')
    );
  }

  if (/полив|water|irrigation|настроить полив/.test(q)) {
    const soil = context.substrate.soilMoistureSensors.find((s) => s.quality === 'fresh' && s.value != null);
    const lines = [
      '**Полив (локальная база знаний)**',
      '- Цикл «сухо → мокро» лучше постоянной сырости.',
      '- Не поливайте по расписанию без датчика soil moisture — только если нет альтернативы.',
    ];
    if (soil) {
      lines.push(
        `- Сейчас ${soil.name}: **${soil.value}${soil.unit}**${soil.optimalMin != null ? ` (цель от ${soil.optimalMin}%)` : ''}.`,
      );
      if (soil.optimalMin != null && soil.value! < soil.optimalMin) {
        lines.push('- Влажность ниже цели — проверьте полив и дренаж.');
      }
    } else {
      lines.push('- Нет live-данных soil moisture — рекомендации по поливу ограничены.');
    }
    if (resolved) lines.push(`- Для **${resolved.commonName}** см. профиль культуры в базе Agent.`);
    return lines.join('\n');
  }

  if (/автоматизац.*вентил|нужна.*вентил|ventilation/.test(q)) {
    const temp = context.environment.sensors.find((s) => s.type === 'temperature' && s.value != null);
    const fan = context.equipment.find((e) => e.type === 'ventilation' || /вент|вытяж/i.test(e.name));
    const hasAuto = context.automations.some((a) => a.enabled && /вент|vent/i.test(a.name));
    const lines = ['**Вентиляция**'];
    if (temp) lines.push(`- Температура: ${temp.value}${temp.unit}${temp.optimalMax ? ` (max ${temp.optimalMax})` : ''}.`);
    if (fan) lines.push(`- ${fan.name}: ${fan.reportedState ? 'ON' : 'OFF'} (${fan.controlMode}).`);
    if (hasAuto) {
      lines.push('- Автоматизация вентиляции уже есть — проверьте пороги и гистерезис 2–3°C.');
    } else if (temp && temp.optimalMax && temp.value! > temp.optimalMax) {
      lines.push('- **Да**, имеет смысл автоматизация: temp выше цели. Шаблон: ON при >max+1°C, OFF при <max.');
    } else {
      lines.push('- Пока перегрева нет — автоматизация опциональна, но полезна для стабильности.');
    }
    return lines.join('\n');
  }

  if (/vpd|влажност|rh\b|испар/.test(q)) {
    const vpd = context.environment.derivedMetrics.find((m) => m.id === 'vpd');
    const rh = context.environment.sensors.find((s) => s.type === 'humidity' && s.value != null);
    const lines = ['**VPD / влажность**'];
    if (vpd?.available && vpd.value != null) lines.push(`- VPD (расчёт): **${vpd.value.toFixed(2)} kPa**`);
    if (rh) lines.push(`- RH: **${rh.value}${rh.unit}**`);
    if (resolved) {
      const hint = getStageHint(resolved.cropId, context.growStage.stageId);
      if (hint) lines.push(`- Для ${resolved.commonName}: RH ${hint.rhMin}–${hint.rhMax}%, VPD ~${hint.vpdMin ?? '?'}-${hint.vpdMax ?? '?'} kPa.`);
    }
    lines.push('- VPD связывает temp и RH: при той же RH VPD растёт с температурой.');
    return lines.join('\n');
  }

  if (/культур|что раст|томат|огур|перец|базил|салат|клубник|microgreen|микрозел/.test(q)) {
    if (resolved) {
      return `По контексту определена культура **${resolved.commonName}** (${resolved.cropId}). Стадия: ${context.growStage.stageName}. Цели и типичные проблемы — в локальной базе Agent. ${analysis.summary}`;
    }
    return 'Культура не указана. Выберите её в Agent (томат, огурец, перец, салат, базилик, клубника, микрозелень) — подставлю цели по стадии.';
  }

  if (/главн.*риск|что изменилось|за последние сутки/.test(q)) {
    const alerts = isCultivationContext(context) ? context.intelligentAlerts.slice(0, 3) : [];
    if (alerts.length) {
      return `**Главные сигналы:**\n${alerts.map((a) => `- ${a.title}: ${a.message}`).join('\n')}`;
    }
    return analysis.summary;
  }

  if (/какие датчик|что поставить|sensor/.test(q)) {
    const missing = isCultivationContext(context) ? context.missingData : context.dataQuality.missingSensors;
    return missing.length
      ? `**Полезные датчики:**\n${missing.map((m) => `- ${m}`).join('\n')}`
      : 'Базовый набор temp + RH + soil moisture уже покрывает основные рекомендации.';
  }

  if (topics.length > 0 && knowledgeUsed.length > 100) {
    return `По вашему вопросу могу опираться на локальную базу знаний QBX${resolved ? ` (${resolved.commonName})` : ''}. Уточните вопрос или нажмите «DeepSeek углубление» для развёрнутого ответа.\n\nКратко: ${analysis.summary}`;
  }

  return null;
}

export function getExpertRecommendations(context: GrowContext, cropProfile?: CropProfile | null): GrowAgentRecommendation[] {
  return createExpertAnalysis(context, cropProfile).recommendations;
}

export function getExpertProposedAutomations(
  context: GrowContext,
  cropProfile?: CropProfile | null,
): ProposedAutomation[] {
  return createExpertAnalysis(context, cropProfile).proposedAutomations;
}
