import { describe, expect, it } from 'vitest';
import {
  formatGridLabel,
  gridAxisValues,
  shouldLabelGridValue,
  visualGridSteps,
} from './visual-grid';

describe('2D visual grid', () => {
  it('uses 10 cm minor lines on a grow tent', () => {
    expect(visualGridSteps({ lengthM: 2.4, widthM: 1.2 })).toEqual({
      minorM: 0.1,
      majorM: 0.5,
      labelM: 1,
    });
  });

  it('covers a 1.2 m edge with 10 cm ticks including the far wall', () => {
    const ticks = gridAxisValues(1.2, 0.1);
    expect(ticks[0]).toBe(0);
    expect(ticks).toContain(0.5);
    expect(ticks[ticks.length - 1]).toBe(1.2);
    expect(ticks).toHaveLength(13);
  });

  it('labels major marks and both walls on a tent', () => {
    expect(shouldLabelGridValue(0, 1.2, 1)).toBe(true);
    expect(shouldLabelGridValue(0.5, 1.2, 1)).toBe(false);
    expect(shouldLabelGridValue(0.1, 1.2, 1)).toBe(false);
    expect(shouldLabelGridValue(1.2, 1.2, 1)).toBe(true);
    expect(formatGridLabel(0.5)).toBe('0.5 м');
    expect(formatGridLabel(1)).toBe('1 м');
  });
});
