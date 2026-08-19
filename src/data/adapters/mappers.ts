import type { Automation } from '../../domain/automation/automation.types';
import type { Device } from '../../domain/device/device.types';
import type { Output } from '../../domain/equipment/equipment.types';
import type { Sensor } from '../../domain/sensor/sensor.types';
import type { Space } from '../../domain/space/space.types';
import { withSpaceDimensions } from '../../domain/space/space.types';
import type { AppSettings } from '../../domain/settings/settings.types';
import type { LegacyAutomation, LegacyDevice, LegacySettings } from '../schemas/qbx.schemas';

export function mapLegacySensor(raw: LegacyDevice['inputs'][number], deviceId?: string): Sensor {
  return {
    ...raw,
    deviceId,
    name: raw.customName,
    value: raw.currentValue,
    visibleOnHome: raw.showOnHome,
  };
}

export function mapLegacyOutput(raw: LegacyDevice['outputs'][number], deviceId?: string): Output {
  return {
    ...raw,
    deviceId,
    name: raw.customName,
    controlMode: raw.isAuto ? 'auto' : 'manual',
  };
}

export function mapLegacyDevice(raw: LegacyDevice): Device {
  const capabilities = {
    sensorInputCount: raw.inputs.length,
    outputCount: raw.outputs.length,
    supportedSensorTypes: [...new Set(raw.inputs.map((i) => i.type))],
    supportedOutputTypes: [...new Set(raw.outputs.map((o) => o.type))],
    specialCapabilities: raw.outputs.some((o) => o.isHighPower) ? (['high_power_output'] as const) : [],
  };

  const sensors = raw.inputs.map((input) => mapLegacySensor(input, raw.id));

  return {
    id: raw.id,
    spaceId: raw.spaceId,
    modelId: raw.modelId,
    model: raw.modelId,
    modelName: raw.modelName,
    name: raw.customName,
    customName: raw.customName,
    status: raw.isOnline ? 'online' : 'offline',
    isOnline: raw.isOnline,
    capabilities: {
      sensorInputCount: capabilities.sensorInputCount,
      outputCount: capabilities.outputCount,
      supportedSensorTypes: capabilities.supportedSensorTypes,
      supportedOutputTypes: capabilities.supportedOutputTypes,
      specialCapabilities: [...capabilities.specialCapabilities],
    },
    sensors,
    inputs: sensors,
    outputs: raw.outputs.map((output) => mapLegacyOutput(output, raw.id)),
    firmwareVersion: raw.firmwareVersion,
    serialNumber: raw.serialNumber,
    addedAt: raw.addedAt,
  };
}

export function mapLegacyAutomation(raw: LegacyAutomation): Automation {
  return {
    ...raw,
    enabled: raw.isEnabled,
    trigger: buildTrigger(raw),
    action: {
      targetDeviceId: raw.targetDeviceId,
      targetOutputId: raw.targetOutputId,
      equipmentName: raw.equipmentName,
      actionType: raw.actionType,
    },
    runtimeStatus: raw.isEnabled ? 'waiting' : 'disabled',
  };
}

function buildTrigger(raw: LegacyAutomation): Automation['trigger'] {
  if (raw.type === 'sensor') {
    return {
      type: 'sensor',
      sensorInputId: raw.sensorInputId ?? '',
      sensorDeviceId: raw.sensorDeviceId ?? '',
      sensorName: raw.sensorName ?? '',
      sensorType: raw.sensorType ?? 'other',
      condition: raw.condition ?? 'below',
      threshold: raw.threshold ?? 0,
      thresholdUnit: raw.thresholdUnit ?? '',
      stopThreshold: raw.stopThreshold,
    };
  }

  if (raw.type === 'schedule') {
    return {
      type: 'schedule',
      scheduleDays: raw.scheduleDays ?? [],
      onTime: raw.onTime ?? '07:00',
      offTime: raw.offTime ?? '21:00',
    };
  }

  return {
    type: 'timer',
    intervalMinutes: raw.intervalMinutes ?? 60,
    durationSeconds: raw.durationSeconds ?? 30,
  };
}

export function deviceToLegacy(device: Device): LegacyDevice {
  return {
    id: device.id,
    spaceId: device.spaceId,
    modelId: device.modelId,
    modelName: device.modelName,
    customName: device.customName,
    isOnline: device.isOnline,
    firmwareVersion: device.firmwareVersion,
    serialNumber: device.serialNumber,
    addedAt: device.addedAt,
    inputs: device.inputs.map(sensorToLegacy),
    outputs: device.outputs.map(outputToLegacy),
  };
}

export function sensorToLegacy(sensor: Sensor): LegacyDevice['inputs'][number] {
  return {
    id: sensor.id,
    portNumber: sensor.portNumber,
    hardwareLabel: sensor.hardwareLabel,
    type: sensor.type,
    customName: sensor.customName,
    currentValue: sensor.currentValue,
    unit: sensor.unit,
    optimalMin: sensor.optimalMin,
    optimalMax: sensor.optimalMax,
    status: sensor.status,
    showOnHome: sensor.showOnHome,
    history: sensor.history,
  };
}

export function outputToLegacy(output: Output): LegacyDevice['outputs'][number] {
  return {
    id: output.id,
    portNumber: output.portNumber,
    hardwareLabel: output.hardwareLabel,
    isHighPower: output.isHighPower,
    type: output.type,
    customName: output.customName,
    state: output.state,
    isAuto: output.isAuto,
    activeAutomationId: output.activeAutomationId,
    activeAutomationName: output.activeAutomationName,
  };
}

export function automationToLegacy(automation: Automation): LegacyAutomation {
  const base = {
    id: automation.id,
    spaceId: automation.spaceId,
    name: automation.name,
    isEnabled: automation.isEnabled,
    type: automation.type,
    targetDeviceId: automation.targetDeviceId,
    targetOutputId: automation.targetOutputId,
    equipmentName: automation.equipmentName,
    actionType: automation.actionType,
  };

  if (automation.type === 'sensor') {
    return {
      ...base,
      sensorInputId: automation.sensorInputId,
      sensorDeviceId: automation.sensorDeviceId,
      sensorName: automation.sensorName,
      sensorType: automation.sensorType,
      condition: automation.condition,
      threshold: automation.threshold,
      thresholdUnit: automation.thresholdUnit,
      stopThreshold: automation.stopThreshold,
    };
  }

  if (automation.type === 'schedule') {
    return {
      ...base,
      scheduleDays: automation.scheduleDays,
      onTime: automation.onTime,
      offTime: automation.offTime,
    };
  }

  return {
    ...base,
    intervalMinutes: automation.intervalMinutes,
    durationSeconds: automation.durationSeconds,
  };
}

export function mapLegacySettings(raw: LegacySettings): AppSettings {
  return { ...raw };
}

export function mapLegacySpace(raw: Space): Space {
  return withSpaceDimensions(raw);
}

export function spacesToLegacy(spaces: Space[]): Space[] {
  return spaces;
}
