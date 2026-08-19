import { describe, expect, it } from 'vitest';
import { analyzeVpd, classifyVpd, calculateVpdKpa } from '../../domain/agronomy/vpd';

describe('VPD engine', () => {
  it('calculates VPD from temp and RH', () => {
    const vpd = calculateVpdKpa(24, 60);
    expect(vpd).toBeGreaterThan(0.8);
    expect(vpd).toBeLessThan(1.5);
  });

  it('classifies relative to crop target', () => {
    expect(classifyVpd(0.5, { min: 0.8, max: 1.0 })).toBe('low');
    expect(classifyVpd(0.9, { min: 0.8, max: 1.0 })).toBe('optimal');
    expect(classifyVpd(1.5, { min: 0.8, max: 1.0 })).toBe('high');
  });

  it('returns unavailable without inputs', () => {
    const result = analyzeVpd({ airTempC: null, relativeHumidityPercent: 55 });
    expect(result.available).toBe(false);
    expect(result.classification).toBe('unknown');
  });

  it('includes target band in detail', () => {
    const result = analyzeVpd({ airTempC: 25, relativeHumidityPercent: 55 }, { min: 0.8, max: 1.1 });
    expect(result.available).toBe(true);
    expect(result.detail).toMatch(/0\.8.*1\.1/);
  });
});
