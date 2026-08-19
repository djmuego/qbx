import { loadGrowRuns, replaceGrowRuns } from './grow-run.store';
import { loadGrowRunTelemetry, replaceGrowRunTelemetry } from './grow-run-telemetry.store';
import { mergeGrowRunTelemetry, mergeGrowRuns } from './grow-run-merge';
import { cloudLoadGrowRunTelemetry, cloudLoadGrowRuns, cloudSaveGrowRuns } from './grow-run-cloud.persistence';

export async function hydrateGrowRunsFromCloud(spaceId: string): Promise<void> {
  if (!spaceId) return;
  const cloudRuns = await cloudLoadGrowRuns(spaceId);
  const localRuns = loadGrowRuns(spaceId);
  if (cloudRuns.length === 0 && localRuns.length === 0) return;

  const merged = mergeGrowRuns(localRuns, cloudRuns);
  replaceGrowRuns(spaceId, merged);
  if (cloudRuns.length === 0 && localRuns.length > 0) {
    void cloudSaveGrowRuns(spaceId, merged);
  }

  for (const run of merged.slice(0, 8)) {
    const cloudSamples = await cloudLoadGrowRunTelemetry(spaceId, run.id);
    const localSamples = loadGrowRunTelemetry(spaceId, run.id);
    if (cloudSamples.length === 0 && localSamples.length === 0) continue;
    replaceGrowRunTelemetry(spaceId, run.id, mergeGrowRunTelemetry(localSamples, cloudSamples));
  }
}
