import { describe, expect, it } from 'vitest';
import { resolveOutputControlStatus } from './output-control-status';
import type { RuntimeEvent } from '../../runtime/types/events.types';

const baseOutput = { isAuto: true, state: false };

describe('resolveOutputControlStatus', () => {
  it('returns rule for auto mode', () => {
    expect(resolveOutputControlStatus({ outputId: 'out-1', output: baseOutput })).toBe('rule');
  });

  it('returns manual for manual mode', () => {
    expect(
      resolveOutputControlStatus({
        outputId: 'out-1',
        output: { isAuto: false, state: true },
      }),
    ).toBe('manual');
  });

  it('returns pending/failed from runtime command status', () => {
    expect(
      resolveOutputControlStatus({
        outputId: 'out-1',
        output: baseOutput,
        runtime: { commandStatus: 'pending' } as never,
      }),
    ).toBe('pending');
    expect(
      resolveOutputControlStatus({
        outputId: 'out-1',
        output: baseOutput,
        runtime: { commandStatus: 'failed' } as never,
      }),
    ).toBe('failed');
  });

  it('returns safety_timeout for recent event', () => {
    const events: RuntimeEvent[] = [
      {
        id: 'e1',
        type: 'OUTPUT_SAFETY_TIMEOUT',
        timestampMs: 1_000_000,
        outputId: 'out-1',
        message: 'timeout',
      },
    ];
    expect(
      resolveOutputControlStatus({
        outputId: 'out-1',
        output: { isAuto: false, state: false },
        events,
        nowMs: 1_000_500,
      }),
    ).toBe('safety_timeout');
  });
});
