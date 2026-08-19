import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  completeGrowRun,
  getActiveGrowRun,
  loadGrowRuns,
  startGrowRun,
  updateGrowRunStage,
} from './grow-run.store';
import { loadGrowJournal } from '../ai/grow-journal.store';

function mockBrowserStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  });
  vi.stubGlobal('window', { dispatchEvent: vi.fn() });
}

describe('grow-run.store', () => {
  const spaceId = 'space-test';

  beforeEach(() => {
    vi.unstubAllGlobals();
    mockBrowserStorage();
  });

  it('starts and completes a grow run', () => {
    const run = startGrowRun(spaceId, {
      cropId: 'tomato',
      commonName: 'Tomatoes',
      stage: 'vegetative',
    });

    expect(run.status).toBe('active');
    expect(getActiveGrowRun(spaceId)?.id).toBe(run.id);

    const completed = completeGrowRun(spaceId, run.id);
    expect(completed?.status).toBe('completed');
    expect(getActiveGrowRun(spaceId)).toBeNull();

    const journal = loadGrowJournal(spaceId);
    expect(journal.some((e) => e.title.includes('Tomatoes'))).toBe(true);
  });

  it('updates stage on active run', () => {
    const run = startGrowRun(spaceId, {
      cropId: 'basil',
      commonName: 'Basil',
      stage: 'seedling',
    });

    const updated = updateGrowRunStage(spaceId, run.id, 'flowering');
    expect(updated?.stage).toBe('flowering');
    expect(loadGrowRuns(spaceId)[0]?.stage).toBe('flowering');
  });
});
