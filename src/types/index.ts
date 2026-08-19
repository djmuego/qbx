/** @deprecated Use domain imports directly. Barrel for UI backward compatibility. */
export type { NavigationTab, ThemeMode, TempUnit, Space } from '../domain/space/space.types';
export type { SensorType, SensorStatus, SensorHistoryPoint } from '../domain/sensor/sensor.types';
export type { EquipmentType } from '../domain/equipment/equipment.types';
export type { GrowPhaseId, GrowPhaseInfo } from '../domain/grow/grow-phase.types';
export type { AutomationTriggerType } from '../domain/automation/automation.types';

export type { Sensor as PortInput } from '../domain/sensor/sensor.types';
export type { Output as PortOutput } from '../domain/equipment/equipment.types';
export type { Device as QBXDevice } from '../domain/device/device.types';
export type { DeviceModel as QBXModelDef } from '../domain/device/device.types';
export type { Automation } from '../domain/automation/automation.types';

export { GROW_PHASES } from '../domain/grow/grow-phase.types';
