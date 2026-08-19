import { describe, expect, it } from 'vitest';
import { resolveOutputTwinMode } from './output-twin-mode';

describe('resolveOutputTwinMode', () => {
  it('returns auto when isAuto', () => {
    expect(resolveOutputTwinMode({ isAuto: true, state: true })).toBe('auto');
    expect(resolveOutputTwinMode({ isAuto: true, state: false })).toBe('auto');
  });

  it('returns on/off in manual mode', () => {
    expect(resolveOutputTwinMode({ isAuto: false, state: true })).toBe('on');
    expect(resolveOutputTwinMode({ isAuto: false, state: false })).toBe('off');
  });
});
