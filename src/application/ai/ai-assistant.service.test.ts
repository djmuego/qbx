import { describe, expect, it } from 'vitest';
import { AIAssistantService } from './ai-assistant.service';
import type { GrowTelemetryContext } from '../../domain/ai/knowledge-base.types';

describe('AIAssistantService.buildPrompt', () => {
  const telemetry: GrowTelemetryContext = {
    spaceName: 'Tent 100',
    stage: 'vegetation',
    tempC: 24,
    humidityPct: 55,
    vpdKpa: 1.1,
    soilMoisturePct: 42,
    lightStatus: 'ON',
    hoursInCurrentPhase: 120,
  };

  it('includes telemetry and knowledge chunks', () => {
    const prompt = AIAssistantService.buildPrompt({
      telemetry,
      knowledgeChunks: ['## VPD\nTarget 0.8-1.2 kPa'],
      userQuery: 'Нормальный ли VPD?',
    });
    expect(prompt).toContain('24');
    expect(prompt).toContain('VPD');
    expect(prompt).toContain('Нормальный ли VPD?');
  });

  it('reserves vision attachment block', () => {
    const prompt = AIAssistantService.buildPrompt({
      telemetry,
      knowledgeChunks: [],
      userQuery: 'Что с листом?',
      visionAttachments: [{ mimeType: 'image/jpeg', dataOrUrl: 'abc123', caption: 'lower leaf' }],
    });
    expect(prompt).toContain('ВИЗУАЛЬНЫЙ КОНТЕКСТ');
    expect(prompt).toContain('lower leaf');
  });
});
