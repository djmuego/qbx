import { describe, expect, it } from 'vitest';
import { applyLibraryDefaults, defaultPoseForKind } from './placement-defaults';
import type { ObjectLibraryItem } from './spatial-object-library';

describe('placement-defaults', () => {
  it('places lights on ceiling', () => {
    expect(defaultPoseForKind('light').mounting).toBe('ceiling');
  });

  it('places climate sensors at canopy height', () => {
    const pose = defaultPoseForKind('sensor');
    expect(pose.mounting).toBe('plantCanopy');
    expect(pose.zM).toBeGreaterThan(1);
  });

  it('places exhaust fans high on wall', () => {
    const pose = defaultPoseForKind('equipment', 'exhaust');
    expect(pose.mounting).toBe('wall');
    expect(pose.zM).toBeGreaterThan(2);
  });

  it('applies library item dimensions', () => {
    const item: ObjectLibraryItem = {
      id: 'light-bar',
      category: 'light',
      label: 'Свет',
      kind: 'light',
      mounting: 'ceiling',
      widthM: 0.6,
      heightM: 0.25,
      sizeZM: 0.08,
    };
    const defaults = applyLibraryDefaults(item);
    expect(defaults.kind).toBe('light');
    expect(defaults.widthM).toBe(0.6);
    expect(defaults.mounting).toBe('ceiling');
  });
});
