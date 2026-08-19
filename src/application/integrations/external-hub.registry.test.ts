import { describe, expect, it } from 'vitest';
import { EXTERNAL_HUB_CONNECTORS, connectorByKind } from './external-hub.registry';

describe('external-hub.registry', () => {
  it('lists all connector kinds', () => {
    expect(EXTERNAL_HUB_CONNECTORS.length).toBeGreaterThanOrEqual(4);
    expect(connectorByKind('mqtt')?.status).toBe('live');
    expect(connectorByKind('home-assistant')?.status).toBe('discovery');
    expect(connectorByKind('tuya')?.status).toBe('health-check');
  });
});
