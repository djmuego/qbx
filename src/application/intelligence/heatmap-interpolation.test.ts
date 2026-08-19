import { describe, expect, it } from 'vitest';
import {
  heatmapCellColor,
  heatmapValueRange,
  interpolateHeatmapGrid,
} from './heatmap-interpolation';

describe('heatmap-interpolation', () => {
  it('returns exact value at sensor coordinate', () => {
    const cells = interpolateHeatmapGrid({
      points: [{ xM: 0.5, yM: 0.5, value: 24, sensorId: 'a', label: 'A' }],
      lengthM: 4,
      widthM: 4,
      stepM: 1,
    });
    const at = cells.find((c) => c.measured && Math.abs(c.value - 24) < 0.01);
    expect(at).toBeDefined();
    expect(at?.value).toBe(24);
  });

  it('interpolates between two sensors', () => {
    const cells = interpolateHeatmapGrid({
      points: [
        { xM: 0.5, yM: 1, value: 20, sensorId: 'a', label: 'A' },
        { xM: 3.5, yM: 1, value: 30, sensorId: 'b', label: 'B' },
      ],
      lengthM: 4,
      widthM: 2,
      stepM: 1,
    });
    const mid = cells.find((c) => c.value > 22 && c.value < 28);
    expect(mid).toBeDefined();
    expect(mid!.value).toBeGreaterThan(20);
    expect(mid!.value).toBeLessThan(30);
  });

  it('expands narrow value range for color scale', () => {
    const range = heatmapValueRange([{ xM: 0, yM: 0, value: 25, sensorId: 'a', label: 'A' }]);
    expect(range.max - range.min).toBeGreaterThanOrEqual(1);
  });

  it('maps temperature colors from cool to warm', () => {
    expect(heatmapCellColor('temperature', 0, 0, 10)).toContain('rgb');
    expect(heatmapCellColor('temperature', 10, 0, 10)).not.toBe(heatmapCellColor('temperature', 0, 0, 10));
  });
});
