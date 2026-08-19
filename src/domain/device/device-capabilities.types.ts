import type { EquipmentType } from '../equipment/equipment.types';
import type { SensorType } from '../sensor/sensor.types';

export type OutputCapabilityType = 'switch' | 'dimmer' | 'pwm' | 'analog';

export interface OutputCapability {
  id: string;
  channel: string;
  type: OutputCapabilityType;
  equipmentType?: EquipmentType;
  name?: string;
  maxLevel?: number;
}

export interface SensorInputCapability {
  id: string;
  channel: string;
  type: SensorType;
  unit: string;
  name?: string;
}

export interface DeviceCapabilities {
  deviceId: string;
  outputs: OutputCapability[];
  sensorInputs: SensorInputCapability[];
  interfaces: string[];
  features: string[];
}
