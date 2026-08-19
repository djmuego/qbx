import { describe, expect, it } from 'vitest';
import { translate, createTranslator } from './translate';
import { localizeDeviceModel } from './localize-catalog';
import { DEVICE_MODELS } from '../domain/catalog/device-catalog';

describe('i18n', () => {
  it('defaults to Russian strings', () => {
    expect(translate('ru', 'devices.models.qbx-strip-4.name')).toBe('QBX Strip 4');
    expect(translate('ru', 'devices.models.qbx-strip-4.category')).toBe('Умный удлинитель');
  });

  it('returns English parallel strings', () => {
    expect(translate('en', 'devices.models.qbx-strip-4.category')).toBe('Smart power strip');
    expect(translate('en', 'devices.sensors.temperature')).toBe('Air temperature');
  });

  it('falls back to Russian when English key missing', () => {
    expect(translate('en', 'settings.language', 'fallback')).toBe('Language');
  });

  it('localizes device model ports', () => {
    const strip = DEVICE_MODELS.find((m) => m.id === 'qbx-strip-4')!;
    const en = localizeDeviceModel(strip, createTranslator('en'));
    expect(en.defaultOutputs?.[0]?.name).toBe('Outlet 1');
    expect(en.defaultInputs?.[1]?.name).toBe('Air humidity');
  });
});
