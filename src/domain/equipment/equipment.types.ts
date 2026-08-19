export type EquipmentType =
  | 'lighting'
  | 'watering'
  | 'ventilation'
  | 'heating'
  | 'humidifier'
  | 'valve'
  | 'co2'
  | 'socket'
  | 'other'
  | 'unused';

export type ControlMode = 'auto' | 'manual';

export interface Output {
  id: string;
  deviceId?: string;
  portNumber: number;
  hardwareLabel: string;
  isHighPower?: boolean;
  type: EquipmentType;
  name: string;
  customName: string;
  state: boolean;
  controlMode: ControlMode;
  isAuto: boolean;
  activeAutomationId?: string;
  activeAutomationName?: string;
  maxContinuousOnSeconds?: number;
  safeState?: 'off';
}

export type ConfigureOutputInput = Partial<
  Pick<Output, 'type' | 'customName' | 'state' | 'controlMode' | 'isAuto'>
>;
