import { describe, expect, it } from 'vitest';
import { categoryForPlacement, shouldShowCanvasLabel, symbolForPlacement } from './map-visual-language';
import type { MapPlacement } from './space-map.types';

const light: MapPlacement = {
  id: 'l1',
  kind: 'light',
  xM: 1,
  yM: 1,
  widthM: 0.4,
  heightM: 0.4,
  rotationDeg: 0,
  label: 'Свет 1',
};

describe('map-visual-language', () => {
  it('uses icon symbol for lights', () => {
    expect(symbolForPlacement(light)).toBe('💡');
    expect(categoryForPlacement(light)).toBe('light');
  });

  it('hides labels on canvas by default', () => {
    expect(shouldShowCanvasLabel(light, {})).toBe(false);
    expect(shouldShowCanvasLabel(light, { hovered: true })).toBe(true);
    expect(shouldShowCanvasLabel(light, { selected: true })).toBe(true);
  });
});
