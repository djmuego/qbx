import type { SensorType } from '../sensor/sensor.types';

export type AutomationTriggerType = 'sensor' | 'schedule' | 'timer';

export type AutomationActionType = 'turn_on' | 'turn_off';

export type AutomationRuntimeStatus = 'disabled' | 'waiting' | 'running' | 'error';

export interface AutomationAction {
  targetDeviceId: string;
  targetOutputId: string;
  equipmentName: string;
  actionType: AutomationActionType;
}

export interface SensorTrigger {
  type: 'sensor';
  sensorInputId: string;
  sensorDeviceId: string;
  sensorName: string;
  sensorType: SensorType;
  condition: 'above' | 'below';
  threshold: number;
  thresholdUnit: string;
  stopThreshold?: number;
}

export interface ScheduleTrigger {
  type: 'schedule';
  scheduleDays: number[];
  onTime: string;
  offTime: string;
}

export interface TimerTrigger {
  type: 'timer';
  intervalMinutes: number;
  durationSeconds: number;
}

export type AutomationTrigger = SensorTrigger | ScheduleTrigger | TimerTrigger;

export interface Automation {
  id: string;
  spaceId: string;
  name: string;
  enabled: boolean;
  isEnabled: boolean;
  trigger?: AutomationTrigger;
  action?: AutomationAction;
  runtimeStatus?: AutomationRuntimeStatus;
  type: AutomationTriggerType;
  sensorInputId?: string;
  sensorDeviceId?: string;
  sensorName?: string;
  sensorType?: SensorType;
  condition?: 'above' | 'below';
  threshold?: number;
  thresholdUnit?: string;
  stopThreshold?: number;
  scheduleDays?: number[];
  onTime?: string;
  offTime?: string;
  intervalMinutes?: number;
  durationSeconds?: number;
  targetDeviceId: string;
  targetOutputId: string;
  equipmentName: string;
  actionType: AutomationActionType;
  priority?: number;
}

export type CreateAutomationInput = Omit<Automation, 'id' | 'enabled' | 'isEnabled' | 'runtimeStatus' | 'trigger' | 'action'> & {
  enabled?: boolean;
  isEnabled?: boolean;
  trigger?: AutomationTrigger;
  action?: AutomationAction;
};

export type UpdateAutomationInput = Partial<Omit<Automation, 'id'>>;
