import type { Clock } from '../clock';
import type { RandomSource } from '../random';
import { getRuntimeMode } from '../../config/runtime-mode';
import type { DeviceGateway } from './device-gateway.contract';
import { HardwareGateway } from './hardware.gateway';
import { LocalSimulatorGateway } from './local-simulator.gateway';

export interface GatewayFactoryDeps {
  clock: Clock;
  random: RandomSource;
}

export function createGateway(deps: GatewayFactoryDeps, mode = getRuntimeMode()): DeviceGateway {
  if (mode === 'simulator') {
    return new LocalSimulatorGateway(deps.clock, deps.random);
  }
  return new HardwareGateway(deps.clock);
}
