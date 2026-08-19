import { appendGrowJournalEntry } from '../ai/grow-journal.store';
import type { GrowRun, StartGrowRunInput } from '../../domain/grow/grow-run-telemetry.types';
import type { GrowStageId } from '../../domain/grow/grow-stage.types';
import { summarizeGrowRunTelemetry } from './grow-run-telemetry.store';

const STORAGE_KEY = 'qbx_grow_runs_v1';

function notifyGrowRunUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('qbx-grow-run-updated'));
  }
}

function key(spaceId: string): string {
  return `${STORAGE_KEY}_${spaceId}`;
}

export function loadGrowRuns(spaceId: string): GrowRun[] {
  if (!spaceId || typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key(spaceId));
    return raw ? (JSON.parse(raw) as GrowRun[]) : [];
  } catch {
    return [];
  }
}

function saveGrowRuns(spaceId: string, runs: GrowRun[]): void {
  if (!spaceId || typeof window === 'undefined') return;
  localStorage.setItem(key(spaceId), JSON.stringify(runs));
  notifyGrowRunUpdated();
  void import('./grow-run-cloud.persistence').then((m) => m.cloudSaveGrowRuns(spaceId, runs));
}

export function replaceGrowRuns(spaceId: string, runs: GrowRun[]): void {
  if (!spaceId || typeof window === 'undefined') return;
  localStorage.setItem(key(spaceId), JSON.stringify(runs));
  notifyGrowRunUpdated();
}

export function getActiveGrowRun(spaceId: string): GrowRun | null {
  return loadGrowRuns(spaceId).find((r) => r.status === 'active') ?? null;
}

export function startGrowRun(spaceId: string, input: StartGrowRunInput): GrowRun {
  const runs = loadGrowRuns(spaceId).filter((r) => r.status !== 'active');
  const run: GrowRun = {
    id: `grow-run-${Date.now()}`,
    spaceId,
    cropId: input.cropId,
    commonName: input.commonName,
    cultivar: input.cultivar,
    stage: input.stage,
    startedAt: new Date().toISOString(),
    status: 'active',
    notes: input.notes,
  };
  saveGrowRuns(spaceId, [run, ...runs]);
  return run;
}

export function updateGrowRunStage(spaceId: string, runId: string, stage: GrowStageId): GrowRun | null {
  const runs = loadGrowRuns(spaceId);
  const idx = runs.findIndex((r) => r.id === runId);
  if (idx < 0) return null;
  runs[idx] = { ...runs[idx], stage };
  saveGrowRuns(spaceId, runs);
  return runs[idx];
}

export function completeGrowRun(spaceId: string, runId: string, notes?: string): GrowRun | null {
  const runs = loadGrowRuns(spaceId);
  const idx = runs.findIndex((r) => r.id === runId);
  if (idx < 0) return null;
  const completed = {
    ...runs[idx],
    status: 'completed' as const,
    endedAt: new Date().toISOString(),
    notes: notes ?? runs[idx].notes,
  };
  runs[idx] = completed;
  saveGrowRuns(spaceId, runs);

  const telemetry = summarizeGrowRunTelemetry(spaceId, runId);
  appendGrowJournalEntry(spaceId, {
    kind: 'note',
    title: `GrowRun завершён: ${completed.commonName}`,
    body: `Фаза: ${completed.stage}. Сэмплов телеметрии: ${telemetry.sampleCount}.`,
    growRunId: runId,
  });

  return completed;
}
