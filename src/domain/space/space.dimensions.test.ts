import { describe, expect, it } from 'vitest';
import { inferSpaceDimensions, withSpaceDimensions } from './space.types';

describe('space dimensions belong to the space', () => {
  it('keeps explicit dimensions', () => {
    const space = withSpaceDimensions({
      id: 's',
      name: 'Custom',
      dimensions: { lengthM: 3, widthM: 2, heightM: 2.2 },
    });
    expect(space.dimensions).toEqual({ lengthM: 3, widthM: 2, heightM: 2.2 });
    expect(space.areaM2).toBe(6);
  });

  it('infers greenhouse defaults for Моя теплица', () => {
    const d = inferSpaceDimensions({ id: 'space-1', name: 'Моя теплица', isDefault: true });
    expect(d).toEqual({ lengthM: 4, widthM: 6, heightM: 2.8 });
  });

  it('infers 80×80 tent', () => {
    expect(inferSpaceDimensions({ id: 'space-2', name: 'Гроубокс 80x80' })).toEqual({
      lengthM: 0.8,
      widthM: 0.8,
      heightM: 1.8,
    });
  });
});
