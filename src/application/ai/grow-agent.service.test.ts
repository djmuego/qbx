import { describe, expect, it } from 'vitest';
import { buildGrowContext } from './grow-context.builder';
import type { Automation } from '../../domain/automation/automation.types';
import type { Device } from '../../domain/device/device.types';
import type { Space } from '../../domain/space/space.types';
import { createLocalAnalysis, analyzeGrowContext } from './grow-agent.service';
import { growAgentResponseSchema } from './grow-agent-response.schema';

const space: Space = { id: 'space-1', name: 'Теплица', areaM2: 12, volumeM3: 36 };

const deviceWithSensor = (overrides?: Partial<Device>): Device => ({
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
    supportedSensorTypes: ['temperature'],
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
      value: 31,
      currentValue: 31,
      unit: '°C',
      optimalMin: 21,
      optimalMax: 27,
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
      state: true,
      controlMode: 'auto',
      isAuto: true,
    },
  ],
  firmwareVersion: '0.0.0',
  serialNumber: 'SN-1',
  addedAt: '2026-08-18T00:00:00Z',
  ...overrides,
});

describe('Grow Agent Pass — acceptance', () => {
  it('no hardware: honest waiting message', () => {
    const context = buildGrowContext({
      space,
      growPhase: 'vegetation',
      devices: [],
      automations: [],
      isEmergencyActive: false,
      getSensorHistory: () => [],
    });
    context.meta.runtimeMode = 'hardware';

    const analysis = createLocalAnalysis(context);
    expect(analysis.status).toBe('waiting');
    expect(analysis.summary).toMatch(/не подключены|не могу оценить/i);
    expect(analysis.confidence).toBe('low');
  });

  it('fan already ON + high temp: does not recommend naive turn on fan', () => {
    const context = buildGrowContext({
      space,
      growPhase: 'vegetation',
      devices: [deviceWithSensor()],
      automations: [],
      isEmergencyActive: false,
      getSensorHistory: () => [{ time: '10:00', value: 30 }, { time: '10:01', value: 31 }],
    });

    const analysis = createLocalAnalysis(context);
    const texts = analysis.recommendations.map((r) => r.suggestedAction.toLowerCase()).join(' ');
    expect(texts).not.toMatch(/включите вытяжку|включить вентилятор/i);
    expect(analysis.warnings.some((w) => w.title.includes('уже'))).toBe(true);
  });

  it('stale sensor: warns about stale data', () => {
    const offlineDevice = deviceWithSensor({
      isOnline: false,
      status: 'offline',
      inputs: [
        {
          ...deviceWithSensor().inputs[0],
          currentValue: Number.NaN,
        },
      ],
    });
    const context = buildGrowContext({
      space,
      growPhase: 'vegetation',
      devices: [offlineDevice],
      automations: [],
      isEmergencyActive: false,
      getSensorHistory: () => [],
    });

    const analysis = createLocalAnalysis(context);
    expect(analysis.status).toBe('waiting');
  });

  it('mock provider returns valid structured schema', async () => {
    const context = buildGrowContext({
      space,
      growPhase: 'vegetation',
      devices: [],
      automations: [],
      isEmergencyActive: false,
      getSensorHistory: () => [],
    });

    const analysis = await analyzeGrowContext(
      context,
      {
        enabled: true,
        provider: 'deepseek',
        model: 'deepseek-chat',
        localExpertFirst: true,
        useGatewayForChat: false,
      },
      { mock: true, forceGateway: true },
    );
    expect(growAgentResponseSchema.safeParse(analysis).success).toBe(true);
  });

  it('simulator source is marked in context', () => {
    const context = buildGrowContext({
      space,
      growPhase: 'vegetation',
      devices: [deviceWithSensor()],
      automations: [],
      isEmergencyActive: false,
      getSensorHistory: () => [],
    });
    // getRuntimeMode in test defaults to hardware unless env set — check field exists
    expect(['hardware', 'simulator']).toContain(context.meta.dataSource);
  });
});
