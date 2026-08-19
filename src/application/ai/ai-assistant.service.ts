import type { GrowContext } from '../../domain/ai/grow-context.types';
import type {
  AgronomistPromptInput,
  GrowTelemetryContext,
  KnowledgeChunkMatch,
  VisionAttachment,
} from '../../domain/ai/knowledge-base.types';
import { calculateVpdKpa } from '../../domain/agronomy/vpd';
import { getSupabaseClient } from '../../infrastructure/supabase/client';
import { isSupabaseConfigured } from '../../infrastructure/supabase/config';
import { embedQuery } from './knowledge/embedding.service';
import { searchLocalKnowledgeChunks } from './knowledge/local-knowledge.store';

export class AIAssistantService {
  /**
   * Vector search over published knowledge chunks (Supabase pgvector or local fallback).
   */
  static async retrieveRelevantContext(
    query: string,
    options?: { matchCount?: number; threshold?: number },
  ): Promise<string[]> {
    const matches = await AIAssistantService.retrieveChunkMatches(query, options);
    return matches.map(
      (m) => `## ${m.articleTitle} (${m.articleSlug})\n[similarity: ${m.similarity.toFixed(2)}]\n\n${m.chunkContent}`,
    );
  }

  static async retrieveChunkMatches(
    query: string,
    options?: { matchCount?: number; threshold?: number },
  ): Promise<KnowledgeChunkMatch[]> {
    const matchCount = options?.matchCount ?? 6;
    const threshold = options?.threshold ?? 0.45;
    const trimmed = query.trim();
    if (!trimmed) return [];

    if (!isSupabaseConfigured()) {
      return searchLocalKnowledgeChunks(trimmed, matchCount, threshold);
    }

    try {
      const embedding = await embedQuery(trimmed);
      const client = getSupabaseClient();
      if (!client) {
        return searchLocalKnowledgeChunks(trimmed, matchCount, threshold);
      }
      const { data, error } = await client.rpc('match_knowledge_chunks', {
        query_embedding: embedding,
        match_count: matchCount,
        match_threshold: threshold,
      });
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: Record<string, unknown>) => ({
        id: String(row.id),
        articleId: String(row.article_id),
        articleTitle: String(row.article_title ?? ''),
        articleSlug: String(row.article_slug ?? ''),
        chunkContent: String(row.chunk_content ?? ''),
        similarity: Number(row.similarity ?? 0),
      }));
    } catch {
      return searchLocalKnowledgeChunks(trimmed, matchCount, threshold);
    }
  }

  static buildPrompt(input: AgronomistPromptInput): string {
    const { telemetry, knowledgeChunks, userQuery, visionAttachments } = input;
    const visionBlock =
      visionAttachments && visionAttachments.length > 0
        ? `\nВИЗУАЛЬНЫЙ КОНТЕКСТ (фото листа/растения — ${visionAttachments.length} шт.):\n${visionAttachments
            .map((v, i) => `- [image ${i + 1}] ${v.caption ?? v.mimeType} (${v.dataOrUrl.startsWith('http') ? 'url' : 'base64'})`)
            .join('\n')}\nСравни видимые симптомы с базой знаний по дефицитам.\n`
        : '';

    return `
Ты — профессиональный AI-агроном QBX Smart Growing.
Твоя цель — помогать гроверу безопасно и эффективно выращивать культуру, опираясь ТОЛЬКО на физику процессов и базу знаний QBX.

ТЕКУЩЕЕ СОСТОЯНИЕ БОКСА:
- Пространство: ${telemetry.spaceName}
- Фаза: ${telemetry.stage}
- Температура: ${telemetry.tempC ?? 'N/A'}°C
- Влажность: ${telemetry.humidityPct ?? 'N/A'}%
- Текущий VPD: ${telemetry.vpdKpa ?? 'N/A'} kPa
- Влажность субстрата: ${telemetry.soilMoisturePct ?? 'N/A'}%
- Свет: ${telemetry.lightStatus}
- Часов в текущей фазе: ${telemetry.hoursInCurrentPhase ?? 'N/A'}
${visionBlock}
БАЗА ЗНАНИЙ QBX (Используй как эталон):
${knowledgeChunks.join('\n\n')}

ВОПРОС / ПРОБЛЕМА:
${userQuery}

ПРАВИЛА ОТВЕТА:
1. Давай краткие, практические рекомендации с цифрами.
2. Если параметры выходят за рамки целевого VPD/стадии — укажи, что именно изменить в оборудовании.
3. Если предлагаешь автоматизацию, формулируй её в виде понятного правила для Twin Controls.
4. Не выдумывай факты вне базы знаний — если данных недостаточно, скажи что измерить или уточнить.
`.trim();
  }
}

export function buildGrowTelemetryContext(context: GrowContext): GrowTelemetryContext {
  const tempSensor = context.environment.sensors.find(
    (s) => s.type === 'temperature' && s.available && s.value != null,
  );
  const humiditySensor = context.environment.sensors.find(
    (s) => s.type === 'humidity' && s.available && s.value != null,
  );
  const soilSensor =
    context.substrate.soilMoistureSensors.find((s) => s.available && s.value != null) ??
    context.environment.sensors.find((s) => s.type === 'soil_moisture' && s.available && s.value != null);

  const tempC = tempSensor?.value ?? null;
  const humidityPct = humiditySensor?.value ?? null;
  const vpdMetric = context.environment.derivedMetrics.find((m) => m.id === 'vpd' && m.available);
  const vpdKpa =
    vpdMetric?.value ??
    (tempC != null && humidityPct != null ? calculateVpdKpa(tempC, humidityPct) : null);

  const lightOutputs = context.equipment.filter(
    (e) => e.type === 'light' || e.role === 'lighting' || e.role === 'light',
  );
  const lightOn = lightOutputs.some((e) => e.reportedState === true);
  const lightOff = lightOutputs.some((e) => e.reportedState === false);
  const lightStatus: GrowTelemetryContext['lightStatus'] = lightOn ? 'ON' : lightOff ? 'OFF' : 'UNKNOWN';

  const stageRaw = `${context.growStage.stageId} ${context.growStage.stageName} ${context.growStage.legacyGrowPhase}`.toLowerCase();
  let stage: GrowTelemetryContext['stage'] = 'unknown';
  if (/seed|расса|проращ/i.test(stageRaw)) stage = 'seedling';
  else if (/veg|вегет/i.test(stageRaw)) stage = 'vegetation';
  else if (/flower|цветен|бутон/i.test(stageRaw)) stage = 'flowering';
  else if (/flush|промыв/i.test(stageRaw)) stage = 'flush';

  const startedAt = context.growRun.startedAt ?? context.crop.startedAt;
  const hoursInCurrentPhase =
    startedAt != null
      ? Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 3_600_000))
      : null;

  return {
    spaceName: context.space?.name ?? 'Grow space',
    stage,
    tempC,
    humidityPct,
    vpdKpa,
    soilMoisturePct: soilSensor?.value ?? null,
    lightStatus,
    hoursInCurrentPhase,
  };
}

export type { VisionAttachment };
