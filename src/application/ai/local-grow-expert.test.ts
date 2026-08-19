import { describe, expect, it } from 'vitest';
import { buildGrowContext } from './grow-context.builder';
import type { Device } from '../../domain/device/device.types';
import type { Space } from '../../domain/space/space.types';
import { resolveCrop, listCropOptions } from './knowledge/crop-resolver';
import { retrieveKnowledgeContext, inferTopicsFromQuestion } from './knowledge/knowledge-retrieval';
import { createExpertAnalysis, tryAnswerLocalQuestion } from './local-grow-expert';
import { analyzeGrowContext } from './grow-agent.service';
import { createCropProfile } from './crop-profile.store';

const space: Space = { id: 'space-1', name: 'Теплица томатов', areaM2: 12, volumeM3: 36 };

const deviceWithClimate = (): Device => ({
  id: 'dev-1',
  spaceId: 'space-1',
  modelId: 'qbx-hub',
  model: 'qbx-hub',
  modelName: 'QBX Hub',
  name: 'Hub',
  customName: 'Контроллер',
  status: 'online',
  isOnline: true,
  capabilities: {
    sensorInputCount: 4,
    outputCount: 4,
    supportedSensorTypes: ['temperature', 'humidity'],
    supportedOutputTypes: ['ventilation'],
    specialCapabilities: [],
  },
  sensors: [],
  inputs: [
    {
      id: 'in-temp',
      portNumber: 1,
      hardwareLabel: 'IN1',
      type: 'temperature',
      name: 'Температура',
      customName: 'Температура воздуха',
      value: 29,
      currentValue: 29,
      unit: '°C',
      optimalMin: 21,
      optimalMax: 27,
      status: 'high',
      visibleOnHome: true,
      showOnHome: true,
      history: [],
    },
    {
      id: 'in-rh',
      portNumber: 2,
      hardwareLabel: 'IN2',
      type: 'humidity',
      name: 'Влажность',
      customName: 'Влажность воздуха',
      value: 72,
      currentValue: 72,
      unit: '%',
      optimalMin: 45,
      optimalMax: 65,
      status: 'high',
      visibleOnHome: true,
      showOnHome: true,
      history: [],
    },
  ],
  outputs: [
    {
      id: 'out-fan',
      portNumber: 1,
      hardwareLabel: 'OUT1',
      type: 'ventilation',
      name: 'Вентилятор',
      customName: 'Вытяжка',
      state: false,
      controlMode: 'manual',
      isAuto: false,
    },
  ],
  firmwareVersion: '0.0.0',
  serialNumber: 'SN-1',
  addedAt: '2026-08-18T00:00:00Z',
});

describe('Local Grow Expert', () => {
  it('lists crop library entries', () => {
    const crops = listCropOptions();
    expect(crops.length).toBeGreaterThanOrEqual(7);
    expect(crops.some((c) => c.cropId === 'tomato')).toBe(true);
  });

  it('resolves crop from profile and space text', () => {
    const context = buildGrowContext({
      space,
      growPhase: 'vegetation',
      devices: [],
      automations: [],
      isEmergencyActive: false,
      getSensorHistory: () => [],
    });
    const profile = createCropProfile('tomato', 'Томат');
    expect(resolveCrop(context, profile)?.cropId).toBe('tomato');

    const fromText = buildGrowContext({
      space: { ...space, description: 'Выращиваем черри томаты' },
      growPhase: 'vegetation',
      devices: [],
      automations: [],
      isEmergencyActive: false,
      getSensorHistory: () => [],
    });
    expect(resolveCrop(fromText, null)?.cropId).toBe('tomato');
  });

  it('retrieves selective knowledge with crop slug', () => {
    const ctx = retrieveKnowledgeContext({ cropSlug: 'crops--tomato', maxCharacters: 5000 });
    expect(ctx).toMatch(/Томат|tomato/i);
    expect(ctx.length).toBeLessThanOrEqual(5000);
  });

  it('inferTopicsFromQuestion detects irrigation', () => {
    expect(inferTopicsFromQuestion('Как настроить полив?')).toContain('irrigation');
  });

  it('createExpertAnalysis uses local expert source without gateway prompt', () => {
    const context = buildGrowContext({
      space,
      growPhase: 'vegetation',
      cropProfile: createCropProfile('tomato', 'Томат'),
      devices: [deviceWithClimate()],
      automations: [],
      isEmergencyActive: false,
      getSensorHistory: () => [],
    });
    const analysis = createExpertAnalysis(context, createCropProfile('tomato', 'Томат'));
    expect(analysis.evidenceSources.some((s) => s.includes('LOCAL EXPERT'))).toBe(true);
    expect(analysis.summary).not.toMatch(/запустите ai/i);
    expect(analysis.evidenceSources.some((s) => s.includes('Crop library'))).toBe(true);
  });

  it('tryAnswerLocalQuestion handles quick prompts without API', () => {
    const context = buildGrowContext({
      space,
      growPhase: 'vegetation',
      cropProfile: createCropProfile('tomato', 'Томат'),
      devices: [deviceWithClimate()],
      automations: [],
      isEmergencyActive: false,
      getSensorHistory: () => [],
    });
    const answer = tryAnswerLocalQuestion(context, 'Что проверить сейчас?', createCropProfile('tomato', 'Томат'));
    expect(answer).toBeTruthy();
    expect(answer).toMatch(/Сейчас|температур|VPD/i);
  });

  it('analyzeGrowContext defaults to local expert (no mock API)', async () => {
    const context = buildGrowContext({
      space,
      growPhase: 'vegetation',
      devices: [deviceWithClimate()],
      automations: [],
      isEmergencyActive: false,
      getSensorHistory: () => [],
    });
    const analysis = await analyzeGrowContext(
      context,
      { enabled: true, provider: 'deepseek', model: 'deepseek-chat', localExpertFirst: true, useGatewayForChat: false },
      { cropProfile: createCropProfile('tomato', 'Томат') },
    );
    expect(analysis.evidenceSources.some((s) => s.includes('LOCAL EXPERT'))).toBe(true);
  });
});
