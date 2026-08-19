import { describe, expect, it } from 'vitest';
import { runInitialQbxScan } from './qbx-discovery.service';

describe('qbx-discovery.service', () => {
  it('hardware scan returns no fake devices', async () => {
    const result = await runInitialQbxScan(50);
    if (!result.simulator) {
      expect(result.devices).toHaveLength(0);
    }
  });
});
