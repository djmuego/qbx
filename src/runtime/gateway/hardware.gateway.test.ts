import { describe, expect, it } from 'vitest';
import { HardwareGateway } from './hardware.gateway';
import { FakeClock } from '../clock';
import { QbxRuntime } from '../qbx-runtime';

describe('HardwareGateway', () => {
  it('returns no sensor readings by default', () => {
    const gateway = new HardwareGateway(new FakeClock());
    expect(gateway.getAllSensorReadings()).toEqual([]);
  });

  it('does not fake command success', async () => {
    const clock = new FakeClock();
    const gateway = new HardwareGateway(clock);
    const result = await gateway.setOutputState('dev-1', 'out-1', true);
    expect(result.status).toBe('failed');
    expect(result.error).toContain('transport');
  });
});

describe('QbxRuntime empty hardware boot', () => {
  it('starts with no devices, sensors, outputs, telemetry', () => {
    const runtime = new QbxRuntime({
      clock: new FakeClock(),
      random: { next: () => 0.5 } as never,
      gateway: new HardwareGateway(new FakeClock()),
    });
    runtime.boot([], [], []);
    const view = runtime.getView();
    expect(view.devices).toEqual([]);
    expect(view.snapshot.sensorReadings).toEqual({});
    expect(view.sensorHistory('any')).toEqual([]);
  });
});
