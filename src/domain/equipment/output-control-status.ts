import type { Output } from './equipment.types';
import type { RuntimeEvent } from '../../runtime/types/events.types';
import type { OutputRuntimeState } from '../../runtime/types/runtime-state.types';

export type OutputControlStatus = 'rule' | 'manual' | 'safety_timeout' | 'pending' | 'failed';

const DEFAULT_SAFETY_WINDOW_MS = 5 * 60 * 1000;

export function resolveOutputControlStatus(params: {
  outputId: string;
  output: Pick<Output, 'isAuto' | 'state'>;
  runtime?: OutputRuntimeState;
  events?: RuntimeEvent[];
  nowMs?: number;
  safetyWindowMs?: number;
}): OutputControlStatus {
  const { outputId, output, runtime, events, nowMs = Date.now(), safetyWindowMs = DEFAULT_SAFETY_WINDOW_MS } = params;

  if (runtime?.commandStatus === 'pending') return 'pending';
  if (runtime?.commandStatus === 'failed' || runtime?.commandStatus === 'timeout') return 'failed';

  const cutoff = nowMs - safetyWindowMs;
  const safetyHit = events?.some(
    (event) => event.type === 'OUTPUT_SAFETY_TIMEOUT' && event.outputId === outputId && event.timestampMs >= cutoff,
  );
  if (safetyHit) return 'safety_timeout';

  if (!output.isAuto) return 'manual';
  return 'rule';
}
