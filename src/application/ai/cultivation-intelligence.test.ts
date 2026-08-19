import { describe, expect, it } from 'vitest';
import { buildGrowContext } from './grow-context.builder';
import { buildCultivationContext } from './cultivation-context.builder';
import { computeSpaceHealth } from './space-health.service';
import { analyzeTrends } from './trend-analyzer';
import type { Device } from '../../domain/device/device.types';
import type { Space } from '../../domain/space/space.types';
import { createCropProfile } from './crop-profile.store';

const space: Space = { id: 's1', name: 'Tent', areaM2: 4 };

const device = (): Device => ({
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
  outputs: [],
  firmwareVersion: '0',
  serialNumber: 'SN',
  addedAt: '2026-08-18',
});

describe('Cultivation Intelligence Pass', () => {
  it('buildCultivationContext adds health, alerts, missingData', () => {
    const ctx = buildCultivationContext({
      space,
      growPhase: 'vegetation',
      cropProfile: createCropProfile('tomato', 'Томат'),
      devices: [device()],
      automations: [],
      isEmergencyActive: false,
      getSensorHistory: (id) =>
        id === 't1'
          ? [
              { time: '09:00', value: 26 },
              { time: '10:00', value: 29 },
            ]
          : [],
    });

    expect(ctx.health.score).toBeGreaterThan(0);
    expect(ctx.health.factors.length).toBeGreaterThan(3);
    expect(ctx.intelligentAlerts.length).toBeGreaterThan(0);
    expect(ctx.missingData.length).toBeGreaterThan(0);
    expect(ctx.environment.derivedMetrics.find((m) => m.id === 'vpd')?.available).toBe(true);
  });

  it('hardware empty: health score zero, no fake temp', () => {
    const ctx = buildCultivationContext({
      space,
      growPhase: 'vegetation',
      devices: [],
      automations: [],
      isEmergencyActive: false,
      getSensorHistory: () => [],
    });
    ctx.meta.runtimeMode = 'hardware';

    expect(ctx.health.score).toBe(0);
    expect(ctx.health.label).toBe('Нет данных');
    expect(ctx.environment.sensors.every((s) => s.value == null || !ctx.dataQuality.hasLiveSensorData)).toBe(true);
  });

  it('SpaceHealthService uses deterministic factors', () => {
    const base = buildGrowContext({
      space,
      growPhase: 'vegetation',
      devices: [device()],
      automations: [],
      isEmergencyActive: false,
      getSensorHistory: () => [],
    });
    const health = computeSpaceHealth(base);
    expect(health.factors.some((f) => f.id === 'temperature')).toBe(true);
    expect(health.factors.some((f) => f.id === 'vpd')).toBe(true);
  });

  it('TrendAnalyzer detects rapid temperature rise', () => {
    const base = buildGrowContext({
      space,
      growPhase: 'vegetation',
      devices: [device()],
      automations: [],
      isEmergencyActive: false,
      getSensorHistory: (id) =>
        id === 't1'
          ? Array.from({ length: 20 }, (_, i) => ({ time: `${i}`, value: 24 + i * 0.3 }))
          : [],
    });
    const alerts = analyzeTrends(base);
    expect(alerts.some((a) => a.type === 'rapid_change')).toBe(true);
  });
});
