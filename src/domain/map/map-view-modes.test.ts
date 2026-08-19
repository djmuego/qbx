import { describe, expect, it } from 'vitest';
import { layersForMapViewMode } from './map-view-modes';

describe('map-view-modes', () => {
  it('plan mode keeps default layers', () => {
    const layers = layersForMapViewMode('plan');
    expect(layers.plants).toBe(true);
    expect(layers.lighting).toBe(true);
  });

  it('light mode emphasizes plants and lighting', () => {
    const layers = layersForMapViewMode('light');
    expect(layers.plants).toBe(true);
    expect(layers.lighting).toBe(true);
    expect(layers.sensors).toBe(false);
  });
});
