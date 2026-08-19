export type SensorType =
  | 'temperature'
  | 'humidity'
  | 'soil_moisture'
  | 'co2'
  | 'light'
  | 'water_level'
  | 'ph'
  | 'ec'
  | 'pressure'
  | 'other'
  | 'unused'
  | 'generic';

export type SensorStatus = 'normal' | 'low' | 'high' | 'attention';

export interface SensorHistoryPoint {
  time: string;
  value: number;
}

export interface Sensor {
  id: string;
  deviceId?: string;
  portNumber: number;
  hardwareLabel: string;
  type: SensorType;
  name: string;
  customName: string;
  value: number;
  currentValue: number;
  unit: string;
  optimalMin: number;
  optimalMax: number;
  status: SensorStatus;
  visibleOnHome: boolean;
  showOnHome: boolean;
  history: SensorHistoryPoint[];
}

export type ConfigureSensorInput = Partial<
  Pick<Sensor, 'type' | 'customName' | 'optimalMin' | 'optimalMax' | 'visibleOnHome' | 'showOnHome'>
>;
