import type { GrowRun } from '../../domain/grow/grow-run.types';
import type { GrowRunTelemetrySample } from '../../domain/grow/grow-run-telemetry.types';

function runRank(run: GrowRun): number {
  return Date.parse(run.endedAt ?? run.startedAt);
}

export function mergeGrowRuns(local: GrowRun[], cloud: GrowRun[]): GrowRun[] {
  const byId = new Map<string, GrowRun>();
  for (const run of [...cloud, ...local]) {
    const existing = byId.get(run.id);
    if (!existing || runRank(run) >= runRank(existing)) {
      byId.set(run.id, run);
    }
  }
  return [...byId.values()].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

export function mergeGrowRunTelemetry(
  local: GrowRunTelemetrySample[],
  cloud: GrowRunTelemetrySample[],
): GrowRunTelemetrySample[] {
  const byId = new Map<string, GrowRunTelemetrySample>();
  for (const sample of [...cloud, ...local]) {
    byId.set(sample.id, sample);
  }
  return [...byId.values()].sort((a, b) => a.timestampMs - b.timestampMs);
}
