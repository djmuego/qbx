import { describe, expect, it } from 'vitest';
import { DEVICE_MODELS } from './device-catalog';
import { consumerProductModelIds, productMetaForModel } from './product-catalog';

describe('product-catalog', () => {
  it('lists strip as first consumer product', () => {
    expect(consumerProductModelIds()[0]).toBe('qbx-strip-4');
  });

  it('strip model has built-in sensors and outlets', () => {
    const strip = DEVICE_MODELS.find((m) => m.id === 'qbx-strip-4');
    expect(strip?.inputCount).toBe(3);
    expect(strip?.outputCount).toBe(4);
    expect(strip?.defaultOutputs?.every((o) => o.type === 'socket')).toBe(true);
  });

  it('attaches product metadata', () => {
    const meta = productMetaForModel('qbx-strip-4');
    expect(meta?.sku).toBe('QBX-STRIP-4');
    expect(meta?.consumerReady).toBe(true);
    expect(meta?.line).toBe('strip');
  });
});
