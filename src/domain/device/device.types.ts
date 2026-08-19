import type { SensorType } from '../sensor/sensor.types';
import type { EquipmentType } from '../equipment/equipment.types';
import type { DeviceProductMeta } from '../catalog/product-catalog.types';

export type DeviceStatus = 'online' | 'offline';

export type SpecialCapability = 'high_power_output';

export interface DeviceCapabilities {
  sensorInputCount: number;
  outputCount: number;
  supportedSensorTypes: SensorType[];
  supportedOutputTypes: EquipmentType[];
  specialCapabilities: SpecialCapability[];
}

export interface DeviceModelDefaultInput {
  type: SensorType;
  name: string;
  unit: string;
  optimalMin: number;
  optimalMax: number;
}

export interface DeviceModelDefaultOutput {
  type: EquipmentType;
  name: string;
  isHighPower?: boolean;
}

export interface DeviceModel {
  id: string;
  name: string;
  category: string;
  description: string;
  capabilities: DeviceCapabilities;
  inputCount: number;
  outputCount: number;
  hasHighPowerOutput?: boolean;
  defaultInputs?: DeviceModelDefaultInput[];
  defaultOutputs?: DeviceModelDefaultOutput[];
  /** Commercial metadata for store / onboarding */
  product?: DeviceProductMeta;
}

export interface Device {
  id: string;
  spaceId: string;
  modelId: string;
  model: string;
  modelName: string;
  name: string;
  customName: string;
  status: DeviceStatus;
  isOnline: boolean;
  capabilities: DeviceCapabilities;
  sensors: import('../sensor/sensor.types').Sensor[];
  outputs: import('../equipment/equipment.types').Output[];
  inputs: import('../sensor/sensor.types').Sensor[];
  firmwareVersion: string;
  serialNumber: string;
  addedAt: string;
}

export type CreateDeviceInput = {
  modelId: string;
  name: string;
  customName: string;
  spaceId: string;
};

export type UpdateDeviceInput = Partial<Pick<Device, 'customName' | 'name' | 'spaceId'>>;
