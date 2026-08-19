import type {
  GrowRunTelemetryCycleStats,
  GrowRunTelemetrySample,
  GrowRunTelemetrySummary,
} from '../../domain/grow/grow-run-telemetry.types';
import { getRuntimeMode } from '../../config/runtime-mode';

const STORAGE_KEY = 'qbx_grow_run_telemetry_v1';
const MAX_SAMPLES_PER_RUN = 2000;
const SAMPLE_INTERVAL_MS = 60_000;

function key(spaceId: string, growRunId: string): string {
  return `${STORAGE_KEY}_${spaceId}_${growRunId}`;
}

function hasBrowserStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

export function loadGrowRunTelemetry(spaceId: string, growRunId: string): GrowRunTelemetrySample[] {
  if (!spaceId || !growRunId || !hasBrowserStorage()) return [];
  try {
    const raw = localStorage.getItem(key(spaceId, growRunId));
    return raw ? (JSON.parse(raw) as GrowRunTelemetrySample[]) : [];
  } catch {
    return [];
  }
}

export function appendGrowRunTelemetrySample(
  spaceId: string,
  sample: Omit<GrowRunTelemetrySample, 'id'>,
): GrowRunTelemetrySample | null {
  if (!spaceId || !hasBrowserStorage()) return null;
  const existing = loadGrowRunTelemetry(spaceId, sample.growRunId);
  const last = existing[existing.length - 1];
  if (last && sample.timestampMs - last.timestampMs < SAMPLE_INTERVAL_MS - 500) {
    return null;
  }

  const full: GrowRunTelemetrySample = {
    ...sample,
    id: `grt-${sample.timestampMs}-${Math.random().toString(36).slice(2, 6)}`,
  };
  const next = [...existing, full].slice(-MAX_SAMPLES_PER_RUN);
  localStorage.setItem(key(spaceId, sample.growRunId), JSON.stringify(next));
  scheduleTelemetryCloudSave(spaceId, sample.growRunId, next);
  return full;
}

const telemetryCloudTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleTelemetryCloudSave(
  spaceId: string,
  growRunId: string,
  samples: GrowRunTelemetrySample[],
): void {
  const timerKey = `${spaceId}:${growRunId}`;
  const existingTimer = telemetryCloudTimers.get(timerKey);
  if (existingTimer) clearTimeout(existingTimer);
  const timer = setTimeout(() => {
    telemetryCloudTimers.delete(timerKey);
    void import('./grow-run-cloud.persistence').then((m) =>
      m.cloudSaveGrowRunTelemetry(spaceId, growRunId, samples),
    );
  }, 3000);
  telemetryCloudTimers.set(timerKey, timer);
}

export function replaceGrowRunTelemetry(
  spaceId: string,
  growRunId: string,
  samples: GrowRunTelemetrySample[],
): void {
  if (!spaceId || !growRunId || !hasBrowserStorage()) return;
  localStorage.setItem(key(spaceId, growRunId), JSON.stringify(samples.slice(-MAX_SAMPLES_PER_RUN)));
}

export function summarizeGrowRunTelemetry(spaceId: string, growRunId: string): GrowRunTelemetrySummary {
  const samples = loadGrowRunTelemetry(spaceId, growRunId);
  return {
    growRunId,
    sampleCount: samples.length,
    firstSampleAt: samples[0]?.timestampMs ?? null,
    lastSampleAt: samples[samples.length - 1]?.timestampMs ?? null,
  };
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function computeGrowRunCycleStats(spaceId: string, growRunId: string): GrowRunTelemetryCycleStats {
  const samples = loadGrowRunTelemetry(spaceId, growRunId);
  const temps = samples.map((s) => s.tempC).filter((v): v is number => v != null);
  const humidity = samples.map((s) => s.humidityPct).filter((v): v is number => v != null);
  const vpd = samples.map((s) => s.vpdKpa).filter((v): v is number => v != null);
  return {
    growRunId,
    sampleCount: samples.length,
    tempAvgC: avg(temps),
    tempMinC: temps.length ? Math.min(...temps) : null,
    tempMaxC: temps.length ? Math.max(...temps) : null,
    humidityAvgPct: avg(humidity),
    vpdAvgKpa: avg(vpd),
  };
}

export function exportGrowRunTelemetryJson(spaceId: string, growRunId: string): string {
  const samples = loadGrowRunTelemetry(spaceId, growRunId);
  return JSON.stringify(
    {
      schemaVersion: 1,
      spaceId,
      growRunId,
      exportedAt: new Date().toISOString(),
      sampleCount: samples.length,
      samples,
    },
    null,
    2,
  );
}

export interface RuntimeTelemetrySlice {
  tempC: number | null;
  humidityPct: number | null;
  vpdKpa: number | null;
  soilMoisturePct: number | null;
  lightOn: boolean | null;
}

export function captureRuntimeTelemetrySlice(
  spaceId: string,
  growRunId: string,
  slice: RuntimeTelemetrySlice,
): GrowRunTelemetrySample | null {
  return appendGrowRunTelemetrySample(spaceId, {
    growRunId,
    spaceId,
    timestampMs: Date.now(),
    tempC: slice.tempC,
    humidityPct: slice.humidityPct,
    vpdKpa: slice.vpdKpa,
    soilMoisturePct: slice.soilMoisturePct,
    lightOn: slice.lightOn,
    source: getRuntimeMode() === 'simulator' ? 'simulator' : 'runtime',
  });
}
