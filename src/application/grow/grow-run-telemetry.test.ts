import { describe, expect, it, vi } from 'vitest';
import type { Device } from '../../domain/device/device.types';
import { buildRuntimeTelemetrySlice, hasTelemetryData } from './grow-run-telemetry.service';
import { captureRuntimeTelemetrySlice, summarizeGrowRunTelemetry } from './grow-run-telemetry.store';

const device: Device = {
  id: 'dev-1',
  spaceId: 'space-1',
  modelId: 'qbx-hub',
  model: 'qbx-hub',
  modelName: 'QBX Hub',
  name: 'Hub',
  customName: 'Hub',
  status: 'online',
  isOnline: true,
  capabilities: {
    sensorInputCount: 2,
    outputCount: 1,
    supportedSensorTypes: ['temperature', 'humidity'],
    supportedOutputTypes: ['lighting'],
    specialCapabilities: [],
  },
  sensors: [],
  inputs: [
    {
      id: 'in-t',
      portNumber: 1,
      hardwareLabel: 'T1',
      type: 'temperature',
      name: 'Air temp',
      customName: 'Air temp',
      value: 24.5,
      currentValue: 24.5,
      unit: '°C',
      optimalMin: 20,
      optimalMax: 28,
      status: 'normal',
      visibleOnHome: true,
      showOnHome: true,
      history: [],
    },
    {
      id: 'in-h',
      portNumber: 2,
      hardwareLabel: 'H1',
      type: 'humidity',
      name: 'RH',
      customName: 'RH',
      value: 55,
      currentValue: 55,
      unit: '%',
      optimalMin: 40,
      optimalMax: 70,
      status: 'normal',
      visibleOnHome: true,
      showOnHome: true,
      history: [],
    },
  ],
  outputs: [
    {
      id: 'out-l',
      portNumber: 1,
      hardwareLabel: 'L1',
      type: 'lighting',
      name: 'Light',
      customName: 'Light',
      state: true,
      controlMode: 'auto',
      isAuto: true,
    },
  ],
  firmwareVersion: '1.0',
  serialNumber: 'SN1',
  addedAt: '2026-01-01',
};

describe('grow-run-telemetry', () => {
  it('builds slice from live devices', () => {
    const slice = buildRuntimeTelemetrySlice([device], 'space-1');
    expect(slice.tempC).toBe(24.5);
    expect(slice.humidityPct).toBe(55);
    expect(slice.vpdKpa).not.toBeNull();
    expect(slice.lightOn).toBe(true);
    expect(hasTelemetryData(slice)).toBe(true);
  });

  it('stores samples with throttle in localStorage', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    });

    const sample = captureRuntimeTelemetrySlice('space-1', 'run-1', {
      tempC: 24,
      humidityPct: 50,
      vpdKpa: 1,
      soilMoisturePct: null,
      lightOn: true,
    });
    expect(sample?.growRunId).toBe('run-1');
    const summary = summarizeGrowRunTelemetry('space-1', 'run-1');
    expect(summary.sampleCount).toBe(1);

    vi.unstubAllGlobals();
  });
});
