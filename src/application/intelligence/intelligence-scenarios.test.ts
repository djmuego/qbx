import { describe, expect, it } from 'vitest';
import { buildIntelligenceContext } from './intelligence-context.builder';
import { createExpertAnalysis } from '../ai/local-grow-expert';
import type { Device } from '../../domain/device/device.types';
import type { Space } from '../../domain/space/space.types';
import { createCropProfile } from '../ai/crop-profile.store';

const space: Space = { id: 's1', name: 'Tent', areaM2: 4 };

function baseDevice(overrides: Partial<Device> = {}): Device {
  return {
    id: 'd1',
    spaceId: 's1',
    modelId: 'qbx-hub',
    model: 'qbx-hub',
    modelName: 'Hub',
    name: 'Hub',
    customName: 'Hub',
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
        id: 't1',
        portNumber: 1,
        hardwareLabel: 'IN1',
        type: 'temperature',
        name: 'Temp',
        customName: 'Temp',
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
        id: 'h1',
        portNumber: 2,
        hardwareLabel: 'IN2',
        type: 'humidity',
        name: 'RH',
        customName: 'RH',
        value: 70,
        currentValue: 70,
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
        id: 'fan1',
        portNumber: 1,
        hardwareLabel: 'OUT1',
        type: 'ventilation',
        name: 'Вентиляция',
        customName: 'Вентиляция',
        state: true,
        controlMode: 'manual',
        isAuto: false,
      },
    ],
    firmwareVersion: '0',
    serialNumber: 'SN',
    addedAt: '2026-08-18',
    ...overrides,
  };
}

describe('Intelligence Foundation V2 scenarios', () => {
  it('Scenario A: fan ON but temp still rising — no "turn fan on"', () => {
    const ctx = buildIntelligenceContext({
      space,
      growPhase: 'vegetation',
      cropProfile: createCropProfile('tomato', 'Томат'),
      devices: [baseDevice()],
      automations: [],
      isEmergencyActive: false,
      getSensorHistory: (id) =>
        id === 't1'
          ? Array.from({ length: 20 }, (_, i) => ({ time: `${i}`, value: 26 + i * 0.2 }))
          : [],
    });

    expect(ctx.anomalies.some((a) => a.kind === 'fan_no_effect')).toBe(true);
    const analysis = createExpertAnalysis(ctx, createCropProfile('tomato', 'Томат'));
    expect(analysis.recommendations.some((r) => /включ.*вентил/i.test(r.suggestedAction))).toBe(false);
    expect(ctx.escalation.level).toBe('LOCAL_ONLY');
  });

  it('Scenario B: pump ran 3x, substrate moisture falling', () => {
    const dev = baseDevice();
    dev.inputs.push({
      id: 'soil1',
      portNumber: 3,
      hardwareLabel: 'IN3',
      type: 'soil_moisture',
      name: 'Soil',
      customName: 'Soil',
      value: 35,
      currentValue: 35,
      unit: '%',
      optimalMin: 45,
      optimalMax: 65,
      status: 'low',
      visibleOnHome: true,
      showOnHome: true,
      history: [],
    });
    dev.outputs.push({
      id: 'pump1',
      portNumber: 2,
      hardwareLabel: 'OUT2',
      type: 'watering',
      name: 'Насос',
      customName: 'Насос',
      state: true,
      controlMode: 'auto',
      isAuto: true,
    });

    const ctx = buildIntelligenceContext({
      space,
      growPhase: 'vegetation',
      devices: [dev],
      automations: [],
      isEmergencyActive: false,
      recentEvents: [
        { id: '1', type: 'OUTPUT_ON', timestampMs: 1, message: 'poliv pump' },
        { id: '2', type: 'OUTPUT_ON', timestampMs: 2, message: 'poliv pump' },
        { id: '3', type: 'OUTPUT_ON', timestampMs: 3, message: 'poliv pump' },
      ],
      getSensorHistory: (id) =>
        id === 'soil1'
          ? Array.from({ length: 12 }, (_, i) => ({ time: `${i}`, value: 50 - i * 2 }))
          : [],
    });

    expect(ctx.irrigationAnalysis?.anomalyDetected).toBe(true);
    expect(ctx.anomalies.some((a) => a.kind === 'irrigation_no_response')).toBe(true);
  });

  it('Scenario F: no hardware — honest no-data', () => {
    const ctx = buildIntelligenceContext({
      space,
      growPhase: 'vegetation',
      devices: [],
      automations: [],
      isEmergencyActive: false,
      getSensorHistory: () => [],
    });
    ctx.meta.runtimeMode = 'hardware';

    expect(ctx.health.score).toBe(0);
    expect(ctx.plantState.overallStatus).toBe('unknown');
    expect(ctx.dataQuality.hasLiveSensorData).toBe(false);
  });

  it('escalation defaults to LOCAL_ONLY without user LLM request', () => {
    const ctx = buildIntelligenceContext({
      space,
      growPhase: 'vegetation',
      devices: [baseDevice()],
      automations: [],
      isEmergencyActive: false,
      getSensorHistory: () => [],
    });
    expect(ctx.escalation.level).toBe('LOCAL_ONLY');
  });

  it('knowledge coverage reports honest limitations', () => {
    const ctx = buildIntelligenceContext({
      space,
      growPhase: 'vegetation',
      cropProfile: createCropProfile('tomato', 'Томат'),
      devices: [baseDevice()],
      automations: [],
      isEmergencyActive: false,
      getSensorHistory: () => [],
    });
    expect(ctx.knowledgeCoverage.overallPercent).toBeGreaterThan(0);
    expect(ctx.knowledgeCoverage.dimensions.length).toBeGreaterThan(3);
  });
});
